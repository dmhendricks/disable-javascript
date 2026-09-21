/*!
 * Disable JavaScript — service worker.
 *
 * Toolbar click (and Alt+Shift+J) toggles chrome.contentSettings.javascript
 * for the active tab's origin and reloads. The icon never opens settings.
 * Restricted URLs (chrome://, Web Store, file://, …) get a small popup.
 */

import { addBlocked, listBlocked, removeBlocked, type ContentScope } from './lib/settings';
import { getJavascriptSetting, setJavascriptSetting } from './lib/javascript';
import { isRestrictedUrl, originPatternFromUrl, urlMatchesPattern } from './lib/origin';
import { getTab, queryTabs, reloadTab, setTabIcon, setTabPopup, setTabTitle } from './lib/chrome';

const ACTION_TITLE_ALLOWED = 'JavaScript is On — Click to disable for this site';
const ACTION_TITLE_BLOCKED = 'JavaScript is Off — Click to enable for this site';
const ACTION_TITLE_RESTRICTED = 'Disable JavaScript — Not available on this page';
const UNSUPPORTED_POPUP = 'unsupported.html';

const ACTION_ICON_ALLOWED: Record<string, string> = {
    '16': 'images/16.png',
    '32': 'images/32.png',
    '48': 'images/48.png',
};

const ACTION_ICON_BLOCKED: Record<string, string> = {
    '16': 'images/16-blocked.png',
    '32': 'images/32-blocked.png',
    '48': 'images/48-blocked.png',
};

/** Tabs we just toggled — wait for load complete before painting the new icon. */
const pendingReload = new Set<number>();

function contentScope(incognito: boolean): ContentScope {
    return incognito ? 'incognito_session_only' : 'regular';
}

async function applyActionUi(tabId: number, blocked: boolean): Promise<void> {
    const ok = await setTabIcon(tabId, blocked ? ACTION_ICON_BLOCKED : ACTION_ICON_ALLOWED);
    if (!ok) return;
    await setTabTitle(tabId, blocked ? ACTION_TITLE_BLOCKED : ACTION_TITLE_ALLOWED);
}

async function paintTabsForPattern(
    pattern: string,
    blocked: boolean,
    incognito: boolean,
    exceptTabId?: number,
): Promise<void> {
    const tabs = await queryTabs({});
    for (const tab of tabs) {
        if (tab.id == null || tab.id === exceptTabId || !tab.url || tab.incognito !== incognito) {
            continue;
        }
        if (urlMatchesPattern(tab.url, pattern)) {
            void applyActionUi(tab.id, blocked);
        }
    }
}

async function syncActionPopup(
    tabId: number,
    url: string | undefined,
    incognito = false,
): Promise<void> {
    if (!url) return;

    const restricted = isRestrictedUrl(url) || originPatternFromUrl(url) == null;
    const ok = await setTabPopup(tabId, restricted ? UNSUPPORTED_POPUP : '');
    if (!ok) return;

    if (restricted) {
        await setTabTitle(tabId, ACTION_TITLE_RESTRICTED);
        await setTabIcon(tabId, ACTION_ICON_ALLOWED);
        return;
    }

    const pattern = originPatternFromUrl(url);
    if (!pattern) {
        await applyActionUi(tabId, false);
        return;
    }

    // Trust the blocked list, not contentSettings.get(), during navigation.
    // get() can report "allow" while the tab is reloading, which paints the
    // default green icon even though JS is already blocked.
    const blocked = (await listBlocked(contentScope(incognito))).includes(pattern);
    await applyActionUi(tabId, blocked);
}

async function syncTab(tabId: number): Promise<void> {
    const tab = await getTab(tabId);
    if (!tab) return;
    await syncActionPopup(tabId, tab.url, tab.incognito);
}

async function showUnsupportedForTab(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id == null) return;
    const tabId = tab.id;

    if (!(await setTabPopup(tabId, UNSUPPORTED_POPUP))) return;
    await setTabTitle(tabId, ACTION_TITLE_RESTRICTED);
    await setTabIcon(tabId, ACTION_ICON_ALLOWED);

    try {
        await chrome.action.openPopup(
            tab.windowId != null ? { windowId: tab.windowId } : undefined,
        );
    } catch (err) {
        console.warn('[Disable JavaScript] openPopup failed, opening fallback window', err);
        await chrome.windows
            .create({
                url: chrome.runtime.getURL(UNSUPPORTED_POPUP),
                type: 'popup',
                width: 340,
                height: 280,
                focused: true,
            })
            .catch(() => {});
    }
}

async function toggleJavascript(tab: chrome.tabs.Tab): Promise<void> {
    const tabId = tab.id;
    if (tabId == null) return;

    let url = tab.url;
    let incognito = tab.incognito;
    if (!url) {
        const fresh = await getTab(tabId);
        url = fresh?.url;
        incognito = fresh?.incognito ?? incognito;
    }

    if (!url || isRestrictedUrl(url)) {
        await showUnsupportedForTab(tab);
        return;
    }

    const pattern = originPatternFromUrl(url);
    if (!pattern) {
        await showUnsupportedForTab(tab);
        return;
    }

    const current = await getJavascriptSetting(url, incognito);
    const next = current === 'allow' ? 'block' : 'allow';
    const blocked = next === 'block';
    const scope = contentScope(incognito);

    await setJavascriptSetting(pattern, next, scope);
    if (blocked) {
        await addBlocked(pattern, scope);
    } else {
        await removeBlocked(pattern, scope);
    }

    // Do not paint this tab until reload completes. Updating earlier (or on
    // URL change mid-navigation) is the green/red flicker. Other tabs on the
    // same origin are not reloading, so they can update immediately.
    pendingReload.add(tabId);
    void paintTabsForPattern(pattern, blocked, incognito, tabId);
    await reloadTab(tabId);
}

chrome.action.onClicked.addListener((tab) => {
    void toggleJavascript(tab).catch((err) => {
        console.warn('[Disable JavaScript] toggle failed', err);
    });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-options') {
        void chrome.runtime.openOptionsPage();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (pendingReload.has(tabId)) {
        if (changeInfo.status !== 'complete') return;
        pendingReload.delete(tabId);
        void syncActionPopup(tabId, tab.url, tab.incognito);
        return;
    }

    // Chrome resets the tab action icon to default_icon on navigation.
    // Re-apply when the URL changes or the load finishes.
    if (!changeInfo.url && changeInfo.status !== 'complete') return;
    void syncActionPopup(tabId, tab.url ?? changeInfo.url, tab.incognito);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    if (pendingReload.has(activeInfo.tabId)) return;
    void syncTab(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    pendingReload.delete(tabId);
});

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return;
    const tab = tabs[0];
    if (tab?.id != null) void syncActionPopup(tab.id, tab.url, tab.incognito);
});

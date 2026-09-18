/*!
 * Disable JavaScript — service worker.
 *
 * Toolbar click toggles chrome.contentSettings.javascript for the active tab's
 * origin and reloads. The icon never opens settings; Alt+Shift+O does.
 * Restricted URLs (chrome://, Web Store, file://, …) get a small popup.
 */

import { addBlocked, removeBlocked, type ContentScope } from './lib/settings';
import { getJavascriptSetting, setJavascriptSetting } from './lib/javascript';
import { isRestrictedUrl, originPatternFromUrl } from './lib/origin';
import { getTab, reloadTab, setTabIcon, setTabPopup, setTabTitle } from './lib/chrome';

const ACTION_TITLE_ALLOWED = 'JavaScript is on — click to disable for this site';
const ACTION_TITLE_BLOCKED = 'JavaScript is off — click to enable for this site';
const ACTION_TITLE_RESTRICTED = 'Disable JavaScript — not available on this page';
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

function contentScope(incognito: boolean): ContentScope {
    return incognito ? 'incognito_session_only' : 'regular';
}

async function syncActionPopup(tabId: number, url: string | undefined): Promise<void> {
    if (!url) return;

    const restricted = isRestrictedUrl(url) || originPatternFromUrl(url) == null;
    const ok = await setTabPopup(tabId, restricted ? UNSUPPORTED_POPUP : '');
    if (!ok) return;

    if (restricted) {
        await setTabTitle(tabId, ACTION_TITLE_RESTRICTED);
        await setTabIcon(tabId, ACTION_ICON_ALLOWED);
        return;
    }

    await syncActionUi(tabId, url, false);
}

async function syncActionUi(
    tabId: number,
    url: string,
    incognito: boolean,
): Promise<void> {
    let setting: 'allow' | 'block' = 'allow';
    try {
        setting = await getJavascriptSetting(url, incognito);
    } catch (err) {
        console.warn('[Disable JavaScript] get setting failed', err);
    }

    const blocked = setting === 'block';
    const ok = await setTabIcon(tabId, blocked ? ACTION_ICON_BLOCKED : ACTION_ICON_ALLOWED);
    if (!ok) return;
    await setTabTitle(tabId, blocked ? ACTION_TITLE_BLOCKED : ACTION_TITLE_ALLOWED);
}

async function syncTab(tabId: number): Promise<void> {
    const tab = await getTab(tabId);
    if (!tab) return;
    await syncActionPopup(tabId, tab.url);
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
    const scope = contentScope(incognito);

    await setJavascriptSetting(pattern, next, scope);
    if (next === 'block') {
        await addBlocked(pattern, scope);
    } else {
        await removeBlocked(pattern, scope);
    }

    await reloadTab(tabId);
}

async function syncAllHttpTabs(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.id == null) continue;
        void syncActionPopup(tab.id, tab.url);
    }
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
    if (changeInfo.url || changeInfo.status === 'complete') {
        void syncActionPopup(tabId, tab.url ?? changeInfo.url);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    void syncTab(activeInfo.tabId);
});

chrome.storage.onChanged.addListener(() => {
    void syncAllHttpTabs();
});

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return;
    const tab = tabs[0];
    if (tab?.id != null) void syncActionPopup(tab.id, tab.url);
});

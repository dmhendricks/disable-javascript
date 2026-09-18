/*!
 * Disable JavaScript — options page.
 *
 * Lists origins this extension has blocked (storage mirror). Re-enable writes
 * an allow content setting, drops the mirror entry, and reloads matching tabs.
 */

import { displayLabelFromPattern, patternToSampleUrl } from '../lib/origin';
import {
    clearBlocked,
    listBlocked,
    removeBlocked,
    type ContentScope,
} from '../lib/settings';
import {
    clearJavascriptSettings,
    getJavascriptSetting,
    setJavascriptSetting,
} from '../lib/javascript';
import { reloadTabsMatching } from '../lib/tabs';

const siteList = document.querySelector<HTMLUListElement>('#site-list');
const emptyEl = document.querySelector<HTMLParagraphElement>('#empty');
const searchInput = document.querySelector<HTMLInputElement>('#search');
const searchWrap = document.querySelector<HTMLElement>('#search-wrap');
const clearAllBtn = document.querySelector<HTMLButtonElement>('#clear-all');
const shortcutDisplay = document.querySelector<HTMLElement>('#shortcut-display');
const openShortcutsBtn = document.querySelector<HTMLButtonElement>('#open-shortcuts');

type BlockedRow = {
    pattern: string;
    scope: ContentScope;
};

let rows: BlockedRow[] = [];

function formatShortcut(shortcut: string | undefined): string {
    if (!shortcut) return 'not set';
    return shortcut.replaceAll('MacCtrl', 'Control').replaceAll('Command', '⌘');
}

async function loadShortcutLabel(): Promise<void> {
    if (!shortcutDisplay) return;
    const commands = await chrome.commands.getAll();
    const open = commands.find((command) => command.name === 'open-options');
    shortcutDisplay.textContent = formatShortcut(open?.shortcut) || 'Alt+Shift+J';
}

async function healStale(scope: ContentScope, patterns: string[]): Promise<string[]> {
    const kept: string[] = [];
    for (const pattern of patterns) {
        const sample = patternToSampleUrl(pattern);
        if (!sample) continue;
        try {
            const setting = await getJavascriptSetting(
                sample,
                scope === 'incognito_session_only',
            );
            if (setting === 'block') {
                kept.push(pattern);
            } else {
                await removeBlocked(pattern, scope);
            }
        } catch {
            kept.push(pattern);
        }
    }
    return kept;
}

async function loadRows(): Promise<void> {
    const regular = await healStale('regular', await listBlocked('regular'));
    let incognito: string[];
    try {
        incognito = await healStale(
            'incognito_session_only',
            await listBlocked('incognito_session_only'),
        );
    } catch {
        incognito = [];
    }

    rows = [
        ...regular.map((pattern) => ({ pattern, scope: 'regular' as const })),
        ...incognito.map((pattern) => ({
            pattern,
            scope: 'incognito_session_only' as const,
        })),
    ];
}

function filteredRows(): BlockedRow[] {
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    if (!query) return rows;
    return rows.filter((row) => displayLabelFromPattern(row.pattern).toLowerCase().includes(query));
}

function render(): void {
    if (!siteList || !emptyEl || !searchWrap || !clearAllBtn) return;

    const visible = filteredRows();
    siteList.replaceChildren();

    const hasAny = rows.length > 0;
    emptyEl.hidden = hasAny;
    searchWrap.hidden = !hasAny;
    clearAllBtn.hidden = !hasAny;
    siteList.hidden = !hasAny;

    for (const row of visible) {
        const item = document.createElement('li');
        item.className = 'site';

        const label = document.createElement('div');
        label.className = 'site__label';

        const origin = document.createElement('code');
        origin.textContent = displayLabelFromPattern(row.pattern);
        label.append(origin);

        if (row.scope === 'incognito_session_only') {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = 'Incognito';
            label.append(badge);
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = 'Re-enable';
        button.addEventListener('click', () => {
            void reenable(row);
        });

        item.append(label, button);
        siteList.append(item);
    }

    if (hasAny && visible.length === 0) {
        const none = document.createElement('li');
        none.className = 'site site--empty';
        none.textContent = 'No origins match that filter.';
        siteList.append(none);
    }
}

async function reenable(row: BlockedRow): Promise<void> {
    await setJavascriptSetting(row.pattern, 'allow', row.scope);
    await removeBlocked(row.pattern, row.scope);
    await reloadTabsMatching([row.pattern]);
    await loadRows();
    render();
}

async function clearAll(): Promise<void> {
    if (rows.length === 0) return;
    const ok = window.confirm(
        'Re-enable JavaScript on all sites this extension has blocked?',
    );
    if (!ok) return;

    const patterns = rows.map((row) => row.pattern);
    await clearJavascriptSettings('regular');
    await clearBlocked('regular');
    try {
        await clearJavascriptSettings('incognito_session_only');
        await clearBlocked('incognito_session_only');
    } catch {
        // No incognito session — regular clear is enough.
    }
    await reloadTabsMatching(patterns);
    await loadRows();
    render();
}

openShortcutsBtn?.addEventListener('click', () => {
    void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

searchInput?.addEventListener('input', () => {
    render();
});

clearAllBtn?.addEventListener('click', () => {
    void clearAll();
});

void (async () => {
    await loadShortcutLabel();
    await loadRows();
    render();
})();

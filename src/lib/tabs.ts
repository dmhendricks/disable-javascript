import { urlMatchesPattern } from './origin';
import { queryTabs, reloadTab } from './chrome';

/** Reload every tab whose origin matches one of the patterns (settings re-enable). */
export async function reloadTabsMatching(patterns: string[]): Promise<void> {
    if (patterns.length === 0) return;
    const tabs = await queryTabs({});
    const reloads: Promise<boolean>[] = [];
    for (const tab of tabs) {
        if (tab.id == null) continue;
        const url = tab.url;
        if (!url) continue;
        if (patterns.some((pattern) => urlMatchesPattern(url, pattern))) {
            reloads.push(reloadTab(tab.id));
        }
    }
    await Promise.all(reloads);
}

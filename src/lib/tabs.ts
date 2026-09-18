import { urlMatchesPattern } from './origin';
import { queryTabs, reloadTab } from './chrome';

export async function reloadTabsMatching(patterns: string[]): Promise<void> {
    if (patterns.length === 0) return;
    const tabs = await queryTabs({});
    const reloads: Promise<boolean>[] = [];
    for (const tab of tabs) {
        if (tab.id == null || !tab.url) continue;
        if (patterns.some((pattern) => urlMatchesPattern(tab.url ?? '', pattern))) {
            reloads.push(reloadTab(tab.id));
        }
    }
    await Promise.all(reloads);
}

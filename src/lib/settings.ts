/*!
 * Storage mirror of origins this extension has blocked.
 *
 * chrome.contentSettings cannot enumerate rules, so the settings page reads
 * this list. The content setting remains the source of truth for a given tab.
 */

export type ContentScope = 'regular' | 'incognito_session_only';

const BLOCKED_LOCAL_KEY = 'blockedPatterns';
const BLOCKED_SESSION_KEY = 'blockedPatternsIncognito';

export function parsePatternList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];

    const unique = new Set<string>();
    for (const item of raw) {
        if (typeof item === 'string' && item.length > 0) unique.add(item);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
}

export function withPattern(list: string[], pattern: string): string[] {
    return parsePatternList([...list, pattern]);
}

export function withoutPattern(list: string[], pattern: string): string[] {
    return list.filter((entry) => entry !== pattern);
}

function storageFor(scope: ContentScope): chrome.storage.StorageArea {
    return scope === 'incognito_session_only' ? chrome.storage.session : chrome.storage.local;
}

function keyFor(scope: ContentScope): string {
    return scope === 'incognito_session_only' ? BLOCKED_SESSION_KEY : BLOCKED_LOCAL_KEY;
}

export async function listBlocked(scope: ContentScope): Promise<string[]> {
    const key = keyFor(scope);
    const stored = await storageFor(scope).get(key);
    return parsePatternList(stored[key]);
}

export async function addBlocked(pattern: string, scope: ContentScope): Promise<void> {
    const key = keyFor(scope);
    const area = storageFor(scope);
    const stored = await area.get(key);
    await area.set({ [key]: withPattern(parsePatternList(stored[key]), pattern) });
}

export async function removeBlocked(pattern: string, scope: ContentScope): Promise<void> {
    const key = keyFor(scope);
    const area = storageFor(scope);
    const stored = await area.get(key);
    await area.set({ [key]: withoutPattern(parsePatternList(stored[key]), pattern) });
}

export async function clearBlocked(scope: ContentScope): Promise<void> {
    await storageFor(scope).remove(keyFor(scope));
}

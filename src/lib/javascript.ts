/*!
 * chrome.contentSettings.javascript wrappers.
 *
 * Prefer these over calling the API directly so allow/block stays typed and
 * we never scatter primaryPattern / scope details through the UI.
 */

import type { ContentScope } from './settings';

export type JavascriptSetting = 'allow' | 'block';

export async function getJavascriptSetting(
    url: string,
    incognito: boolean,
): Promise<JavascriptSetting> {
    const result = await chrome.contentSettings.javascript.get({ primaryUrl: url, incognito });
    return result.setting === 'block' ? 'block' : 'allow';
}

export async function setJavascriptSetting(
    pattern: string,
    setting: JavascriptSetting,
    scope: ContentScope,
): Promise<void> {
    await chrome.contentSettings.javascript.set({ primaryPattern: pattern, setting, scope });
}

export async function clearJavascriptSettings(scope: ContentScope): Promise<void> {
    await chrome.contentSettings.javascript.clear({ scope });
}

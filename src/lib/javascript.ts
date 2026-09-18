/*!
 * chrome.contentSettings.javascript wrappers.
 *
 * Callbacks always read lastError so Manage Extensions stays quiet.
 */

import type { ContentScope } from './settings';

export type JavascriptSetting = 'allow' | 'block';

export function getJavascriptSetting(
    url: string,
    incognito: boolean,
): Promise<JavascriptSetting> {
    return new Promise((resolve, reject) => {
        chrome.contentSettings.javascript.get({ primaryUrl: url, incognito }, (result) => {
            const err = chrome.runtime.lastError;
            if (err) {
                reject(new Error(err.message));
                return;
            }
            resolve(result.setting === 'block' ? 'block' : 'allow');
        });
    });
}

export function setJavascriptSetting(
    pattern: string,
    setting: JavascriptSetting,
    scope: ContentScope,
): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.contentSettings.javascript.set({ primaryPattern: pattern, setting, scope }, () => {
            const err = chrome.runtime.lastError;
            if (err) {
                reject(new Error(err.message));
                return;
            }
            resolve();
        });
    });
}

export function clearJavascriptSettings(scope: ContentScope): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.contentSettings.javascript.clear({ scope }, () => {
            const err = chrome.runtime.lastError;
            if (err) {
                reject(new Error(err.message));
                return;
            }
            resolve();
        });
    });
}

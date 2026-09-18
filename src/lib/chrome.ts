/*!
 * Shared lastError-safe chrome.tabs / chrome.action helpers.
 *
 * Edge (and sometimes Chrome) can log "Unchecked runtime.lastError: No tab with id"
 * when a tab closes mid-flight, even if the Promise form is awaited/caught.
 */

export function runTabCallback(run: (done: () => void) => void): Promise<boolean> {
    return new Promise((resolve) => {
        run(() => {
            resolve(chrome.runtime.lastError == null);
        });
    });
}

export function setTabIcon(tabId: number, path: Record<string, string>): Promise<boolean> {
    return runTabCallback((done) => {
        chrome.action.setIcon({ tabId, path }, done);
    });
}

export function setTabTitle(tabId: number, title: string): Promise<boolean> {
    return runTabCallback((done) => {
        chrome.action.setTitle({ tabId, title }, done);
    });
}

export function setTabPopup(tabId: number, popup: string): Promise<boolean> {
    return runTabCallback((done) => {
        chrome.action.setPopup({ tabId, popup }, done);
    });
}

export function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                resolve(undefined);
                return;
            }
            resolve(tab);
        });
    });
}

export function reloadTab(tabId: number): Promise<boolean> {
    return runTabCallback((done) => {
        chrome.tabs.reload(tabId, done);
    });
}

export function queryTabs(query: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
        chrome.tabs.query(query, (tabs) => {
            if (chrome.runtime.lastError) {
                resolve([]);
                return;
            }
            resolve(tabs);
        });
    });
}

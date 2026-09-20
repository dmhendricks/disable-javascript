/*!
 * URL helpers for content-setting patterns.
 *
 * Chrome javascript content settings apply to the top-level origin. Patterns
 * for http(s) must end in /*. Exact host + scheme + non-default port only —
 * never <all_urls> or https://*.example.com/*.
 */

const RESTRICTED_PREFIXES = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'devtools://',
] as const;

/** Host + path, not startsWith — `https://chrome.google.com.evil.example` must not match. */
function isChromeWebStore(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        if (parsed.hostname === 'chromewebstore.google.com') return true;
        return parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore');
    } catch {
        return false;
    }
}

export function isRestrictedUrl(url: string): boolean {
    if (RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix))) return true;
    return isChromeWebStore(url);
}

/** Content-setting hostname: IPv6 must be wrapped in brackets. */
function hostnameForPattern(hostname: string): string {
    if (hostname.includes(':') && !hostname.startsWith('[')) {
        return `[${hostname}]`;
    }
    return hostname;
}

/**
 * `https://example.com/path` → `https://example.com/*`
 * Returns null when the URL is not http(s) or cannot be parsed.
 */
export function originPatternFromUrl(url: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
    }

    const hostname = hostnameForPattern(parsed.hostname);
    const host = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    return `${parsed.protocol}//${host}/*`;
}

export function displayLabelFromPattern(pattern: string): string {
    return pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
}

/** A concrete URL `get()` will accept for this pattern. */
export function patternToSampleUrl(pattern: string): string | null {
    if (!pattern.endsWith('/*')) return null;
    return pattern.slice(0, -1);
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
    return originPatternFromUrl(url) === pattern;
}

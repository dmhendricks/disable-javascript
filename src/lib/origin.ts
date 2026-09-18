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
    'view-source:',
    'file://',
    'https://chrome.google.com',
    'https://chromewebstore.google.com',
] as const;

export function isRestrictedUrl(url: string): boolean {
    return RESTRICTED_PREFIXES.some((prefix) => url.startsWith(prefix));
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

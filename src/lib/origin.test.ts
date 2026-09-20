import { describe, expect, it } from 'vitest';
import {
    displayLabelFromPattern,
    filterLabelFromPattern,
    isRestrictedUrl,
    originPatternFromUrl,
    patternToSampleUrl,
    urlMatchesPattern,
} from './origin';

describe('isRestrictedUrl', () => {
    it('flags browser and store surfaces', () => {
        expect(isRestrictedUrl('chrome://settings')).toBe(true);
        expect(isRestrictedUrl('chrome-extension://abc/options.html')).toBe(true);
        expect(isRestrictedUrl('edge://extensions')).toBe(true);
        expect(isRestrictedUrl('about:blank')).toBe(true);
        expect(isRestrictedUrl('devtools://devtools/bundled/devtools_app.html')).toBe(true);
        expect(isRestrictedUrl('https://chrome.google.com/webstore')).toBe(true);
        expect(isRestrictedUrl('https://chromewebstore.google.com/detail/x')).toBe(true);
    });

    it('does not treat prefix-lookalike hosts as the Web Store', () => {
        expect(isRestrictedUrl('https://chrome.google.com.evil.example/')).toBe(false);
        expect(isRestrictedUrl('https://chrome.google.com/')).toBe(false);
    });

    it('allows normal http(s) pages', () => {
        expect(isRestrictedUrl('https://example.com/')).toBe(false);
        expect(isRestrictedUrl('http://localhost:3000/app')).toBe(false);
        expect(isRestrictedUrl('file:///tmp/index.html')).toBe(false);
        expect(isRestrictedUrl('view-source:https://example.com')).toBe(false);
    });
});

describe('originPatternFromUrl', () => {
    it('maps https paths to an origin wildcard', () => {
        expect(originPatternFromUrl('https://news.ycombinator.com/item?id=1')).toBe(
            'https://news.ycombinator.com/*',
        );
    });

    it('keeps http vs https distinct', () => {
        expect(originPatternFromUrl('http://example.com/')).toBe('http://example.com/*');
        expect(originPatternFromUrl('https://example.com/')).toBe('https://example.com/*');
    });

    it('includes non-default ports, localhost, and IPv4', () => {
        expect(originPatternFromUrl('http://localhost:3000/app')).toBe('http://localhost:3000/*');
        expect(originPatternFromUrl('https://127.0.0.1/')).toBe('https://127.0.0.1/*');
        expect(originPatternFromUrl('https://example.com:8443/')).toBe('https://example.com:8443/*');
    });

    it('omits default ports stripped by the URL parser', () => {
        expect(originPatternFromUrl('https://example.com:443/')).toBe('https://example.com/*');
        expect(originPatternFromUrl('http://example.com:80/')).toBe('http://example.com/*');
    });

    it('wraps IPv6 hostnames in brackets', () => {
        expect(originPatternFromUrl('http://[::1]:8080/test')).toBe('http://[::1]:8080/*');
    });

    it('returns null for non-http(s) and garbage', () => {
        expect(originPatternFromUrl('file:///tmp/a.html')).toBeNull();
        expect(originPatternFromUrl('ftp://example.com/')).toBeNull();
        expect(originPatternFromUrl('not a url')).toBeNull();
    });
});

describe('displayLabelFromPattern / patternToSampleUrl / urlMatchesPattern', () => {
    it('strips the required /* for display', () => {
        expect(displayLabelFromPattern('https://example.com/*')).toBe('https://example.com');
    });

    it('builds a sample URL for contentSettings.get', () => {
        expect(patternToSampleUrl('https://example.com/*')).toBe('https://example.com/');
        expect(patternToSampleUrl('https://example.com')).toBeNull();
    });

    it('matches only the same origin pattern', () => {
        expect(urlMatchesPattern('https://example.com/foo', 'https://example.com/*')).toBe(true);
        expect(urlMatchesPattern('https://news.example.com/foo', 'https://example.com/*')).toBe(
            false,
        );
        expect(urlMatchesPattern('http://example.com/foo', 'https://example.com/*')).toBe(false);
    });
});

describe('filterLabelFromPattern', () => {
    it('drops the scheme so filtering never matches on https://', () => {
        expect(filterLabelFromPattern('https://twitchy.com/*')).toBe('twitchy.com');
        expect(filterLabelFromPattern('http://redstate.com/*')).toBe('redstate.com');
    });

    it('keeps a non-default port', () => {
        expect(filterLabelFromPattern('http://localhost:3000/*')).toBe('localhost:3000');
    });

    it('does not match a host lacking the query character', () => {
        const matches = (pattern: string, query: string) =>
            filterLabelFromPattern(pattern).toLowerCase().includes(query);

        expect(matches('https://twitchy.com/*', 's')).toBe(false);
        expect(matches('https://redstate.com/*', 's')).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';
import { parsePatternList, withPattern, withoutPattern } from './settings';

describe('parsePatternList', () => {
    it('returns a sorted unique list of strings', () => {
        expect(parsePatternList(['https://b.com/*', 'https://a.com/*', 'https://b.com/*'])).toEqual([
            'https://a.com/*',
            'https://b.com/*',
        ]);
    });

    it('drops non-strings and empties', () => {
        expect(parsePatternList([1, '', null, 'https://a.com/*'])).toEqual(['https://a.com/*']);
    });

    it('treats missing storage as empty', () => {
        expect(parsePatternList(undefined)).toEqual([]);
        expect(parsePatternList({})).toEqual([]);
    });
});

describe('withPattern / withoutPattern', () => {
    it('adds without duplicating', () => {
        expect(withPattern(['https://a.com/*'], 'https://a.com/*')).toEqual(['https://a.com/*']);
        expect(withPattern(['https://b.com/*'], 'https://a.com/*')).toEqual([
            'https://a.com/*',
            'https://b.com/*',
        ]);
    });

    it('removes a single pattern', () => {
        expect(withoutPattern(['https://a.com/*', 'https://b.com/*'], 'https://a.com/*')).toEqual([
            'https://b.com/*',
        ]);
    });
});

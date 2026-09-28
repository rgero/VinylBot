import { describe, expect, it } from 'vitest';
import { filterVinylsByTags, parseTagsFlag } from '../../src/utils/tagFilters';

describe('parseTagsFlag', () => {
  it('splits, trims, lowercases and drops empty tags', () => {
    expect(parseTagsFlag(' Emo,PUNK, ,')).toEqual(['emo', 'punk']);
  });

  it('returns empty array for non-string flags', () => {
    expect(parseTagsFlag(undefined)).toEqual([]);
    expect(parseTagsFlag(true)).toEqual([]);
  });
});

describe('filterVinylsByTags', () => {
  const vinyls = [
    { artist: 'A', tags: ['Emo'] },
    { artist: 'B', tags: ['punk', 'rock'] },
    { artist: 'C', tags: ['jazz'] },
    { artist: 'D' },
  ] as any;

  it('returns input unchanged when no tags', () => {
    expect(filterVinylsByTags(vinyls, [])).toBe(vinyls);
  });

  it('keeps vinyls matching any tag, case-insensitively', () => {
    expect(filterVinylsByTags(vinyls, ['emo', 'punk']).map((v) => v.artist)).toEqual(['A', 'B']);
  });

  it('does not match partial tag names', () => {
    expect(filterVinylsByTags(vinyls, ['em'])).toEqual([]);
  });
});

import {
  addVinyl,
  getArtistVinylCountByUserId,
  getArtistVinylCounts,
  getFullVinylsByQuery,
  getUnplayedVinylCounts,
  getUnplayedVinyls,
  getVinylID,
  getVinyls,
  getVinylsByPlayCount,
  getVinylsByQuery,
  getVinylsBySearchQuery,
  getVinylsByTags,
  getVinylsLikedByUserID,
  haveVinyl,
} from '../../src/services/vinyls.api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock, sortItemsMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  sortItemsMock: vi.fn((items) => items),
}));

vi.mock('../../src/services/supabase.js', () => ({
  default: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('../../src/utils/sortItems.js', () => ({
  sortItems: sortItemsMock,
}));



const makeAwaitableBuilder = (result: any) => {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    contains: vi.fn(() => builder),
    overlaps: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
    finally: (onFinally: any) => Promise.resolve(result).finally(onFinally),
  };

  return builder;
};

describe('vinyls.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps database metadata while preserving the location alias and computed count', async () => {
    const builder = makeAwaitableBuilder({ data: [{
      artist: 'A', album: 'B', owners: [], purchase_date: '2026-10-02',
      image_url: null, double_lp: false, purchase_number: 0, purchased_by: [],
      liked_by: [], play_count: 99, purchase_location: 12,
      purchaseLocation: { name: 'Store' }, playlogs: [{ count: 3 }],
    }], error: null });
    fromMock.mockReturnValue(builder);

    expect(await getFullVinylsByQuery('A')).toEqual([{
      artist: 'A', album: 'B', owners: [], purchaseDate: '2026-10-02',
      imageUrl: null, doubleLP: false, purchaseNumber: 0, purchasedBy: [],
      likedBy: [], playCount: 3, purchaseLocation: { name: 'Store' },
    }]);
    expect(builder.select).toHaveBeenCalledWith('*, playlogs(count), purchaseLocation:locations (name)');
  });

  it('inserts snake_case metadata without computed or enriched fields', async () => {
    const builder = makeAwaitableBuilder({ data: { id: 1 }, error: null });
    fromMock.mockReturnValue(builder);

    await addVinyl({
      artist: 'A', album: 'B', owners: [], purchaseDate: '2026-10-02',
      imageUrl: 'img', doubleLP: false, purchaseNumber: 0, purchasedBy: [],
      likedBy: [], price: 0, length: 0, notes: '', tags: [],
      playCount: 99, purchaseLocation: { name: 'Store' },
    } as any);

    expect(builder.insert).toHaveBeenCalledWith({
      artist: 'A', album: 'B', owners: [], purchase_date: '2026-10-02',
      image_url: 'img', double_lp: false, purchase_number: 0, purchased_by: [],
      liked_by: [], price: 0, length: 0, notes: '', tags: [],
    });
  });

  it('maps unplayed RPC rows without overwriting their returned play count', async () => {
    rpcMock.mockResolvedValue({ data: [{
      artist: 'A', album: 'B', image_url: 'img', double_lp: false, play_count: 2,
    }], error: null });

    expect(await getUnplayedVinyls('u1')).toEqual([{
      artist: 'A', album: 'B', imageUrl: 'img', doubleLP: false, playCount: 2,
    }]);
    expect(rpcMock).toHaveBeenCalledWith('get_unplayed_vinyls', { target_user_id: 'u1' });
  });

  it('getVinylsBySearchQuery applies owners, search, and tags filters', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsBySearchQuery({
      owners: ['u1'],
      search: 'rise against',
      tags: ['punk'],
    } as any);

    expect(builder.contains).toHaveBeenCalledWith('owners', ['u1']);
    expect(builder.or).toHaveBeenCalledWith('artist.wfts.rise against,album.wfts.rise against');
    expect(builder.overlaps).toHaveBeenCalledWith('tags', ['punk']);
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getVinylID returns id from maybeSingle', async () => {
    const builder = makeAwaitableBuilder({ data: { id: 42 }, error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylID('A', 'B');

    expect(result).toBe(42);
  });

  it('getVinylID returns null when no row', async () => {
    const builder = makeAwaitableBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylID('A', 'B');

    expect(result).toBeNull();
  });

  it('haveVinyl returns true when record exists', async () => {
    const builder = makeAwaitableBuilder({ data: { id: 1 }, error: null });
    fromMock.mockReturnValue(builder);

    const result = await haveVinyl({ artist: 'A', album: 'B' });

    expect(result).toBe(true);
  });

  it('haveVinyl returns false when no record exists', async () => {
    const builder = makeAwaitableBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    const result = await haveVinyl({ artist: 'A', album: 'B' });

    expect(result).toBe(false);
  });

  it('addVinyl returns DUPLICATE on conflict', async () => {
    const builder = makeAwaitableBuilder({ data: null, error: { code: '23505', message: 'dup' } });
    fromMock.mockReturnValue(builder);

    const result = await addVinyl({ artist: 'A', album: 'B' } as any);

    expect(result).toBe('DUPLICATE');
  });

  it('addVinyl returns ADDED when insert succeeds', async () => {
    const builder = makeAwaitableBuilder({ data: { id: 1 }, error: null });
    fromMock.mockReturnValue(builder);

    const result = await addVinyl({ artist: 'A', album: 'B' } as any);

    expect(result).toBe('ADDED');
  });

  it('addVinyl returns ERROR on unknown failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: { code: 'x', message: 'bad insert' } });
    fromMock.mockReturnValue(builder);

    const result = await addVinyl({ artist: 'A', album: 'B' } as any);

    expect(result).toBe('ERROR');
    expect(consoleSpy).toHaveBeenCalledWith('Supabase Error:', 'bad insert');
    consoleSpy.mockRestore();
  });

  it('getUnplayedVinyls filters punctuation-insensitive query and applies sort', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { artist: 'Sorry, Mom', album: 'Record One', tags: ['Punk'] },
        { artist: 'Other', album: 'Else', tags: ['Jazz'] },
      ],
      error: null,
    });
    sortItemsMock.mockReturnValue([{ artist: 'Sorry, Mom', album: 'Record One', tags: ['Punk'] }]);

    const result = await getUnplayedVinyls('u1', 'Sorry Mom!', 'artist+');

    expect(result).toEqual([{ artist: 'Sorry, Mom', album: 'Record One', tags: ['Punk'] }]);
    expect(sortItemsMock).toHaveBeenCalled();
  });

  it('getUnplayedVinyls keeps vinyls matching any tag', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { artist: 'A', album: 'One', tags: ['Emo'] },
        { artist: 'B', album: 'Two', tags: ['punk'] },
        { artist: 'C', album: 'Three', tags: ['jazz'] },
        { artist: 'D', album: 'Four' },
      ],
      error: null,
    });

    const result = await getUnplayedVinyls('u1', undefined, undefined, ['emo', 'punk']);

    expect(result.map((v) => v.artist)).toEqual(['A', 'B']);
  });

  it('getUnplayedVinyls combines query and tags', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { artist: 'Alpha', album: 'One', tags: ['emo'] },
        { artist: 'Alpha', album: 'Two', tags: ['jazz'] },
        { artist: 'Beta', album: 'Three', tags: ['emo'] },
      ],
      error: null,
    });

    const result = await getUnplayedVinyls('u1', 'alpha', undefined, ['emo']);

    expect(result).toEqual([{ artist: 'Alpha', album: 'One', tags: ['emo'] }]);
  });

  it('getUnplayedVinylCounts returns empty array on rpc error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    rpcMock.mockResolvedValue({ data: null, error: new Error('rpc') });

    const result = await getUnplayedVinylCounts(['u1'] as any);

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getUnplayedVinylCounts returns data on success', async () => {
    rpcMock.mockResolvedValue({ data: [{ title: 'Alice', count: 3 }], error: null });

    const result = await getUnplayedVinylCounts(['u1'] as any);

    expect(result).toEqual([{ title: 'Alice', count: 3 }]);
  });

  it('getVinyls calculates playCount from playlogs', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B', play_count: 99, playlogs: [{ count: 3 }] }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinyls();

    expect(builder.select).toHaveBeenCalledWith('*, playlogs(count)');
    expect(builder.order).toHaveBeenCalledWith('artist', { ascending: true });
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 3 }]);
  });

  it('getVinyls throws when query fails', async () => {
    const err = new Error('db');
    const builder = makeAwaitableBuilder({ data: null, error: err });
    fromMock.mockReturnValue(builder);

    await expect(getVinyls()).rejects.toThrow('db');
  });

  it('getVinylsLikedByUserID applies likedBy filter', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsLikedByUserID('u1');

    expect(builder.contains).toHaveBeenCalledWith('liked_by', ['u1']);
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getVinylsByQuery applies user owner filter', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsByQuery({ type: 'user', term: 'u1' });

    expect(builder.contains).toHaveBeenCalledWith('owners', ['u1']);
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getVinylsByQuery applies full-text search filter', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsByQuery({ type: 'search', term: 'rise against' });

    expect(builder.or).toHaveBeenCalledWith('artist.wfts.rise against,album.wfts.rise against');
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getFullVinylsByQuery applies combined full-text query', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getFullVinylsByQuery('rise against');

    expect(builder.or).toHaveBeenCalledWith('artist.wfts.rise against,album.wfts.rise against');
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getVinylsByTags trims and lowercases tags before query', async () => {
    const builder = makeAwaitableBuilder({ data: [{ artist: 'A', album: 'B' }], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsByTags(['  Punk ', 'InDie', ' ']);

    expect(builder.overlaps).toHaveBeenCalledWith('tags', ['punk', 'indie']);
    expect(result).toEqual([{ artist: 'A', album: 'B', playCount: 0 }]);
  });

  it('getArtistVinylCounts aggregates and sorts by descending count', async () => {
    const builder = makeAwaitableBuilder({
      data: [{ artist: 'A' }, { artist: 'B' }, { artist: 'A' }],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getArtistVinylCounts();

    expect(result).toEqual([
      { title: 'A', count: 2 },
      { title: 'B', count: 1 },
    ]);
  });

  it('getVinylsByPlayCount calculates and sorts by playlogs count', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { artist: 'A', album: 'X', play_count: 99, playlogs: [{ count: 5 }] },
        { artist: 'B', album: 'Y', playlogs: [] },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getVinylsByPlayCount();

    expect(result).toEqual([
      { title: 'A - X', count: 5 },
      { title: 'B - Y', count: 0 },
    ]);
  });

  it('getArtistVinylCountByUserId aggregates owner-filtered counts', async () => {
    const builder = makeAwaitableBuilder({
      data: [{ artist: 'A' }, { artist: 'A' }, { artist: 'C' }],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getArtistVinylCountByUserId('u1');

    expect(builder.contains).toHaveBeenCalledWith('owners', ['u1']);
    expect(result).toEqual([
      { title: 'A', count: 2 },
      { title: 'C', count: 1 },
    ]);
  });

  it('throws on haveVinyl query error', async () => {
    const err = new Error('lookup failed');
    const builder = makeAwaitableBuilder({ data: null, error: err });
    fromMock.mockReturnValue(builder);

    await expect(haveVinyl({ artist: 'A', album: 'B' })).rejects.toThrow('lookup failed');
  });

  it('getUnplayedVinyls returns rpc data unchanged when no query or sort is provided', async () => {
    rpcMock.mockResolvedValue({
      data: [{ artist: 'A', album: 'X' }],
      error: null,
    });

    const result = await getUnplayedVinyls('u1');

    expect(result).toEqual([{ artist: 'A', album: 'X' }]);
    expect(sortItemsMock).not.toHaveBeenCalled();
  });
});

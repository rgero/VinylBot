import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({
  default: {
    from: fromMock,
  },
}));

import {
  addPlayLog,
  getLastPlayedDates,
  getPlayLogByID,
  getPlayLogs,
  getPlaylogByIndex,
  getPlaylogsByUserIDs,
  getSortedPlaysByQuery,
  getTopArtistsByPlay,
  getTopPlayedAlbumsByUserID,
} from '../../src/services/plays.api';

const makeAwaitableBuilder = (result: any) => {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    contains: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
    finally: (onFinally: any) => Promise.resolve(result).finally(onFinally),
  };

  return builder;
};

describe('plays.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPlayLogs maps vinyl artist and album fields', async () => {
    const builder = makeAwaitableBuilder({
      data: [{ id: 1, vinyls: { artist: 'A', album: 'B' } }],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getPlayLogs();

    expect(result[0]).toMatchObject({ artist: 'A', album: 'B' });
  });

  it('getPlayLogs applies limit when provided', async () => {
    const builder = makeAwaitableBuilder({ data: [], error: null });
    fromMock.mockReturnValue(builder);

    await getPlayLogs(5);

    expect(builder.limit).toHaveBeenCalledWith(5);
  });

  it('getPlayLogs returns empty array on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getPlayLogs();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getPlaylogByIndex returns null for invalid index', async () => {
    const result = await getPlaylogByIndex(0);
    expect(result).toBeNull();
  });

  it('getPlaylogByIndex returns mapped record', async () => {
    const builder = makeAwaitableBuilder({
      data: [{ id: 1, vinyls: { artist: 'A', album: 'B', image_url: 'img' } }],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getPlaylogByIndex(1);

    expect(builder.range).toHaveBeenCalledWith(0, 0);
    expect(builder.select).toHaveBeenCalledWith('*, vinyls(artist, album, image_url)');
    expect(result).toMatchObject({ artist: 'A', album: 'B', imageUrl: 'img' });
  });

  it('getPlaylogByIndex returns null when no row at index', async () => {
    const builder = makeAwaitableBuilder({ data: [], error: null });
    fromMock.mockReturnValue(builder);

    const result = await getPlaylogByIndex(4);

    expect(result).toBeNull();
  });

  it('getPlaylogByIndex returns null and logs on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getPlaylogByIndex(1);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getPlayLogByID returns mapped playlog on success', async () => {
    const builder = makeAwaitableBuilder({
      data: { id: 1, vinyls: { artist: 'A', album: 'B', image_url: 'img' } },
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getPlayLogByID(1);

    expect(builder.eq).toHaveBeenCalledWith('id', 1);
    expect(builder.select).toHaveBeenCalledWith('*, vinyls(artist, album, image_url)');
    expect(result).toMatchObject({ artist: 'A', album: 'B', imageUrl: 'img' });
  });

  it('getPlaylogsByUserIDs applies listeners filter and limit', async () => {
    const builder = makeAwaitableBuilder({
      data: [{ id: 1, vinyls: { artist: 'A', album: 'B' } }],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getPlaylogsByUserIDs(['u1'] as any, 2);

    expect(builder.contains).toHaveBeenCalledWith('listeners', ['u1']);
    expect(builder.limit).toHaveBeenCalledWith(2);
    expect(result[0]).toMatchObject({ artist: 'A', album: 'B' });
  });

  it('getPlaylogsByUserIDs returns empty array on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getPlaylogsByUserIDs(['u1'] as any);

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getPlayLogByID returns null and logs on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getPlayLogByID(1);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getLastPlayedDates keeps the most recent date per album and skips invalid dates', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { album_id: 1, date: '2020-01-01T00:00:00Z' },
        { album_id: 1, date: '2024-06-01T00:00:00Z' },
        { album_id: 2, date: null },
        { album_id: 3, date: 'not-a-date' },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getLastPlayedDates();

    expect(builder.contains).not.toHaveBeenCalled();
    expect(result.get(1)).toEqual(new Date('2024-06-01T00:00:00Z'));
    expect(result.has(2)).toBe(false);
    expect(result.has(3)).toBe(false);
  });

  it('getLastPlayedDates filters by listeners when user IDs are given', async () => {
    const builder = makeAwaitableBuilder({ data: [], error: null });
    fromMock.mockReturnValue(builder);

    await getLastPlayedDates(['u1'] as any);

    expect(builder.contains).toHaveBeenCalledWith('listeners', ['u1']);
  });

  it('getLastPlayedDates returns an empty map on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getLastPlayedDates();

    expect(result.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('addPlayLog throws on insert error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ error: new Error('insert failed') });
    fromMock.mockReturnValue(builder);

    await expect(addPlayLog({ album_id: 1, listeners: [], date: '2025-01-01' } as any)).rejects.toThrow('insert failed');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('addPlayLog resolves when insert succeeds', async () => {
    const builder = makeAwaitableBuilder({ error: null });
    fromMock.mockReturnValue(builder);

    await expect(addPlayLog({ album_id: 1, listeners: ['u1'], date: '2025-01-01' } as any)).resolves.toBeUndefined();
  });

  it('getTopPlayedAlbumsByUserID aggregates counts and defaults unknown names', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { album_id: 1, vinyls: { artist: 'A', album: 'Alpha' } },
        { album_id: 1, vinyls: { artist: 'A', album: 'Alpha' } },
        { album_id: 2, vinyls: null },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getTopPlayedAlbumsByUserID('u1');

    expect(result).toEqual([
      { title: 'A - Alpha', count: 2 },
      { title: 'Unknown Artist - Unknown Album', count: 1 },
    ]);
  });

  it('getTopPlayedAlbumsByUserID returns empty on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('db') });
    fromMock.mockReturnValue(builder);

    const result = await getTopPlayedAlbumsByUserID('u1');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getSortedPlaysByQuery aggregates matching album counts', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { album_id: 7, vinyls: { artist: 'A', album: 'Alpha' } },
        { album_id: 7, vinyls: { artist: 'A', album: 'Alpha' } },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getSortedPlaysByQuery('alpha');

    expect(builder.or).toHaveBeenCalledWith('artist.wfts.alpha,album.wfts.alpha', { foreignTable: 'vinyls' });
    expect(result).toEqual([{ title: 'A - Alpha', count: 2 }]);
  });

  it('getSortedPlaysByQuery returns empty array on query error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = makeAwaitableBuilder({ data: null, error: new Error('bad query') });
    fromMock.mockReturnValue(builder);

    const result = await getSortedPlaysByQuery('radiohead');

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getTopArtistsByPlay returns sorted artist counts', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { vinyls: { artist: 'A', album: 'x' } },
        { vinyls: { artist: 'B', album: 'y' } },
        { vinyls: { artist: 'A', album: 'z' } },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getTopArtistsByPlay();

    expect(result).toEqual([
      { title: 'A', count: 2 },
      { title: 'B', count: 1 },
    ]);
  });

  it('getTopArtistsByPlay uses user-filtered logs when user id is provided', async () => {
    const builder = makeAwaitableBuilder({
      data: [
        { vinyls: { artist: 'A', album: 'x' } },
        { vinyls: { artist: 'A', album: 'y' } },
      ],
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await getTopArtistsByPlay('u1');

    expect(builder.contains).toHaveBeenCalledWith('listeners', ['u1']);
    expect(result).toEqual([{ title: 'A', count: 2 }]);
  });
});

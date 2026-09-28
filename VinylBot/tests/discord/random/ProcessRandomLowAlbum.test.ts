import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, getUserByName } from '../../../src/services/users.api';

import { ProcessRandomLowAlbum } from '../../../src/discord/random/ProcessRandomLowAlbum';
import { getPlaylogsByUserIDs } from '../../../src/services/plays.api';
import { getVinyls, getVinylsByQuery, getVinylsLikedByUserID } from '../../../src/services/vinyls.api';

vi.mock('../../../src/services/users.api');
vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/services/plays.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name),
}));

describe('ProcessRandomLowAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMessage = () => ({
    author: { id: 'user123', username: 'testuser' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn(), stop: vi.fn() }),
    }),
  } as any);

  it('rejects multiple mentions', async () => {
    const context = { mentions: ['one', 'two'], flags: {}, query: '' } as any;
    const message = createMessage();

    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ Can only have 1 mention');
  });

  it('filters mentioned user likes by tags before computing low plays', async () => {
    const context = { mentions: ['uuid-2'], flags: { tags: 'emo' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getUserById).mockResolvedValue({ id: 'uuid-2', name: 'Alice' } as any);
    vi.mocked(getVinylsLikedByUserID).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 1, tags: ['jazz'] },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 3, tags: ['Emo'] },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({
        title: expect.stringContaining('liked by Alice tagged emo with <= 3 plays'),
      })],
    }));
  });

  it('reports empty results when no vinyls match tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([{ id: 'v1', artist: 'A', album: 'One', tags: ['jazz'] }] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ No entries found with tags "emo".');
  });

  it('filters search results by tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: 'alpha' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinylsByQuery).mockResolvedValue([
      { id: 'v1', artist: 'Alpha', album: 'One', playCount: 1, tags: ['jazz'] },
      { id: 'v2', artist: 'Alpha', album: 'Two', playCount: 4, tags: ['emo'] },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({
        title: expect.stringContaining('matching "alpha" tagged emo with <= 4 plays'),
      })],
    }));
  });

  it('reports when no search results match the tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: 'alpha' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinylsByQuery).mockResolvedValue([
      { id: 'v1', artist: 'Alpha', album: 'One', tags: ['jazz'] },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ No entries found matching "alpha" with tags "emo".');
  });

  it('applies tags before computing --mine play counts', async () => {
    const context = { mentions: [], flags: { mine: true, tags: 'emo' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', tags: ['emo'] },
      { id: 'v2', artist: 'B', album: 'Two', tags: ['jazz'] },
      { id: 'v3', artist: 'C', album: 'Three', tags: ['emo'] },
    ] as any);
    // User plays: v1 x3, v2 x1, v3 x2 — the untagged v2 would set the minimum to 1 if not filtered first.
    vi.mocked(getPlaylogsByUserIDs).mockResolvedValue([
      ...Array(3).fill({ album_id: 'v1' }),
      { album_id: 'v2' },
      ...Array(2).fill({ album_id: 'v3' }),
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({
        title: expect.stringContaining('tagged emo with <= 2 plays (mine)'),
      })],
    }));
  });

  it('replies when no matching vinyls are found', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ The requested collection is empty.');
  });

  it('uses --limit to filter low-play results', async () => {
    const context = { mentions: [], flags: { limit: '1' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 0 },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 2 },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('<= 1 plays') })],
    }));
  });

  it('filters by user playlogs when --mine is present', async () => {
    const context = { mentions: [], flags: { mine: true }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 5 },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 0 },
      { id: 'v3', artist: 'C', album: 'Three', playCount: 1 },
    ] as any);
    vi.mocked(getPlaylogsByUserIDs).mockResolvedValue([
      { id: 'p1', album_id: 'v1', listeners: ['1'], date: new Date(), artist: 'A', album: 'One' },
      { id: 'p2', album_id: 'v3', listeners: ['1'], date: new Date(), artist: 'C', album: 'Three' },
      { id: 'p3', album_id: 'v3', listeners: ['1'], date: new Date(), artist: 'C', album: 'Three' },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(getPlaylogsByUserIDs).toHaveBeenCalledWith(['1']);
    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('🎲 Random Low-Play Pick') })],
    }));
  });

  it('rejects --mine with a mention', async () => {
    const context = { mentions: ['123'], flags: { mine: true }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 0 },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ Invalid usage. Use either --mine or mention a user, not both.');
  });

  it('builds a low-play embed when results exist', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', playCount: 0 },
      { id: 'v2', artist: 'B', album: 'Two', playCount: 0 },
    ] as any);

    const message = createMessage();
    await ProcessRandomLowAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('🎲 Random Low-Play Pick') })],
    }));
  });
});

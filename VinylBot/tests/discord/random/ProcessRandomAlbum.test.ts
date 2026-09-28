import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserById, getUserByName } from '../../../src/services/users.api'

import { ProcessRandomAlbum } from '../../../src/discord/random/ProcessRandomAlbum';
import { Vinyl } from '../../../src/interfaces/Vinyl';
import { getVinyls, getVinylsByQuery, getVinylsLikedByUserID } from '../../../src/services/vinyls.api';
import { parseCommand } from '../../../src/utils/parseCommand';

vi.mock('../../../src/utils/parseCommand');
vi.mock('../../../src/services/users.api');
vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/services/plays.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name)
}));

describe('ProcessRandomAlbum', () => {
  let mockMessage: any;
  let mockCollector: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    mockMessage = {
      author: { id: 'user123', username: 'testuser' },
      reply: vi.fn().mockResolvedValue({
        createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
        edit: vi.fn().mockResolvedValue({}),
      }),
    };
  });

  it('should notify if no user profile is found via mention', async () => {
    const context = { 
      mentions: ['unknown-uuid' as any], 
      flags: [], 
      query: '' 
    }

    vi.mocked(getUserById).mockResolvedValue(null);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("No matching user profile found")
    );
  });

  it('should notify if the collection is empty', async () => {
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining("The requested collection is empty")
    );
  });

  it('should successfully send a random album and set up a collector', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick' })],
      components: expect.any(Array)
    }));

    expect(mockCollector.on).toHaveBeenCalledWith('collect', expect.any(Function));
  });

  it('should filter a mentioned user\'s likes by tags', async () => {
    const context = { mentions: ['uuid-2' as any], flags: { tags: 'emo,punk' }, query: '' };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getUserById).mockResolvedValue({ id: 'uuid-2', name: 'Alice' } as any);
    vi.mocked(getVinylsLikedByUserID).mockResolvedValue([
      { id: 'v1', artist: 'A', album: 'One', tags: ['jazz'] },
      { id: 'v2', artist: 'B', album: 'Two', tags: ['Punk'] },
    ] as unknown as Vinyl[]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick liked by Alice tagged emo, punk' })],
    }));
  });

  it('should report when no entries match the tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: '' };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue([{ id: 'v1', artist: 'A', album: 'One', tags: ['jazz'] }] as unknown as Vinyl[]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith('❌ No entries found with tags "emo".');
  });

  it('should filter search results by tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: 'alpha' };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinylsByQuery).mockResolvedValue([
      { id: 'v1', artist: 'Alpha', album: 'One', tags: ['jazz'] },
      { id: 'v2', artist: 'Alpha', album: 'Two', tags: ['emo'] },
    ] as unknown as Vinyl[]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(getVinylsByQuery).toHaveBeenCalledWith({ type: 'search', term: 'alpha' });
    expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: '🎲 Random Pick tagged emo' })],
    }));
  });

  it('should report when no search results match the tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: 'alpha' };
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinylsByQuery).mockResolvedValue([
      { id: 'v1', artist: 'Alpha', album: 'One', tags: ['jazz'] },
    ] as unknown as Vinyl[]);

    await ProcessRandomAlbum(mockMessage, context);

    expect(mockMessage.reply).toHaveBeenCalledWith('❌ No entries found matching "alpha" with tags "emo".');
  });

  it('should handle the cancel button interaction correctly', async () => {
    const mockVinyls = [{ id: 'v1', artist: 'Artist A', album: 'Album A' }] as unknown as Vinyl[];
    const context = { 
      mentions: [], 
      flags: [], 
      query: '' 
    }
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getVinyls).mockResolvedValue(mockVinyls);

    await ProcessRandomAlbum(mockMessage, context);

    const collectCallback = mockCollector.on.mock.calls.find((call: any[]) => call[0] === 'collect')[1];

    const mockInteraction = {
      user: { id: 'user123' },
      customId: 'cancel',
      update: vi.fn().mockResolvedValue({}),
    };

    await collectCallback(mockInteraction);

    expect(mockCollector.stop).toHaveBeenCalledWith('cancelled');
    expect(mockInteraction.update).toHaveBeenCalledWith(expect.objectContaining({
      content: "🎲 Random pick cancelled.",
    }));
  });
});
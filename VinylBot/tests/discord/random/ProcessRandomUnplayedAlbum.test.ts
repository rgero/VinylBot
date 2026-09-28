import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessRandomUnplayedAlbum } from '../../../src/discord/random/ProcessRandomUnplayedAlbum';
import { getUnplayedVinyls } from '../../../src/services/vinyls.api';
import { getUserById, getUserByName } from '../../../src/services/users.api';

vi.mock('../../../src/services/vinyls.api');
vi.mock('../../../src/services/users.api');
vi.mock('../../../src/utils/discordToDropdown', () => ({
  getDropdownValue: vi.fn((name) => name),
}));

describe('ProcessRandomUnplayedAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMessage = () => ({
    author: { id: 'user123', username: 'testuser' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn(), stop: vi.fn() }),
    }),
  } as any);

  it('reports missing user profile', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue(null);

    const message = createMessage();
    await ProcessRandomUnplayedAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('No matching user profile found'));
  });

  it('reports empty unplayed results', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getUnplayedVinyls).mockResolvedValue([]);

    const message = createMessage();
    await ProcessRandomUnplayedAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ The requested collection is empty.');
  });

  it('sends an unplayed random embed when results exist', async () => {
    const context = { mentions: [], flags: {}, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getUnplayedVinyls).mockResolvedValue([{ id: 'v1', artist: 'A', album: 'One' }] as any);

    const message = createMessage();
    await ProcessRandomUnplayedAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining('from Your Unplayed') })],
    }));
  });

  it('uses the mentioned user and passes tags through', async () => {
    const context = { mentions: ['uuid-2'], flags: { tags: 'Emo,punk' }, query: '' } as any;
    vi.mocked(getUserById).mockResolvedValue({ id: 'uuid-2', name: 'Alice' } as any);
    vi.mocked(getUnplayedVinyls).mockResolvedValue([{ id: 'v1', artist: 'A', album: 'One' }] as any);

    const message = createMessage();
    await ProcessRandomUnplayedAlbum(message, context);

    expect(getUserByName).not.toHaveBeenCalled();
    expect(getUnplayedVinyls).toHaveBeenCalledWith('uuid-2', undefined, undefined, ['emo', 'punk']);
    expect(message.reply).toHaveBeenCalledWith(expect.objectContaining({
      embeds: [expect.objectContaining({ title: expect.stringContaining("from Alice's Unplayed by Tags") })],
    }));
  });

  it('reports empty results for tags', async () => {
    const context = { mentions: [], flags: { tags: 'emo' }, query: '' } as any;
    vi.mocked(getUserByName).mockResolvedValue({ id: '1', name: 'testuser' } as any);
    vi.mocked(getUnplayedVinyls).mockResolvedValue([]);

    const message = createMessage();
    await ProcessRandomUnplayedAlbum(message, context);

    expect(message.reply).toHaveBeenCalledWith('❌ No unplayed entries found with tags "emo".');
  });
});

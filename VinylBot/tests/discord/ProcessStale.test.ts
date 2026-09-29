import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseCommandMock,
  resolveUserMapMock,
  getVinylsBySearchQueryMock,
  getLastPlayedDatesMock,
  getNameByIdMock,
  EmbeddedResponseMock,
} = vi.hoisted(() => ({
  parseCommandMock: vi.fn(),
  resolveUserMapMock: vi.fn(),
  getVinylsBySearchQueryMock: vi.fn(),
  getLastPlayedDatesMock: vi.fn(),
  getNameByIdMock: vi.fn(),
  EmbeddedResponseMock: vi.fn(),
}));

vi.mock('../../src/utils/parseCommand.js', () => ({
  parseCommand: parseCommandMock,
}));

vi.mock('../../src/utils/resolveUserMap.js', () => ({
  resolveUserMap: resolveUserMapMock,
}));

vi.mock('../../src/services/vinyls.api.js', () => ({
  getVinylsBySearchQuery: getVinylsBySearchQueryMock,
}));

vi.mock('../../src/services/plays.api.js', () => ({
  getLastPlayedDates: getLastPlayedDatesMock,
}));

vi.mock('../../src/services/users.api.js', () => ({
  getNameById: getNameByIdMock,
}));

vi.mock('../../src/utils/discord/EmbeddedResponse.js', () => ({
  EmbeddedResponse: EmbeddedResponseMock,
}));

vi.mock('../../src/utils/discordToDropdown.js', () => ({
  getDropdownValue: vi.fn((name: string) => name),
}));

import { ProcessStale } from '../../src/discord/ProcessStale';

describe('ProcessStale', () => {
  const createMessage = () => ({
    content: '!stale',
    author: { id: 'author-id', username: 'testuser' },
    reply: vi.fn().mockResolvedValue(undefined),
  } as any);

  const withContext = (context: Record<string, unknown>) =>
    parseCommandMock.mockResolvedValue({ ok: true, context: { mentions: [], flags: {}, query: '', ...context } });

  const renderedList = () => EmbeddedResponseMock.mock.calls[0][0].list;
  const renderItem = (index: number) => {
    const options = EmbeddedResponseMock.mock.calls[0][0];
    return options.formatItem(options.list[index], index);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserMapMock.mockResolvedValue(new Map([['testuser', ['uuid-1']]]));
    getNameByIdMock.mockResolvedValue('Test User');
    getLastPlayedDatesMock.mockResolvedValue(new Map());
    EmbeddedResponseMock.mockResolvedValue(undefined);
  });

  it('sorts never-played albums first, then oldest play date', async () => {
    withContext({});
    getVinylsBySearchQueryMock.mockResolvedValue([
      { id: 1, artist: 'Recent', album: 'One' },
      { id: 2, artist: 'Never', album: 'Two' },
      { id: 3, artist: 'Old', album: 'Three' },
    ]);
    getLastPlayedDatesMock.mockResolvedValue(new Map([
      [1, new Date('2024-06-01')],
      [3, new Date('2020-01-01')],
    ]));

    await ProcessStale(createMessage());

    expect(renderedList().map((item: any) => item.artist)).toEqual(['Never', 'Old', 'Recent']);
  });

  it('labels never-played albums and renders a relative timestamp otherwise', async () => {
    withContext({});
    getVinylsBySearchQueryMock.mockResolvedValue([
      { id: 1, artist: 'Played', album: 'One' },
      { id: 2, artist: 'Never', album: 'Two' },
    ]);
    getLastPlayedDatesMock.mockResolvedValue(new Map([[1, new Date('2020-01-01T00:00:00Z')]]));

    await ProcessStale(createMessage());

    expect(renderItem(0)).toBe('1. **Never** - Two — Never played');
    expect(renderItem(1)).toBe('2. **Played** - One — <t:1577836800:R>');
  });

  it('queries all plays when no user is targeted', async () => {
    withContext({});
    getVinylsBySearchQueryMock.mockResolvedValue([{ id: 1, artist: 'A', album: 'One' }]);

    await ProcessStale(createMessage());

    expect(getLastPlayedDatesMock).toHaveBeenCalledWith(undefined);
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Longest Since Played (1 total)',
    }));
  });

  it('scopes plays to the requester with --mine', async () => {
    withContext({ flags: { mine: true } });
    getVinylsBySearchQueryMock.mockResolvedValue([{ id: 1, artist: 'A', album: 'One' }]);

    await ProcessStale(createMessage());

    expect(getLastPlayedDatesMock).toHaveBeenCalledWith(['uuid-1']);
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Longest Since Played for Test User (1 total)',
    }));
  });

  it('scopes plays to a mentioned user', async () => {
    withContext({ mentions: ['uuid-2'] });
    getVinylsBySearchQueryMock.mockResolvedValue([{ id: 1, artist: 'A', album: 'One' }]);

    await ProcessStale(createMessage());

    expect(getLastPlayedDatesMock).toHaveBeenCalledWith(['uuid-2']);
  });

  it('forwards the search term and tags to the vinyl query', async () => {
    withContext({ query: 'radiohead', flags: { tags: 'Emo,punk' } });
    getVinylsBySearchQueryMock.mockResolvedValue([{ id: 1, artist: 'A', album: 'One' }]);

    await ProcessStale(createMessage());

    expect(getVinylsBySearchQueryMock).toHaveBeenCalledWith({ search: 'radiohead', tags: ['emo', 'punk'] });
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Longest Since Played tagged emo, punk (1 total)',
    }));
  });

  it('rejects --mine combined with a mention', async () => {
    withContext({ mentions: ['uuid-2'], flags: { mine: true } });
    const message = createMessage();

    await ProcessStale(message);

    expect(message.reply).toHaveBeenCalledWith("❌ `--mine` can't be combined with a mention.");
    expect(getVinylsBySearchQueryMock).not.toHaveBeenCalled();
  });

  it('rejects multiple mentions', async () => {
    withContext({ mentions: ['uuid-2', 'uuid-3'] });
    const message = createMessage();

    await ProcessStale(message);

    expect(message.reply).toHaveBeenCalledWith('❌ Please mention only one user.');
    expect(getVinylsBySearchQueryMock).not.toHaveBeenCalled();
  });

  it('warns when an unregistered user asks for --mine', async () => {
    withContext({ flags: { mine: true } });
    resolveUserMapMock.mockResolvedValue(new Map());
    const message = createMessage();

    await ProcessStale(message);

    expect(message.reply).toHaveBeenCalledWith("⚠️ You are not registered, so I can't filter by your plays.");
  });

  it('replies when no vinyls match', async () => {
    withContext({ query: 'nothing' });
    getVinylsBySearchQueryMock.mockResolvedValue([]);
    const message = createMessage();

    await ProcessStale(message);

    expect(message.reply).toHaveBeenCalledWith('❌ No vinyls found.');
    expect(EmbeddedResponseMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseCommandMock,
  resolveUserMapMock,
  getUnplayedVinylsMock,
  getUnplayedVinylCountsMock,
  getNameByIdMock,
  EmbeddedResponseMock,
} = vi.hoisted(() => ({
  parseCommandMock: vi.fn(),
  resolveUserMapMock: vi.fn(),
  getUnplayedVinylsMock: vi.fn(),
  getUnplayedVinylCountsMock: vi.fn(),
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
  getUnplayedVinyls: getUnplayedVinylsMock,
  getUnplayedVinylCounts: getUnplayedVinylCountsMock,
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

import { ProcessUnplayed } from '../../src/discord/ProcessUnplayed';

describe('ProcessUnplayed', () => {
  const createMessage = () => ({
    content: '!unplayed',
    author: { id: 'author-id', username: 'testuser' },
    reply: vi.fn().mockResolvedValue(undefined),
  } as any);

  const withContext = (context: Record<string, unknown>) =>
    parseCommandMock.mockResolvedValue({ ok: true, context: { mentions: [], flags: {}, query: '', ...context } });

  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserMapMock.mockResolvedValue(new Map([['testuser', ['uuid-1']]]));
    EmbeddedResponseMock.mockResolvedValue(undefined);
  });

  it('passes parsed tags to getUnplayedVinyls and includes them in the title', async () => {
    withContext({ flags: { tags: 'Emo,punk' } });
    getUnplayedVinylsMock.mockResolvedValue([{ artist: 'A', album: 'One', owners: ['uuid-1'] }]);

    await ProcessUnplayed(createMessage());

    expect(getUnplayedVinylsMock).toHaveBeenCalledWith('uuid-1', '', 'artist+', ['emo', 'punk']);
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Unplayed Vinyls tagged emo, punk (1 total)',
    }));
  });

  it('omits tags from the title when none are given', async () => {
    withContext({});
    getUnplayedVinylsMock.mockResolvedValue([{ artist: 'A', album: 'One', owners: ['uuid-1'] }]);

    await ProcessUnplayed(createMessage());

    expect(getUnplayedVinylsMock).toHaveBeenCalledWith('uuid-1', '', 'artist+', []);
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Unplayed Vinyls (1 total)',
    }));
  });

  it('ignores --tags when --count is used', async () => {
    withContext({ flags: { count: true, tags: 'emo' } });
    getUnplayedVinylCountsMock.mockResolvedValue([{ title: 'uuid-1', count: 4 }]);
    getNameByIdMock.mockResolvedValue('testuser');

    await ProcessUnplayed(createMessage());

    expect(getUnplayedVinylCountsMock).toHaveBeenCalledWith(['uuid-1']);
    expect(getUnplayedVinylsMock).not.toHaveBeenCalled();
    expect(EmbeddedResponseMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Unplayed Vinyl Counts',
    }));
  });
});

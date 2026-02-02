import * as dropdownUtils from '../../src/utils/discordToDropdown';
import * as userMapService from '../../src/utils/resolveUserMap';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Collection } from 'discord.js';
import { parseCommand } from '../../src/utils/parseCommand';

// 1. Mock the external dependencies
vi.mock('../../src/utils/resolveUserMap');
vi.mock('../../src/utils/discordToDropdown');

describe('parseCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a mock Discord Message.
   * We cast to 'any' to avoid implementing every single Discord.js Message property.
   */
  const createMockMessage = (content: string, mentions = new Collection()) => ({
    content,
    mentions: {
      users: mentions.filter(u => !u.bot) // Simplified version of your filter
    },
    reply: vi.fn().mockResolvedValue(null),
  } as any);

  it('should return type "full" when no arguments (only command) are provided', async () => {
    const message = createMockMessage("!have");
    const result = await parseCommand(message);
    
    expect(result).toEqual({ type: 'full', term: '' });
  });

  it('should return type "user" when a valid mention is provided and exists in the map', async () => {
    const mockDbId = 'db-uuid-123';
    const mockUser = { username: 'Alice', bot: false };
    
    // Setup Mentions Collection
    const mentions = new Collection<string, any>();
    mentions.set('123', mockUser);
    
    // Mock getDropdownValue to return a predictable key
    vi.mocked(dropdownUtils.getDropdownValue).mockReturnValue('alice-transformed');
    
    // Setup the User Map to match that transformed key
    const mockMap = new Map();
    mockMap.set('alice-transformed', [mockDbId]); 
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(mockMap);

    const message = createMockMessage("!have @Alice", mentions);
    const result = await parseCommand(message);

    expect(result).toEqual({ type: 'user', term: mockDbId });
  });

  it('should return undefined and reply if a mention is not in the database', async () => {
    const mockUser = { username: 'FakeUser', bot: false };
    const mentions = new Collection<string, any>();
    mentions.set('456', mockUser);

    vi.mocked(dropdownUtils.getDropdownValue).mockReturnValue('fakeuser');
    vi.mocked(userMapService.resolveUserMap).mockResolvedValue(new Map()); // Empty map

    const message = createMockMessage("!have @FakeUser", mentions);
    const result = await parseCommand(message);

    expect(result).toBeUndefined();
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining("I couldn't find a database entry for **FakeUser**")
    );
  });

  it('should return type "search" for general text queries (no mentions)', async () => {
    const message = createMockMessage("!have Dark Side of the Moon");
    const result = await parseCommand(message);

    expect(result).toEqual({ type: 'search', term: 'Dark Side of the Moon' });
  });

  it('should return undefined and reply if multiple users are mentioned', async () => {
    const mentions = new Collection<string, any>();
    mentions.set('1', { username: 'User1', bot: false });
    mentions.set('2', { username: 'User2', bot: false });

    const message = createMockMessage("!have @User1 @User2", mentions);
    const result = await parseCommand(message);

    expect(result).toBeUndefined();
    expect(message.reply).toHaveBeenCalledWith("⚠️ Only one user can be mentioned at this time.");
  });

  it('should handle search queries with spaces correctly', async () => {
    const message = createMockMessage("!want Radiohead - Kid A");
    const result = await parseCommand(message);

    expect(result).toEqual({ type: 'search', term: 'Radiohead - Kid A' });
  });
});
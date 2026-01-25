import * as commandParser from '../../src/utils/parseCommand';
import * as vinylApi from '../../src/services/vinyls.api';
import * as wantlistApi from '../../src/services/wantlist.api';

import { ComponentType, Message } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessList } from '../../src/discord/ProcessList';
import { SearchResponse } from '../../src/interfaces/SearchResponse'; // Adjust path if needed

// Setup Mocks
vi.mock('../../src/services/vinyls.api');
vi.mock('../../src/services/wantlist.api');
vi.mock('../../src/utils/parseCommand');

describe('ProcessList Integration Tests', () => {
  
  // Helper to create the complex Discord Message mock
  const createMockMessage = (content: string) => ({
    content,
    author: { id: 'author-id' },
    reply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ 
        on: vi.fn(),
        stop: vi.fn() 
      }),
      edit: vi.fn().mockResolvedValue({}),
    }),
  } as unknown as Message);

  // Helper to generate mock data matching SearchResponse
  const mockSearchItem = (artist: string, album: string): SearchResponse => ({
    artist,
    album,
    owners: [],
    searcher: []
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- HAVE FUNCTIONALITY SUITE ---
  describe('Have List (!have)', () => {
    it('should fetch from vinyls.api and use green embed color', async () => {
      const mockMessage = createMockMessage('!have Beatles');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'search',
        term: 'Beatles'
      });

      const vinylSpy = vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([
        mockSearchItem('The Beatles', 'Abbey Road')
      ]);

      await ProcessList(mockMessage, 'have');

      // Verify correct API was called
      expect(vinylSpy).toHaveBeenCalledWith({ type: 'search', term: 'Beatles' });
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Collection matches for "Beatles"');
      expect(replyCall.embeds[0].data.color).toBe(0x1db954); // Green
    });

    it('should pass the resolved user ID to vinyls.api when searching by user', async () => {
      const mockMessage = createMockMessage('!have @Alice');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'user',
        term: 'uuid-1234'
      });

      const vinylSpy = vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([
        mockSearchItem('Artist', 'Title')
      ]);

      await ProcessList(mockMessage, 'have');

      expect(vinylSpy).toHaveBeenCalledWith({ type: 'user', term: 'uuid-1234' });
    });
  });

  // --- WANT FUNCTIONALITY SUITE ---
  describe('Want List (!wantlist)', () => {
    it('should fetch from wantlist.api and use blue embed color', async () => {
      const mockMessage = createMockMessage('!wantlist Rise Against');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'search',
        term: 'Rise Against'
      });

      const wantSpy = vi.mocked(wantlistApi.getWantList).mockResolvedValue([
        mockSearchItem('Rise Against', 'The Unraveling')
      ]);

      await ProcessList(mockMessage, 'want');

      // Verify correct API was called
      expect(wantSpy).toHaveBeenCalledWith({ type: 'search', term: 'Rise Against' });
      
      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('Want List matches for "Rise Against"');
      expect(replyCall.embeds[0].data.color).toBe(0x3498db); // Blue
    });

    it('should show "The Want List" title when fetching the full list', async () => {
      const mockMessage = createMockMessage('!wantlist');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({
        type: 'full',
        term: ''
      });

      vi.mocked(wantlistApi.getWantList).mockResolvedValue([
        mockSearchItem('Linkin Park', 'Hybrid Theory')
      ]);

      await ProcessList(mockMessage, 'want');

      const replyCall = vi.mocked(mockMessage.reply).mock.calls[0][0] as any;
      expect(replyCall.embeds[0].data.title).toContain('The Want List (Page 1/1)');
    });
  });

  // --- ERROR HANDLING ---
  describe('Edge Cases & Errors', () => {
    it('should reply with a specific message when the database returns no results', async () => {
      const mockMessage = createMockMessage('!have NonExistentArtist');

      vi.mocked(commandParser.parseCommand).mockResolvedValue({ 
        type: 'search', 
        term: 'NonExistentArtist' 
      });
      vi.mocked(vinylApi.getVinylsByQuery).mockResolvedValue([]);

      await ProcessList(mockMessage, 'have');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('❌ No items found'));
    });

    it('should handle API errors gracefully', async () => {
      const mockMessage = createMockMessage('!have error');
      vi.spyOn(console, 'error').mockImplementation(() => {}); // Silence console

      vi.mocked(commandParser.parseCommand).mockResolvedValue({ type: 'full', term: '' });
      vi.mocked(vinylApi.getVinylsByQuery).mockRejectedValue(new Error('DB Error'));

      await ProcessList(mockMessage, 'have');

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ An error occurred'));
    });
  });
});
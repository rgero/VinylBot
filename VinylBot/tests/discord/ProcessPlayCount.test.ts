import * as vinylService from '../../src/services/vinyls.api';

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessPlayCount } from "../../src/discord/ProcessPlayCount";

// Mock the API service
vi.mock('../../src/services/vinyls.api', () => ({
  getVinylsByPlayCount: vi.fn(),
}));

describe("ProcessPlayCount Command", () => {
  let mockMessage: any;
  let mockSentMessage: any;
  let mockCollector: any;
  const events: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset event tracking for each test
    mockCollector = {
      on: vi.fn((event, cb) => { events[event] = cb; }),
      emit: async (event: string, ...args: any[]) => await events[event]?.(...args),
    };

    mockSentMessage = {
      createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      edit: vi.fn().mockResolvedValue({}),
    };

    mockMessage = {
      author: { id: "user-1" },
      reply: vi.fn().mockResolvedValue(mockSentMessage),
    };
  });

  it("should handle empty vinyl lists correctly", async () => {
    vi.mocked(vinylService.getVinylsByPlayCount).mockResolvedValue([]);

    await ProcessPlayCount(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("❌ No items found"));
  });

  it("should display the correct format in the embed description", async () => {
    const mockVinyls = [
      { artist: "Daft Punk", 
        album: "Discovery", 
        playCount: 42,
        purchaseDate: '',
        owners: [],
        imageUrl: '',
        doubleLP: false
      }
    ];
    vi.mocked(vinylService.getVinylsByPlayCount).mockResolvedValue(mockVinyls);

    await ProcessPlayCount(mockMessage);

    // Verify the description format: 1. **Artist** - **Album** - Count
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              description: "1. **Daft Punk** - **Discovery** - 42"
            })
          })
        ]
      })
    );
  });

  it("should navigate to the next page when button is clicked", async () => {
    // 12 items = 2 pages (10 per page)
    const mockVinyls = Array(12).fill({ artist: "Artist", album: "Album", playCount: 10 });
    vi.mocked(vinylService.getVinylsByPlayCount).mockResolvedValue(mockVinyls);

    await ProcessPlayCount(mockMessage);

    const mockInteraction = {
      user: { id: "user-1" },
      customId: "next",
      update: vi.fn().mockResolvedValue({}),
    };

    // Trigger 'collect' event
    await mockCollector.emit("collect", mockInteraction);

    expect(mockInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("Page 2/2")
            })
          })
        ]
      })
    );
  });

  it("should disable buttons when the collector times out", async () => {
    vi.mocked(vinylService.getVinylsByPlayCount).mockResolvedValue([{
      artist: "A", 
      album: "B", 
      playCount: 1,
      purchaseDate: '',
      owners: [],
      imageUrl: '',
      doubleLP: false
    }]);
    
    await ProcessPlayCount(mockMessage);
    await mockCollector.emit("end");

    expect(mockSentMessage.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [
          expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({ data: expect.objectContaining({ disabled: true }) })
            ])
          })
        ]
      })
    );
  });
});
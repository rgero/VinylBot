import * as vinylService from '../../src/services/vinyls.api'

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentType } from "discord.js";
import {ProcessTop} from '../../src/discord/stats/ProcessTop';

vi.mock("../../src/services/vinyls.api", () => ({
  getArtistVinylCounts: vi.fn(),
}));

describe("ProcessTop Command", () => {
  let mockMessage: any;
  let mockSentMessage: any;
  let mockCollector: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Collector Mock
    const events: Record<string, Function> = {};
    mockCollector = {
      on: vi.fn((event, cb) => { events[event] = cb; }),
      emit: (event: string, ...args: any[]) => events[event]?.(...args),
    };

    // Setup Sent Message Mock
    mockSentMessage = {
      createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      edit: vi.fn().mockResolvedValue({}),
    };

    // Setup Initial Message Mock
    mockMessage = {
      author: { id: "user-123" },
      reply: vi.fn().mockResolvedValue(mockSentMessage),
    };
  });

  it("should reply with an error if no albums are returned", async () => {
    vi.mocked(vinylService.getArtistVinylCounts).mockResolvedValue([]);

    await ProcessTop(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("❌ No items found"));
  });

  it("should render page 1 and start a collector", async () => {
    const mockData = Array(15).fill({ artist: "The Beatles", count: 1 });
    vi.mocked(vinylService.getArtistVinylCounts).mockResolvedValue(mockData);

    await ProcessTop(mockMessage);

    // Verify initial reply
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.anything()],
        components: [expect.anything()],
      })
    );

    // Verify collector settings
    expect(mockSentMessage.createMessageComponentCollector).toHaveBeenCalledWith({
      componentType: ComponentType.Button,
      time: 300000,
    });
  });

  it("should handle pagination when buttons are clicked", async () => {
    const mockData = Array(15).fill({ artist: "Daft Punk", count: 2 });
    vi.mocked(vinylService.getArtistVinylCounts).mockResolvedValue(mockData);

    await ProcessTop(mockMessage);

    // Simulate "next" button click
    const mockInteraction = {
      user: { id: "user-123" },
      customId: "next",
      update: vi.fn().mockResolvedValue({}),
    };

    // Manually trigger the 'collect' event
    await mockCollector.emit("collect", mockInteraction);

    expect(mockInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("Page 2/2"),
            }),
          }),
        ],
      })
    );
  });

  it("should reject interactions from other users", async () => {
    vi.mocked(vinylService.getArtistVinylCounts).mockResolvedValue([{ artist: "A", count: 1 }]);
    await ProcessTop(mockMessage);

    const mockInteraction = {
      user: { id: "wrong-user" },
      reply: vi.fn().mockResolvedValue({}),
    };

    await mockCollector.emit("collect", mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "You can't control this pagination.", ephemeral: true })
    );
  });
});
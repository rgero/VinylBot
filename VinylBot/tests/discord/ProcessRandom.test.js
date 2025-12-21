import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogPlay } from "../../src/google/LogPlay.js";
import { ProcessRandom } from "../../src/discord/ProcessRandom.js";
import { getRandomRow } from "../../src/google/GetRandomRow.js";

// Mock external dependencies
vi.mock("../../src/google/GetRandomRow.js", () => ({ getRandomRow: vi.fn() }));
vi.mock("../../src/google/LogPlay.js", () => ({ LogPlay: vi.fn() }));
vi.mock("../../src/utils/escapeColons.js", () => ({ escapeColons: (s) => s }));
vi.mock("../../src/utils/discordToDropdown.js", () => ({ getDropdownValue: (s) => s }));

describe("ProcessRandom", () => {
  let mockMessage;
  let mockSentMessage;
  let mockCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    
    process.env.ALBUM_SHEET_NAME = "Albums";
    process.env.LOCATIONS_SHEET_NAME = "Stores";

    // Mock Collector
    mockCollector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    // Mock the message sent by the bot
    mockSentMessage = {
      createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      edit: vi.fn().mockResolvedValue({}),
    };

    // Mock the incoming user message
    mockMessage = {
      content: "!random",
      author: { id: "user-123", username: "TestUser" },
      reply: vi.fn().mockResolvedValue(mockSentMessage),
    };
  });

  it("should reply with an error message if no row is found", async () => {
    vi.mocked(getRandomRow).mockResolvedValue(null);

    await ProcessRandom(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith("❌ No matching entries found.");
  });

  it("should send an album embed when no params are provided", async () => {
    vi.mocked(getRandomRow).mockResolvedValue(["Rise Against", "Endgame"]);

    await ProcessRandom(mockMessage);

    expect(getRandomRow).toHaveBeenCalledWith({
      sheetName: "Albums",
      filterColumnIndex: null,
      filterValue: null,
    });

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ title: "🎲 Random Pick" })],
      })
    );
  });

  it("should use store sheet when 'store' param is provided", async () => {
    mockMessage.content = "!random store";
    vi.mocked(getRandomRow).mockResolvedValue(["Music Store", "123 Street"]);

    await ProcessRandom(mockMessage);

    expect(getRandomRow).toHaveBeenCalledWith(expect.objectContaining({
      sheetName: "Stores"
    }));
  });

  it("should apply filter when a genre/param is provided", async () => {
    mockMessage.content = "!random punk";
    vi.mocked(getRandomRow).mockResolvedValue(["NOFX", "Punk in Drublic"]);

    await ProcessRandom(mockMessage);

    expect(getRandomRow).toHaveBeenCalledWith(expect.objectContaining({
      filterColumnIndex: 9,
      filterValue: "punk"
    }));
  });

  describe("Collector Interactions", () => {
    let collectCallback;

    beforeEach(async () => {
      vi.mocked(getRandomRow).mockResolvedValue(["Artist", "Album"]);
      await ProcessRandom(mockMessage);
      // Grab the callback function passed to collector.on('collect', ...)
      collectCallback = mockCollector.on.mock.calls.find(call => call[0] === "collect")[1];
    });

    it("should ignore interactions from different users", async () => {
      const mockInteraction = {
        user: { id: "wrong-user" },
        reply: vi.fn(),
        ephemeral: true,
      };

      await collectCallback(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
        content: "You can't use these buttons."
      }));
    });

    it("should log play and stop collector when 'play' is clicked", async () => {
      const mockInteraction = {
        user: { id: "user-123" },
        customId: "play",
        update: vi.fn(),
        followUp: vi.fn(),
      };

      await collectCallback(mockInteraction);

      expect(LogPlay).toHaveBeenCalledWith("Artist", "Album", "TestUser");
      expect(mockInteraction.update).toHaveBeenCalled();
      expect(mockCollector.stop).toHaveBeenCalled();
    });

    it("should fetch a new row when 'reroll' is clicked", async () => {
      const mockInteraction = {
        user: { id: "user-123" },
        customId: "reroll",
        update: vi.fn(),
      };

      vi.mocked(getRandomRow).mockResolvedValue(["New Artist", "New Album"]);

      await collectCallback(mockInteraction);

      expect(getRandomRow).toHaveBeenCalledTimes(2); // Initial + Reroll
      expect(mockInteraction.update).toHaveBeenCalledWith(expect.objectContaining({
        embeds: [expect.objectContaining({ description: expect.stringContaining("New Artist") })]
      }));
    });
  });

  it("should disable buttons when the collector ends", async () => {
    vi.mocked(getRandomRow).mockResolvedValue(["Artist", "Album"]);
    await ProcessRandom(mockMessage);

    const endCallback = mockCollector.on.mock.calls.find(call => call[0] === "end")[1];
    await endCallback();

    expect(mockSentMessage.edit).toHaveBeenCalledWith(expect.objectContaining({
      components: expect.arrayContaining([
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ data: expect.objectContaining({ disabled: true }) })
          ])
        })
      ])
    }));
  });
});
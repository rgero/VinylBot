import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessWantList } from "../../src/discord/ProcessWantList.js";
import { getWantList } from "../../src/google/GetWantList.js";
import { isInList } from "../../src/utils/userParser.js";

// Mock dependencies
vi.mock("../../src/google/GetWantList.js", () => ({ getWantList: vi.fn() }));
vi.mock("../../src/utils/userParser.js", () => ({ isInList: vi.fn() }));
vi.mock("../../src/utils/escapeColons.js", () => ({ escapeColons: (s) => s }));

describe("ProcessWantList", () => {
  let mockMessage;
  let mockSentMessage;
  let mockCollector;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the Discord Collector
    mockCollector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    // Mock the message the bot sends back
    mockSentMessage = {
      createMessageComponentCollector: vi.fn().mockReturnValue(mockCollector),
      edit: vi.fn().mockResolvedValue({}),
    };

    // Mock the incoming user message
    mockMessage = {
      content: "!wantlist",
      author: { id: "user-1" },
      reply: vi.fn().mockResolvedValue(mockSentMessage),
    };
  });

  describe("Basic Functionality", () => {
    it("should reply with an error if the list is empty", async () => {
      vi.mocked(getWantList).mockResolvedValue([]);

      await ProcessWantList(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalledWith("❌ There's nothing on the list.");
    });

    it("should display the correct page numbers for a large list", async () => {
      const largeList = Array(15).fill(["Artist", "Album"]); // 15 items = 2 pages
      vi.mocked(getWantList).mockResolvedValue(largeList);

      await ProcessWantList(mockMessage);

      const replyCall = mockMessage.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toContain("Page 1/2");
    });
  });

  describe("Parameter Parsing", () => {
    beforeEach(() => {
      vi.mocked(getWantList).mockResolvedValue([["Artist", "Album"]]);
    });

    it("should request the full list when no parameters are provided", async () => {
      mockMessage.content = "!wantlist";
      await ProcessWantList(mockMessage);

      expect(getWantList).toHaveBeenCalledWith({ type: "full", term: "" });
    });

    it("should treat single-word parameters as users if isInList is true", async () => {
      mockMessage.content = "!wantlist Roy";
      vi.mocked(isInList).mockReturnValue(true);

      await ProcessWantList(mockMessage);

      expect(getWantList).toHaveBeenCalledWith({ type: "user", term: "Roy" });
    });

    it("should treat single-word parameters as artists if isInList is false", async () => {
      mockMessage.content = "!wantlist Rise Against";
      vi.mocked(isInList).mockReturnValue(false);

      await ProcessWantList(mockMessage);

      expect(getWantList).toHaveBeenCalledWith({ type: "artist", term: "Rise Against" });
    });

    it("should treat multi-word parameters as artists regardless of isInList", async () => {
      mockMessage.content = "!wantlist Pink Floyd";
      vi.mocked(isInList).mockReturnValue(false);

      await ProcessWantList(mockMessage);

      expect(getWantList).toHaveBeenCalledWith({ type: "artist", term: "Pink Floyd" });
    });

    it("should trim and clean extra whitespace in parameters", async () => {
      mockMessage.content = "!wantlist    Mew   ";
      vi.mocked(isInList).mockReturnValue(false);

      await ProcessWantList(mockMessage);

      expect(getWantList).toHaveBeenCalledWith({ type: "artist", term: "Mew" });
    });
  });

  describe("Pagination Collector", () => {
    let collectCallback;
    const largeList = Array(15).fill(["Artist", "Album"]);

    beforeEach(async () => {
      vi.mocked(getWantList).mockResolvedValue(largeList);
      await ProcessWantList(mockMessage);
      // Capture the 'collect' function
      collectCallback = mockCollector.on.mock.calls.find(c => c[0] === "collect")[1];
    });

    it("should increment page when 'next' is clicked", async () => {
      const mockInteraction = {
        user: { id: "user-1" },
        customId: "next",
        update: vi.fn().mockResolvedValue({}),
      };

      await collectCallback(mockInteraction);

      const updateCall = mockInteraction.update.mock.calls[0][0];
      expect(updateCall.embeds[0].data.title).toContain("Page 2/2");
      // Page 2 of 2: Next button should be disabled
      expect(updateCall.components[0].components[1].data.disabled).toBe(true);
    });

    it("should decrement page when 'prev' is clicked", async () => {
      // Step 1: Click next to go to page 2
      const nextInteraction = { user: { id: "user-1" }, customId: "next", update: vi.fn() };
      await collectCallback(nextInteraction);

      // Step 2: Click prev to go back to page 1
      const prevInteraction = { user: { id: "user-1" }, customId: "prev", update: vi.fn() };
      await collectCallback(prevInteraction);

      const updateCall = prevInteraction.update.mock.calls[0][0];
      expect(updateCall.embeds[0].data.title).toContain("Page 1/2");
      // Page 1 of 2: Previous button should be disabled
      expect(updateCall.components[0].components[0].data.disabled).toBe(true);
    });

    it("should prevent unauthorized users from clicking buttons", async () => {
      const mockInteraction = {
        user: { id: "intruder-456" },
        reply: vi.fn().mockResolvedValue({}),
      };

      await collectCallback(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining("can't control"),
        ephemeral: true
      }));
    });
  });

  it("should disable all buttons when the collector expires", async () => {
    vi.mocked(getWantList).mockResolvedValue(Array(5).fill(["A", "B"]));
    await ProcessWantList(mockMessage);

    const endCallback = mockCollector.on.mock.calls.find(c => c[0] === "end")[1];
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
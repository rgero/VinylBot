import { describe, expect, it, vi } from "vitest";

import { ProcessList } from "../../src/discord/ProcessList.js";
import { getAlbumList } from "../../src/google/GetAlbumList.js";

vi.mock("../../src/google/GetAlbumList.js", () => ({ getAlbumList: vi.fn() }));

describe("ProcessList Unified Component", () => {
  
  // Running the same suite for both 'want' and 'have'
  ["want", "have"].forEach((listMode) => {
    it(`should correctly display the ${listMode} list title`, async () => {
      const mockMessage = {
        content: `!${listMode}list`,
        author: { id: "1" },
        reply: vi.fn().mockResolvedValue({ 
            createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn() }) 
        })
      };

      vi.mocked(getAlbumList).mockResolvedValue([["Artist", "Album"]]);

      await ProcessList(mockMessage, listMode);

      const expectedTitle = listMode === "want" ? "Want List" : "Have List";
      const replyCall = mockMessage.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toContain(expectedTitle);
    });
  });
});
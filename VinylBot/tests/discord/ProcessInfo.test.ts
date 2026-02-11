import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {ProcessInfo} from "../../src/discord/ProcessInfo.js"
import { getFullVinylsByQuery } from "../../src/services/vinyls.api.js";
import { getUserById } from "../../src/services/users.api.js";
import type { Message } from "discord.js";

vi.mock("../../src/services/vinyls.api.js");
vi.mock("../../src/services/users.api.js");

describe("ProcessInfo Command", () => {
  let mockMessage: Partial<Message>;
  let mockReply: Mock;
  let mockEdit: Mock;
  let mockDelete: Mock;
  let mockCollectorOn: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEdit = vi.fn().mockResolvedValue({});
    mockDelete = vi.fn().mockResolvedValue({});
    mockCollectorOn = vi.fn();

    mockReply = vi.fn().mockResolvedValue({
      edit: mockEdit,
      delete: mockDelete,
      createMessageComponentCollector: vi.fn().mockReturnValue({
        on: mockCollectorOn,
      }),
    });

    mockMessage = {
      content: "!info testing",
      reply: mockReply,
      author: { id: "123" } as any,
    } as unknown as Message;
  });

  it("should reply with 'Invalid query' if no arguments are provided", async () => {
    mockMessage.content = "!info";

    await ProcessInfo(mockMessage as Message);

    expect(mockReply).toHaveBeenCalledWith(
      expect.stringContaining("Invalid query")
    );
  });

  it("should display a single vinyl result", async () => {
    const mockVinyl = {
      artist: "Test Artist",
      album: "Test Album",
      owners: ["user1"],
    };

    (getFullVinylsByQuery as Mock).mockResolvedValue([mockVinyl]);
    (getUserById as Mock).mockResolvedValue({ name: "User One" });

    await ProcessInfo(mockMessage as Message);

    // Loading message sent
    expect(mockReply).toHaveBeenCalled();

    // Final embed edit called
    expect(mockEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("Test Artist"),
            }),
          }),
        ],
      })
    );

    expect(getFullVinylsByQuery).toHaveBeenCalledWith("testing");
    expect(getUserById).toHaveBeenCalledWith("user1");
  });

  it("should handle no results found", async () => {
    (getFullVinylsByQuery as Mock).mockResolvedValue([]);

    await ProcessInfo(mockMessage as Message);

    expect(mockEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("No matching records found"),
      })
    );
  });

  it("should create a component collector if multiple results are found", async () => {
    const mockVinyls = [
      { artist: "Artist 1", album: "Album 1", owners: [] },
      { artist: "Artist 2", album: "Album 2", owners: [] },
    ];

    (getFullVinylsByQuery as Mock).mockResolvedValue(mockVinyls);

    await ProcessInfo(mockMessage as Message);

    expect(mockCollectorOn).toHaveBeenCalled();
  });
});

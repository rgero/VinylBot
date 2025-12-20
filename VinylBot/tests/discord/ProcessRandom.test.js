import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogPlay } from "../../src/google/LogPlay.js";
import { ProcessRandom } from "../../src/discord/ProcessRandom.js";
import { getDropdownValue } from "../../src/utils/discordToDropdown.js";
import { getRandomRow } from "../../src/google/GetRandomRow.js";

// Mocks
vi.mock("../../src/google/GetRandomRow.js");
vi.mock("../../src/google/LogPlay.js");
vi.mock("../../src/utils/discordToDropdown.js");

describe("ProcessRandom", () => {
  let message;
  let sentMessage;
  let collector;

  beforeEach(() => {
    vi.clearAllMocks();

    collector = {
      on: vi.fn(),
      stop: vi.fn(),
    };

    sentMessage = {
      createMessageComponentCollector: vi.fn(() => collector),
      edit: vi.fn(),
    };

    message = {
      content: "!random",
      author: { id: "user1", username: "TestUser" },
      reply: vi.fn().mockResolvedValue(sentMessage),
    };

    getDropdownValue.mockImplementation((username) => username);
  });

  it("replies with a random row when getRandomRow returns data", async () => {
    getRandomRow.mockResolvedValue(["Artist1", "Album1"]);

    await ProcessRandom(message);

    expect(message.reply).toHaveBeenCalled();
    const firstCall = message.reply.mock.calls[0][0];
    expect(firstCall.embeds[0].title).toContain("🎲 Random Pick");
    
    const sent = message.reply.mock.calls[0][0];
    const actionRow = sent.components[0];
    const buttons = actionRow.components; // in discord.js v14, this is a plain array of ButtonBuilder
    expect(buttons[0].data.label).toBe("▶️ Play");
    expect(buttons[1].data.label).toBe("🔁 Reroll");
  });

  it("shows error if getRandomRow returns null", async () => {
    getRandomRow.mockResolvedValue(null);

    await ProcessRandom(message);

    expect(message.reply).toHaveBeenCalledWith("❌ No matching entries found.");
  });

  it("logs a play when play button is pressed", async () => {
    getRandomRow.mockResolvedValue(["Artist1", "Album1"]);

    await ProcessRandom(message);

    // simulate play button interaction
    const interaction = {
      user: { id: "user1" },
      customId: "play",
      update: vi.fn(),
      followUp: vi.fn(),
    };

    const collectCallback = collector.on.mock.calls.find(
      (call) => call[0] === "collect"
    )[1];

    await collectCallback(interaction);

    expect(LogPlay).toHaveBeenCalledWith("Artist1", "Album1", "TestUser");
    expect(interaction.update).toHaveBeenCalledWith({
      embeds: expect.any(Array),
      components: [],
    });
    expect(interaction.followUp).toHaveBeenCalledWith({
      content: "▶️ **Play logged:** Artist1 — *Album1*",
    });
  });

  it("rerolls when reroll button is pressed", async () => {
    getRandomRow
      .mockResolvedValueOnce(["Artist1", "Album1"])
      .mockResolvedValueOnce(["Artist2", "Album2"]);

    await ProcessRandom(message);

    const interaction = {
      user: { id: "user1" },
      customId: "reroll",
      update: vi.fn(),
      reply: vi.fn(),
    };

    const collectCallback = collector.on.mock.calls.find(
      (call) => call[0] === "collect"
    )[1];

    await collectCallback(interaction);

    expect(interaction.update).toHaveBeenCalledWith({
      embeds: expect.any(Array),
      components: expect.any(Array),
    });

    const newEmbed = interaction.update.mock.calls[0][0].embeds[0];
    expect(newEmbed.description).toContain("Artist2");
  });

  it("prevents other users from using buttons", async () => {
    getRandomRow.mockResolvedValue(["Artist1", "Album1"]);
    await ProcessRandom(message);

    const interaction = {
      user: { id: "otherUser" },
      customId: "play",
      reply: vi.fn(),
    };

    const collectCallback = collector.on.mock.calls.find(
      (call) => call[0] === "collect"
    )[1];

    await collectCallback(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You can't use these buttons.",
      ephemeral: true,
    });
  });
});

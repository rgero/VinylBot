import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  parseCommandMock,
  resolveUserMapMock,
  getVinylsMock,
  getDropdownValueMock,
  getNameByIdMock,
} = vi.hoisted(() => ({
  parseCommandMock: vi.fn(),
  resolveUserMapMock: vi.fn(),
  getVinylsMock: vi.fn(),
  getDropdownValueMock: vi.fn(),
  getNameByIdMock: vi.fn(),
}));

vi.mock("../../src/utils/parseCommand.js", () => ({
  parseCommand: parseCommandMock,
}));

vi.mock("../../src/utils/resolveUserMap.js", () => ({
  resolveUserMap: resolveUserMapMock,
}));

vi.mock("../../src/services/vinyls.api.js", () => ({
  getVinyls: getVinylsMock,
}));

vi.mock("../../src/services/users.api.js", () => ({
  getNameById: getNameByIdMock,
}));

vi.mock("../../src/utils/discordToDropdown.js", () => ({
  getDropdownValue: getDropdownValueMock,
}));

import { ProcessCost } from "../../src/discord/ProcessCost";

describe("ProcessCost", () => {
  const createMessage = (userIds: string[] = []) => ({
    author: { id: "discord-requester", username: "requester" },
    mentions: {
      users: {
        filter: (predicate: (user: { bot: boolean }) => boolean) =>
          new Map(userIds.map((id) => [id, { bot: false }]).filter(([, user]) => predicate(user))),
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
  } as any);

  const withContext = (context: Record<string, unknown> = {}) =>
    parseCommandMock.mockResolvedValue({
      ok: true,
      context: { mentions: [], flags: {}, query: "", ...context },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    resolveUserMapMock.mockResolvedValue(new Map([["requester", ["uuid-requester"]]]));
    getDropdownValueMock.mockReturnValue("requester");
    getNameByIdMock.mockResolvedValue("Alice");
    getVinylsMock.mockResolvedValue([
      { price: 60, owners: ["uuid-mentioned"], purchasedBy: ["uuid-mentioned", "uuid-other"] },
      { price: 30, owners: ["uuid-other"], purchasedBy: ["uuid-mentioned"] },
      { price: 15, owners: ["uuid-requester"], purchasedBy: ["uuid-requester"] },
    ]);
  });

  it("calculates owned and spent totals for the mentioned user", async () => {
    withContext({ mentions: ["uuid-mentioned"] });
    const message = createMessage(["discord-mentioned"]);

    await ProcessCost(message);

    expect(message.reply).toHaveBeenCalledWith(
      "💰 Alice's Collection Total: $60.00\n💸 Spent Total: $60.00",
    );
    expect(getNameByIdMock).toHaveBeenCalledWith("uuid-mentioned");
    expect(resolveUserMapMock).not.toHaveBeenCalled();
  });

  it("rejects multiple user mentions", async () => {
    withContext({ mentions: ["uuid-mentioned", "uuid-other"] });
    const message = createMessage(["discord-mentioned", "discord-other"]);

    await ProcessCost(message);

    expect(message.reply).toHaveBeenCalledWith("❌ Please mention only one user.");
    expect(getVinylsMock).not.toHaveBeenCalled();
  });

  it.each([{ mine: true }, { household: true }])(
    "rejects a user mention combined with conflicting flags",
    async (flags) => {
      withContext({ mentions: ["uuid-mentioned"], flags });
      const message = createMessage(["discord-mentioned"]);

      await ProcessCost(message);

      expect(message.reply).toHaveBeenCalledWith(
        "❌ A user mention can't be combined with `--mine` or `--household`.",
      );
      expect(getVinylsMock).not.toHaveBeenCalled();
    },
  );

  it("does not fall back to requester totals when a mentioned user is unmapped", async () => {
    withContext({});
    const message = createMessage(["discord-unmapped"]);

    await ProcessCost(message);

    expect(message.reply).toHaveBeenCalledWith(
      "⚠️ The mentioned user is not registered or could not be mapped to a user.",
    );
    expect(resolveUserMapMock).not.toHaveBeenCalled();
    expect(getVinylsMock).not.toHaveBeenCalled();
  });

  it("preserves requester totals when there is no mention", async () => {
    withContext();
    const message = createMessage();

    await ProcessCost(message);

    expect(message.reply).toHaveBeenCalledWith(
      "💰 Your Collection Total: $15.00\n💸 Spent Total: $15.00",
    );
  });

  it("preserves household totals when there is no mention", async () => {
    withContext({ flags: { household: true } });
    const message = createMessage();

    await ProcessCost(message);

    expect(message.reply).toHaveBeenCalledWith(
      "💰 Household Total: $105.00\n💸 Spent Total: $105.00",
    );
  });
});

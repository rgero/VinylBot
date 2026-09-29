import { CommandContext, parseCommand } from "../utils/parseCommand.js";

import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { UUID } from "node:crypto";
import { Vinyl } from "../interfaces/Vinyl.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getLastPlayedDates } from "../services/plays.api.js";
import { getNameById } from "../services/users.api.js";
import { getVinylsBySearchQuery } from "../services/vinyls.api.js";
import { parseTagsFlag } from "../utils/tagFilters.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

type StaleVinyl = Vinyl & { lastPlayed: Date | null };

export const ProcessStale = async (message: Message) => {
  const parsed = await parseCommand(message);
  if (!parsed.ok) {
    if (parsed.error) await message.reply(`❌ ${parsed.error}`);
    return;
  }
  const context: CommandContext = parsed.context;
  const { mentions, query, flags } = context;

  if (flags.mine && mentions.length > 0) {
    return message.reply("❌ `--mine` can't be combined with a mention.");
  }

  if (mentions.length > 1) {
    return message.reply("❌ Please mention only one user.");
  }

  let targetID: UUID | undefined;

  if (flags.mine) {
    const userMap = await resolveUserMap();
    const requesterName = getDropdownValue(message.author.username, message.author.id).toLowerCase();
    targetID = (userMap.get(requesterName) as UUID[] | undefined)?.[0];

    if (!targetID) {
      return message.reply("⚠️ You are not registered, so I can't filter by your plays.");
    }
  } else if (mentions.length === 1) {
    targetID = mentions[0];
  }

  try {
    const tags = parseTagsFlag(flags.tags);

    const [vinyls, lastPlayedDates] = await Promise.all([
      getVinylsBySearchQuery({ search: query || undefined, tags }),
      getLastPlayedDates(targetID ? [targetID] : undefined),
    ]);

    if (!vinyls.length) {
      return message.reply("❌ No vinyls found.");
    }

    const staleVinyls: StaleVinyl[] = vinyls
      .map((vinyl) => ({
        ...vinyl,
        lastPlayed: (vinyl.id !== undefined ? lastPlayedDates.get(vinyl.id) : undefined) ?? null,
      }))
      .sort((a, b) => {
        if (!a.lastPlayed && !b.lastPlayed) return a.artist.localeCompare(b.artist);
        if (!a.lastPlayed) return -1;
        if (!b.lastPlayed) return 1;
        return a.lastPlayed.getTime() - b.lastPlayed.getTime();
      });

    const targetName = targetID ? await getNameById(targetID) : null;

    const titleParts = ["Longest Since Played"];
    if (targetName) titleParts.push(`for ${targetName}`);
    if (tags.length) titleParts.push(`tagged ${tags.join(", ")}`);

    return await EmbeddedResponse({
      message,
      title: `${titleParts.join(" ")} (${staleVinyls.length} total)`,
      list: staleVinyls,
      formatItem: (item, idx) => {
        const played = item.lastPlayed
          ? `<t:${Math.floor(item.lastPlayed.getTime() / 1000)}:R>`
          : "Never played";
        return `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)} — ${played}`;
      },
      color: 0x9b59b6,
    });
  } catch (error) {
    console.error("ProcessStale Error:", error);
    return message.reply("❌ An error occurred while fetching vinyl data.");
  }
};

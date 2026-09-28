import { ComponentType, Message } from "discord.js";
import { attachRandomAlbumCollector, buildAlbumEmbed, buildAlbumRow, getRandomItem } from "./utils/randomAlbumUtils.js";

import { CommandContext } from "../../utils/parseCommand.js";
import { PlayLog } from "../../interfaces/PlayLog.js";
import { User } from "../../interfaces/User.js";
import { Vinyl } from "../../interfaces/Vinyl.js";
import { addPlayLog } from "../../services/plays.api.js";
import { getDropdownValue } from "../../utils/discordToDropdown.js";
import { getUnplayedVinyls } from "../../services/vinyls.api.js";
import { getUserById, getUserByName } from "../../services/users.api.js";
import { parseTagsFlag } from "../../utils/tagFilters.js";

export const ProcessRandomUnplayedAlbum = async (message: Message, context: CommandContext) => {
  try {
    const { query, mentions, flags } = context;

    if (mentions && mentions.length > 1) {
      await message.reply("❌ Can only have 1 mention");
      return;
    }

    const isMention = mentions?.length === 1;
    const targetUser: User | null = isMention
      ? await getUserById(mentions[0])
      : await getUserByName(getDropdownValue(message.author.username, message.author.id));

    if (!targetUser) {
      return message.reply("❌ No matching user profile found for logging.");
    }

    const tags = parseTagsFlag(flags?.tags);
    const vinyls = await getUnplayedVinyls(targetUser.id, query || undefined, undefined, tags);
    const owner = isMention ? `${targetUser.name}'s` : "Your";
    const titleSuffix = `Random Pick from ${owner} Unplayed${tags.length ? " by Tags" : ""}`;

    if (!vinyls || vinyls.length === 0) {
      const msg = query
        ? `❌ No entries found matching "${query}".`
        : tags.length
          ? `❌ No unplayed entries found with tags "${tags.join(", ")}".`
          : "❌ The requested collection is empty.";
      return message.reply(msg);
    }

    let currentVinyl = getRandomItem(vinyls);
    const sentMessage = await message.reply({
      embeds: [buildAlbumEmbed(currentVinyl, titleSuffix)],
      components: [buildAlbumRow({ showPlay: true })],
    });

    attachRandomAlbumCollector({
      sentMessage,
      message,
      getCurrentVinyl: () => currentVinyl,
      setCurrentVinyl: (vinyl) => {
        currentVinyl = vinyl;
      },
      vinyls,
      title: titleSuffix,
      targetUser,
    });
  } catch (err) {
    console.error("Error in ProcessRandomUnplayedAlbum:", err);
    await message.reply("❌ An unexpected error occurred.");
  }
};

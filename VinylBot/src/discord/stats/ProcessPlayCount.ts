import { getSortedPlaysByQuery, getTopPlayedAlbumsByUserID } from "../../services/plays.api.js";

import { EmbeddedResponse } from "../../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../../utils/escapeColons.js";
import { getNameById } from "../../services/users.api.js";
import { getVinylsByPlayCount } from "../../services/vinyls.api.js";
import { parseCommand } from "../../utils/parseCommand.js";

export const ProcessPlayCount = async (message: Message) => {
  try {
    const context = await parseCommand(message);
    if (!context) return;
    let { type, term } = context;
    
    let list = [];
    let titleSuffix = "";

    if (term) {
      term = term.replace(/^plays\s*/i, "").trim();
    }
    
    if (!term && type === "search") {
      type = "full"; 
    }

    switch (type) {
      case "user":
        const [userName, userList] = await Promise.all([getNameById(term),getTopPlayedAlbumsByUserID(term)]);
        list = userList;
        titleSuffix = `for ${userName}`;
        break;
      case "search":
        list = await getSortedPlaysByQuery(term);
        titleSuffix = `matching "${term}"`;
        break;

      default:
        list = await getVinylsByPlayCount();
        titleSuffix = "(All Time)";
        break;
    }

    if (!list || list.length === 0) {
      return await message.reply(`⚠️ No plays found ${titleSuffix}.`);
    }

    await EmbeddedResponse({
      message,
      title: `Top Albums by Play Count ${titleSuffix}`.trim(),
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.title)}** — ${item.count} plays`
    });

  } catch (error) {
    console.error("Error in ProcessPlayCount:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
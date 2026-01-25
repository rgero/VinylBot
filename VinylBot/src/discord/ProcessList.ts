import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getNameById } from "../services/users.api.js";
import { getVinylsByQuery } from "../services/vinyls.api.js";
import { getWantList } from "../services/wantlist.api.js";
import { parseCommand } from "../utils/parseCommand.js";

export const ProcessList = async (message: Message, listType: 'want' | 'have') => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  let { type, term } = await parseCommand(args);

  try {
    let displayTerm = term; 
    if (type === "user") {
      const resolvedName = await getNameById(term);
      displayTerm = resolvedName ?? "Unknown User";
    }

    const list = listType === 'have' ? await getVinylsByQuery({ type, term }) : await getWantList({ type, term });

    const listName = listType === "want" ? "Want List" : "Collection";
    const title = type === "full" ? `The ${listName}` : `${listName} matches for "${displayTerm}"`;

    await EmbeddedResponse({
      message,
      title,
      list,
      formatItem: (item, idx) => `${idx + 1}. **${escapeColons(item.artist)}** - ${escapeColons(item.album)}`,
      color: listType === "want" ? 0x3498db : 0x1db954,
    });

  } catch (error) {
    console.error("Error in ProcessList:", error);
    await message.reply("⚠️ An error occurred while fetching the list from the database.");
  }
};
import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons";
import { getVinylsByPlayCount } from "../services/vinyls.api";

export const ProcessPlayCount = async (message: Message) => {
  try {
    const list = await getVinylsByPlayCount();
    await EmbeddedResponse({
      message,
      title: "Top Albums by Play Count",
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.artist)}** - **${escapeColons(item.album)}** - ${item.playCount}`
    });
  } catch (error) {
    console.error("Error in ProcessPlayCount:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
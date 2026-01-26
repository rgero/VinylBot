import { AlbumCount } from "../interfaces/AlbumCount.js";
import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getArtistVinylCounts } from "../services/vinyls.api.js";

export const ProcessTop = async (message: Message) => {
  try {
    const list: AlbumCount[] = await getArtistVinylCounts();
    await EmbeddedResponse({
      message,
      title: "Top Artists by Album Count",
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.artist)}** - ${item.count}`
    });
  } catch (error) {
    console.error("Error in ProcessTop:", error);
    await message.reply("⚠️ An error occurred while fetching the list.");
  }
};
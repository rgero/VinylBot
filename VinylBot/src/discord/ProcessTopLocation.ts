import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons";
import { getLocationsByPurchaseCount } from "../services/locations.api";

export const ProcessTopLocation = async (message: Message) => {
  try {
    const list = await getLocationsByPurchaseCount();
    await EmbeddedResponse({
      message,
      title: "Top Locations by Album Count",
      list,
      formatItem: (item, idx) => 
        `${idx + 1}. **${escapeColons(item.name)}** - ${item.purchaseCount}`
    });
  } catch (error) {
    console.error("Error in ProcessTopLocation:", error);
    await message.reply("⚠️ An error occurred while fetching locations.");
  }
};
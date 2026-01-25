import { EmbeddedResponse } from "../utils/discord/EmbeddedResponse.js";
import { Message } from "discord.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getLocationsByPurchaseCount } from "../services/locations.api.js";

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
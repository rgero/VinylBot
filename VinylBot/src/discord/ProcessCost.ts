import { Message } from "discord.js";
import { Vinyl } from "../interfaces/Vinyl.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getVinyls } from "../services/vinyls.api.js";
import { parseCommand } from "../utils/parseCommand";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const ProcessCost = async (message: Message) => {
  try {
    const parsed = await parseCommand(message);
    if (!parsed.ok) {
      if (parsed.error) await message.reply(`❌ ${parsed.error}`);
      return;
    }
    const { flags } = parsed.context;
    const isHousehold = Boolean(flags.household);

    const vinyls: Vinyl[] = await getVinyls();

    let ownershipTotal: number = 0;
    let spentTotal: number = 0;

    if (isHousehold) {
      ownershipTotal = vinyls.reduce((acc, v) => acc + (v.price ?? 0), 0);
      spentTotal = vinyls.filter(v => (v.purchasedBy?.length ?? 0) > 0).reduce((acc, v) => acc + (v.price ?? 0), 0);
    } else {
      // Database ID
      const userMap = await resolveUserMap();
      const requesterName = getDropdownValue(message.author.username, message.author.id).toLowerCase();
      const requesterIds = userMap.get(requesterName);

      if (!requesterIds?.length) {
        await message.reply("⚠️ You are not registered or your Discord username could not be mapped to a user.");
        return;
      }
      
      ownershipTotal = vinyls.filter(v => v.owners.includes(requesterIds[0])).reduce((acc, v) => acc + (v.price ?? 0), 0);
      spentTotal = vinyls.filter(v => {
        return v.purchasedBy?.includes(requesterIds[0]);
      }).reduce((acc, v) => acc + ((v.price ?? 0) / (v.purchasedBy?.length ?? 1)), 0);
    }

    const totalLabel = isHousehold ? "Household Total" : "Your Collection Total";
    return message.reply(`💰 ${totalLabel}: $${ownershipTotal.toFixed(2)}\n💸 Spent Total: $${spentTotal.toFixed(2)}`);
  } catch (error) {
    console.error("Error occurred while fetching vinyls:", error);
  }
}
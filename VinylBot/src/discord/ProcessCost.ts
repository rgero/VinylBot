import { Message } from "discord.js";
import { Vinyl } from "../interfaces/Vinyl.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getNameById } from "../services/users.api.js";
import { getVinyls } from "../services/vinyls.api.js";
import { parseCommand } from "../utils/parseCommand.js";
import { resolveUserMap } from "../utils/resolveUserMap.js";

export const ProcessCost = async (message: Message) => {
  try {
    const parsed = await parseCommand(message);
    if (!parsed.ok) {
      if (parsed.error) await message.reply(`❌ ${parsed.error}`);
      return;
    }
    const { mentions, flags } = parsed.context;
    const userMentions = message.mentions.users.filter(user => !user.bot);
    const hasMention = userMentions.size > 0 || mentions.length > 0;

    if (userMentions.size > 1 || mentions.length > 1) {
      await message.reply("❌ Please mention only one user.");
      return;
    }

    if (hasMention && (flags.household || flags.mine)) {
      await message.reply("❌ A user mention can't be combined with `--mine` or `--household`.");
      return;
    }

    if (hasMention && mentions.length === 0) {
      await message.reply("⚠️ The mentioned user is not registered or could not be mapped to a user.");
      return;
    }

    const isHousehold = Boolean(flags.household);

    const [vinyls, mentionedUserName] = await Promise.all([
      getVinyls(),
      hasMention ? getNameById(mentions[0]) : Promise.resolve(null),
    ]);

    let ownershipTotal: number = 0;
    let spentTotal: number = 0;

    if (isHousehold) {
      ownershipTotal = vinyls.reduce((acc, v) => acc + (v.price ?? 0), 0);
      spentTotal = vinyls.filter(v => (v.purchasedBy?.length ?? 0) > 0).reduce((acc, v) => acc + (v.price ?? 0), 0);
    } else {
      let targetId: string | undefined = mentions[0];
      if (!targetId) {
        const userMap = await resolveUserMap();
        const requesterName = getDropdownValue(message.author.username, message.author.id).toLowerCase();
        const requesterIds = userMap.get(requesterName);

        if (!requesterIds?.length) {
          await message.reply("⚠️ You are not registered or your Discord username could not be mapped to a user.");
          return;
        }
        targetId = requesterIds[0];
      }
      
      ownershipTotal = vinyls.filter(v => v.owners.includes(targetId)).reduce((acc, v) => acc + ((v.price ?? 0) / (v.owners?.length ?? 1)), 0);
      spentTotal = vinyls.filter(v => {
        return v.purchasedBy?.includes(targetId);
      }).reduce((acc, v) => acc + ((v.price ?? 0) / (v.purchasedBy?.length ?? 1)), 0);
    }

    const totalLabel = isHousehold ? "Household Total" : hasMention ? `${mentionedUserName ?? "Mentioned User"}'s Collection Total` : "Your Collection Total";
    return message.reply(`💰 ${totalLabel}: $${ownershipTotal.toFixed(2)}\n💸 Spent Total: $${spentTotal.toFixed(2)}`);
  } catch (error) {
    console.error("Error occurred while fetching vinyls:", error);
  }
}
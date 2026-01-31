import {ActionRowBuilder, ComponentType, EmbedBuilder, Message, StringSelectMenuBuilder} from "discord.js";

import type { Vinyl } from "../interfaces/Vinyl.js";
import { getFullVinylsByQuery } from "../services/vinyls.api.js";

const limit = (str: string | undefined | null, max: number) => {
  if (!str) return "—";
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
};

const buildVinylEmbed = (vinyl: Vinyl) => {
  return new EmbedBuilder()
    .setTitle(limit(`${vinyl.artist} — ${vinyl.album}`, 256))
    .setColor(0x8b5cf6)
    .setThumbnail(vinyl.imageUrl || null)
    .addFields(
      {
        name: "Purchased",
        value: limit(
          `${vinyl.purchaseDate}${vinyl.purchaseLocation ? ` @ ${vinyl.purchaseLocation.name}` : ""}`,
          1024
        ),
      },
      {
        name: "Play Count",
        value: vinyl.playCount?.toString() ?? "0",
        inline: true,
      },
      {
        name: "Length",
        value: vinyl.length ? `${vinyl.length} min` : "Unknown",
        inline: true,
      },
      {
        name: "Notes",
        value: limit(vinyl.notes, 1024),
      }
    )
    .setFooter({
      text: vinyl.doubleLP ? "💿 Double LP" : "💿 Single LP",
    });
};

const ProcessMultiple = async (message: Message, data: Vinyl[]) => {
  // Discord select menus allow a max of 25 options
  const options = data.slice(0, 25).map((row, i) => ({
    label: limit(`${row.artist} - ${row.album}`, 100),
    value: i.toString(),
  }));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select_album")
      .setPlaceholder("Choose an album...")
      .addOptions(options)
  );

  const reply = await message.reply({
    content: "Multiple matches found. Please select one:",
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    max: 1, // Auto-stops after one selection
    time: 60_000, // 60 second timeout
  });

  collector.on("collect", async (int) => {
    // Basic security check: only the person who ran the command can use the menu
    if (int.user.id !== message.author.id) {
      return int.reply({ content: "This menu is not for you!", ephemeral: true });
    }

    try {
      const selected = data[parseInt(int.values[0])];

      if (!selected) {
        throw new Error("Could not find the selected vinyl data.");
      }

      const embed = buildVinylEmbed(selected);

      await int.update({
        content: "✅ Record found:",
        embeds: [embed],
        components: [],
      });
    } catch (e: any) {
      await int.update({
        content: `❌ Error: ${e.message}`,
        components: [],
      });
    }
  });

  // Handle timeout cleanup
  collector.on("end", async (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      await reply.edit({ 
        content: "⚠️ Selection timed out. Please run the command again.", 
        components: [] 
      }).catch(() => null); // Catch error if message was deleted
    }
  });
};

export const ProcessInfo = async (message: Message) => {
  const args = message.content.split(" ").slice(1);

  if (args.length === 0) {
    return message.reply("Invalid query. Usage: `!info {search query}`");
  }

  const term = args.join(" ");

  try {
    const vinyls = await getFullVinylsByQuery(term);

    if (!vinyls || vinyls.length === 0) {
      return message.reply(`No matching records found for "${term}".`);
    }

    if (vinyls.length === 1) {
      const embed = buildVinylEmbed(vinyls[0]);
      return message.reply({ embeds: [embed] });
    }
    
    return ProcessMultiple(message, vinyls);

  } catch (error) {
    console.error("Vinyl API Error:", error);
    return message.reply("There was an error fetching the vinyl data. Please try again later.");
  }
};
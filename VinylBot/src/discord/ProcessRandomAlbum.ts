import {ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message, MessageActionRowComponentBuilder} from "discord.js";
import { getVinyls, getVinylsByQuery, getVinylsLikedByUserID } from "../services/vinyls.api.js";

import { PlayLog } from "../interfaces/PlayLog.js";
import { SearchResponse } from "../interfaces/SearchResponse.js";
import { User } from "../interfaces/User.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getDropdownValue } from "../utils/discordToDropdown.js";
import { getUserByName } from "../services/users.api.js";
import { processNewPlay } from "../actions/processNewPlay.js";

const buildEmbed = (artist: string, album: string) => {
  const description = `🎵 **${artist}**\n💿 *${album}*`;
  return {
    title: "🎲 Random Pick",
    description: escapeColons(description),
    color: 0x5865f2,
  };
};

const buildRow = ({ showPlay, disabled = false }: { showPlay: boolean; disabled?: boolean }) => {
  const buttons = [];

  if (showPlay) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("play")
        .setLabel("▶️ Play")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("reroll")
      .setLabel("🔁 Reroll")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons);
};

const getRandomVinyl = (list: SearchResponse[]): SearchResponse => {
  return list[Math.floor(Math.random() * list.length)];
};

export const ProcessRandomAlbum = async (message: Message) => {
  try {
    const args = message.content.split(/\s+/).slice(1);
    const param = args[0]?.toLowerCase().trim();

    let targetUser: User | null = null;
    let vinyls: SearchResponse[] = [];

    if (param) {
      targetUser = await getUserByName(param);
      
      if (targetUser) {
        // User found: get their liked vinyls
        vinyls = (await getVinylsLikedByUserID(targetUser.id)) as SearchResponse[];
      } else {
        // Not a username: treat as a general search query
        const searchTerm = args.join(" ");
        vinyls = await getVinylsByQuery({ type: "search", term: searchTerm });
        // Default the "logging" user to the person who sent the message
        targetUser = await getUserByName(getDropdownValue(message.author.username));
      }
    } else {
      // No params: get everything and default to author
      targetUser = await getUserByName(getDropdownValue(message.author.username));
      vinyls = (await getVinyls()) as SearchResponse[];
    }

    if (!targetUser) {
      return message.reply("❌ No matching user profile found for logging.");
    }

    if (!vinyls || vinyls.length === 0) {
      return message.reply("❌ No matching entries found.");
    }

    let currentVinyl = getRandomVinyl(vinyls);
    const sentMessage = await message.reply({
      embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album)],
      components: [buildRow({ showPlay: true })],
    });

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      // Basic security check
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "You can't use these buttons.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "play") {
        collector.stop("played");

        await interaction.update({
          components: [],
        });

        if (!currentVinyl || !currentVinyl.id) {
          await interaction.followUp({ content: "⚠️ Album was selected, but I couldn't log the play." });
          return;
        }

        const newPlay: PlayLog = {
          album_id: currentVinyl.id,
          listeners: [targetUser!.id],
          date: new Date(),
        };

        try {
          await processNewPlay(newPlay);
          await interaction.followUp({
            content: `▶️ **Play logged for ${targetUser!.name}:** ${currentVinyl.artist} — *${currentVinyl.album}*`,
          });
        } catch (playErr) {
          console.error("Failed to log play:", playErr);
          await interaction.followUp({ content: "⚠️ Album was selected, but I couldn't log the play." });
        }
      }

      if (interaction.customId === "reroll") {
        // Prevent infinite loop if only one vinyl exists
        if (vinyls.length > 1) {
          let nextVinyl;
          do {
            nextVinyl = getRandomVinyl(vinyls);
          } while (nextVinyl.album === currentVinyl.album);
          currentVinyl = nextVinyl;
        }

        await interaction.update({
          embeds: [buildEmbed(currentVinyl.artist, currentVinyl.album)],
          components: [buildRow({ showPlay: true })],
        });
      }
    });

    collector.on("end", (_collected, reason) => {
      // If the user clicked "Play", buttons are already handled
      if (reason === "played") return;

      sentMessage.edit({
          components: [buildRow({ showPlay: true, disabled: true })],
        }).catch(() => {
          /* Message likely deleted, ignore */
        });
    });
  } catch (err) {
    console.error("Error in ProcessRandomAlbum:", err);
    await message.reply("❌ Failed to fetch random entry.");
  }
};
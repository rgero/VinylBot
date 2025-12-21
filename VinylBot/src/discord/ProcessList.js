import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";

import { escapeColons } from "../utils/escapeColons.js";
import { getAlbumList } from "../google/GetAlbumList.js";
import { isInList } from "../utils/userParser.js";

const parseCommand = (messageArgs) => {
  const words = messageArgs.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { type: "full", term: "" };
  if (words.length === 1 && isInList(words[0])) return { type: "user", term: words[0] };
  return { type: "search", term: messageArgs };
};

const generateEmbed = (list, page, totalPages, type, term, listType, pageSize = 10) => {
  const start = page * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  const description = pageItems
    .map((item, idx) => `${start + idx + 1}. ${escapeColons(item[0])} - ${escapeColons(item[1])}`)
    .join("\n");

  const listName = listType === "want" ? "Want List" : "Have List";
  const title = type === "full"
      ? `The ${listName} (Page ${page + 1}/${totalPages})`
      : `The ${listName} for "${term}" (Page ${page + 1}/${totalPages})`;

  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x1db954);
};

const generateRow = (currentPage, totalPages) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1)
  );

export const ProcessList = async (message, listType) => {
  const args = message.content.split(" ").slice(1).join(" ").trim();
  const { type, term } = parseCommand(args);

  const list = await getAlbumList(listType, { type, term });

  if (!list.length) {
    message.reply(`❌ There's nothing on the ${listType} list.`);
    return;
  }

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(list.length / PAGE_SIZE);
  let currentPage = 0;

  const sentMessage = await message.reply({
    embeds: [generateEmbed(list, currentPage, totalPages, type, term, listType, PAGE_SIZE)],
    components: [generateRow(currentPage, totalPages)],
  });

  const collector = sentMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      interaction.reply({ content: "You can't control this pagination.", ephemeral: true });
      return;
    }

    if (interaction.customId === "prev") currentPage--;
    else if (interaction.customId === "next") currentPage++;

    await interaction.update({
      embeds: [generateEmbed(list, currentPage, totalPages, type, term, listType, PAGE_SIZE)],
      components: [generateRow(currentPage, totalPages)],
    });
  });

  collector.on("end", () => {
    const disabledRow = generateRow(currentPage, totalPages);
    disabledRow.components.forEach((btn) => btn.setDisabled(true));
    sentMessage.edit({ components: [disabledRow] }).catch(() => {});
  });
};
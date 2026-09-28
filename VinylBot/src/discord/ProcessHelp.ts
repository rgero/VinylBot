import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message } from "discord.js";

export const ProcessHelp = async (message: Message) => {
  try {
    const collectionPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (1/4)")
      .setDescription("Here is the list of available commands for Vinyl Bot:\n\n**Database & Collection**")
      .addFields(
        { name: "Help", value: "`!help`: Shows this menu." },
        { name: "Add to Database", value: "`!add {spotify link}`: Adds the album to the database (finish details on the website)." },
        { 
          name: "Collection Management", 
          value: 
            "`!want {spotify link}`: Adds an album to the want list.\n" +
            "`!wantlist`: Gives you the whole want list.\n" +
            "`!wantlist {person}`: Gives you the want list of that person.\n" +
            "`!wantlist {search term}`: Gives you the want list items that match that term.\n" +
            "`!have`: Gives you the whole have list.\n" +
            "`!have {person}`: Gives you the have list of that person.\n" +
            "`!have {search term}`: Gives you the have list items that match that term."
        }
      );

    const playPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (2/4)")
      .setDescription("**Tracking & Lookups**")
      .addFields(
        { 
          name: "Tracking Playback", 
          value: 
            "`!play {spotify link} {user}`: Adds a play for that album.\n" +
            "`!play {artist OR album} {user}`: Adds a play for that album. (If multiple results, gives a dropdown).\n" +
            "*Note: Include a user mention to log multiple listeners.*" 
        },
        {
          name: "Discogs Lookup",
          value:
            "`!exists --artist {name} --album {name}`: Checks Discogs for a vinyl pressing.\n" +
            "`!exists {spotify link}`: Same check using artist/album from Spotify.",
        }
      );

    const infoPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (3/4)")
      .setDescription("**Discovery & Stats**")
      .addFields(
        {
          name: "Randomizer & Info",
          value:
            "`!random`: Chooses a random vinyl.\n" +
            "`!random {person}`: Chooses a random vinyl liked by that person.\n" +
            "`!random {term}`: Chooses a random vinyl based on that term.\n" +
            "`!random --low`: Chooses a random low-play vinyl; includes unplayed albums but uses the lowest positive play count to define the low-play pool.\n" +
            "`!random --store`: Chooses a random store.\n" +
            "`!random --tags {tags}`: Chooses a random vinyl matching any of the tags (combines with a person or term).\n" +
            "`!random --unplayed`: Chooses a random vinyl from your unplayed list.\n" +
            "`!random {person} --unplayed --tags {tags}`: Random unplayed vinyl for that person matching any of the tags.\n" +
            "`!random --low --tags {tags}`: Random low-play vinyl matching any of the tags.\n" +
            "`!info {album name}`: Gives you some info about the album."
        },
        { 
          name: "Playlogs & Statistics", 
          value: 
            "`!playlogs`: Gives you the list of playlogs.\n" +
            "`!playlog {id}`: Gives you the details of that playlog entry.\n" +
            "`!stats {user|artist}`: Top albums by play count.\n" +
            "`!stats --albums` / `--artists`: Returns top albums or artists.\n" +
            "`!stats --plays {user|artist}`: Returns top albums by play count.\n" +
            "`!stats --locations`: Returns locations sorted by album count.\n" +
            "`!stats --low`: Returns lowest-played albums.\n" +
            "`!tag {array of tags}`: Lists albums matching any of the specified tags.\n" +
            "`!unplayed`: Returns a list of unplayed albums in your collection.\n" +
            "`!unplayed --tags {tags}`: Unplayed albums matching any of the tags."
        }
      );

    const flagsPage = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Vinyl Bot Commands (4/4)")
      .setDescription("**Flags & Options**\nTags are comma-separated with no spaces, e.g. `--tags emo,punk`.")
      .addFields(
        {
          name: "Sorting",
          value:
            "`--sort {field}{+|-}`: Works with `!have`, `!wantlist`, `!tag` and `!unplayed`.\n" +
            "Fields: `artist`, `album`, `length`, `plays` (e.g. `--sort plays-`). Default is `artist+`."
        },
        {
          name: "Collection & Unplayed",
          value:
            "`!have --tags {tags}`: Have list items matching any of the tags.\n" +
            "`!unplayed {person}`: Unplayed albums for that person.\n" +
            "`!unplayed --count`: Unplayed album counts per user (ignores `--tags`).\n" +
            "`!unplayed --mine`: Only unplayed albums you own."
        },
        {
          name: "Random",
          value:
            "`!random --low --limit {n}`: Low-play pool is albums with at most `n` plays.\n" +
            "`!random --low --mine`: Uses your own play counts (can't be combined with a mention)."
        },
        {
          name: "Playlogs",
          value:
            "`!playlogs {person}`: Playlogs for that person.\n" +
            "`!playlogs --all`: Everyone's playlogs.\n" +
            "`!playlogs --count`: Total number of plays.\n" +
            "`!playlog --number {n}`: Playlog by its position in the list instead of its ID."
        },
        {
          name: "Stats",
          value:
            "`--mine`: Use your own plays/purchases (`--plays`, `--low`, `--artists`, `--locations`; not with a mention).\n" +
            "`--dir asc|desc`: Reverse the order (`--plays` defaults to desc, `--low` to asc).\n" +
            "`--count {n}`: `--plays`: albums with at least `n` plays; `--low`: at most `n`.\n" +
            "`--limit {n}`: `--low` only; albums with at most `n` plays."
        }
      )
      .setTimestamp();

    const pages = [collectionPage, playPage, infoPage, flagsPage];
    let currentPage = 0;

    const createButtons = (pageIndex: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️ Back")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0), // Disable if on the first page
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === pages.length - 1) // Disable if on the last page
      );
    };

    const helpMessage = await message.reply({
      embeds: [pages[currentPage]],
      components: [createButtons(currentPage)],
    });

    const collector = helpMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, 
    });

    collector.on("collect", async (interaction) => {
      // Security check: Only allow the person who ran the command to click buttons
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ 
          content: "❌ Run the `!help` command yourself to navigate the menu!", 
          ephemeral: true 
        });
        return;
      }

      // Handle pagination logic
      if (interaction.customId === "prev" && currentPage > 0) {
        currentPage--;
      } else if (interaction.customId === "next" && currentPage < pages.length - 1) {
        currentPage++;
      }

      // Update the original message with the new embed and adjusted button states
      await interaction.update({
        embeds: [pages[currentPage]],
        components: [createButtons(currentPage)],
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("◀️ Back").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("Next ▶️").setStyle(ButtonStyle.Primary).setDisabled(true)
      );

      // Try updating the message, ignore if the message was deleted by the user
      await helpMessage.edit({ components: [disabledRow] }).catch(() => null);
    });

  } catch (error) {
    console.error("Error in ProcessHelp:", error);
    await message.reply("⚠️ An error occurred while fetching the help menu.");
  }
};
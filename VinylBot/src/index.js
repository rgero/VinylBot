import "dotenv/config";

import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";

import { appendAlbumToSheet } from "./sheets.js";
import { parseSpotifyUrl } from "./parseSpotifyUrl.js";
import { spotifyGet } from "./spotify.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  const parsed = parseSpotifyUrl(message.content);
  if (!parsed) return; // Not a Spotify URL

  try {
    // Fetch data from Spotify
    const data = await spotifyGet(`${parsed.type}s/${parsed.id}`);

    const artists = data.artists?.map(a => a.name).join(", ") || "";
    const albumName = data.name || "";
    const albumArt = data.images?.[0]?.url || ""; // 640x640 image

    // Create Discord embed
    const embed = new EmbedBuilder()
      .setTitle(albumName)
      .setDescription(artists)
      .setColor(0x1db954) // Spotify green
      .setThumbnail(albumArt)
      .addFields(
        { name: "Release Date", value: data.release_date || "N/A", inline: true },
        { name: "Tracks", value: `${data.total_tracks || "N/A"}`, inline: true }
      )
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`);

    message.reply({ embeds: [embed] });

    // Get requester info
    const requester = `${message.author.username}#${message.author.discriminator}`;

    // Append to Google Sheet
    await appendAlbumToSheet(artists, albumName, albumArt, requester);

  } catch (err) {
    console.error(err);
    message.reply("❌ Failed to fetch Spotify data or write to Google Sheet.");
  }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);

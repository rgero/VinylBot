import { EmbedBuilder, Message } from "discord.js";

import { CheckAlbumExistence } from "../discogs/CheckAlbumExistence";
import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl";
import { escapeColons } from "../utils/escapeColons";
import { getSpotifyData } from "../spotify/getSpotifyData";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl";

export const ProcessCheckExists = async (message: Message) => {
  const args = message.content.split(" ").slice(1);

  if (args.length != 1) {
    return message.reply("Invalid query. Usage: `!exists {spotify link}`");
  }

  const parsed: SpotifyUrl | null = parseSpotifyUrl(args[0]);
  if (!parsed) return;

  try {
    await message.suppressEmbeds(true);
    const spotifyData = await getSpotifyData(parsed);
    
    const { artists, albumName, albumArt, releaseDate } = spotifyData;

    const exists = await CheckAlbumExistence(artists, albumName)

    const embed = new EmbedBuilder()
      .setTitle(`Does: ${escapeColons(albumName)} exist?`)
      .setDescription(escapeColons(artists))
      .setColor(0xf1c40f)
      .setThumbnail(albumArt)
      .setURL(`https://open.spotify.com/${parsed.type}/${parsed.id}`)
      .addFields(
        { name: "Release Date", value: releaseDate || "N/A", inline: true },
        { name: "Exists?", value: exists ? "✅ Yes" : "❌ No", inline: true }
      );

    await message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("ProcessCheckExists Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    message.reply(`❌ Error: ${errorMsg}`);
  }
};
import { EmbedBuilder, Message } from "discord.js";

import { CheckAlbumExistence } from "../discogs/CheckAlbumExistence.js";
import { SpotifyUrl } from "../interfaces/spotify/SpotifyUrl.js";
import { escapeColons } from "../utils/escapeColons.js";
import { getSpotifyData } from "../spotify/getSpotifyData.js";
import { parseSpotifyUrl } from "../spotify/parseSpotifyUrl.js";

export const ProcessCheckExists = async (message: Message) => {
  const args = message.content.split(" ").slice(1);
  try {
    let exists: boolean = false;
    let albumName: string = "";
    let artists: string = "";
    let albumArt: string = "";

    // Case 1: Spotify URL provided
    const spotifyURL: SpotifyUrl | null = parseSpotifyUrl(args[0]);
    if (spotifyURL)
    {
      await message.suppressEmbeds(true);
      const spotifyData = await getSpotifyData(spotifyURL);
      
      ({ artists, albumName, albumArt } = spotifyData);
      exists = await CheckAlbumExistence(artists, albumName)
    } else {
      // Case 2: Artist | Album provided.
      const queryString = args.join(" ");
      const match = queryString.match(/^(.+?)\s*\|\s*(.+)$/);

      if (!match) {
        return message.reply(
          "Please provide both artist and album name separated by ' | ', or include a Spotify link."
        );
      }

      [, artists, albumName] = match;
      exists = await CheckAlbumExistence(artists, albumName);
    }

    const embed = new EmbedBuilder()
      .setTitle(`Does: ${escapeColons(artists)} - ${escapeColons(albumName)} exist?`)
      .setColor(0xf1c40f)
      .setThumbnail(albumArt || "https://records.roymond.net/placeholder-album.png")
      .addFields(
        { name: "Exists?", value: exists ? "✅ Yes" : "❌ No", inline: true }
      );

    await message.reply({ embeds: [embed] });

  } catch (err) {
    console.error("ProcessCheckExists Error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    message.reply(`❌ Error: ${errorMsg}`);
  }
};
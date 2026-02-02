import { DiscogsClient } from "@lionralfs/discogs-client";
import { compareTwoStrings } from "string-similarity";

export const CheckAlbumExistence = async (artist: string, album: string): Promise<boolean> => {
  const client = new DiscogsClient({
    auth: {
      method: "discogs",
      consumerKey: process.env.DISCOG_KEY!,
      consumerSecret: process.env.DISCOG_SECRET!
    }
  });

  const db = client.database();

  const search = await db.search({
    query: `${artist} ${album}`,
    type: "master",
    per_page: 10
  });

  const results = search.data.results;
  if (!results.length) return false;

  const scoredResults = results.map(r => {
    const score = compareTwoStrings(`${artist} ${album}`.toLowerCase(), r.title.toLowerCase());
    return { ...r, score };
  });

  const bestMatches = scoredResults.filter(r => r.score > 0.4).sort((a, b) => b.score - a.score);

  for (const match of bestMatches) {
    const versionsRes = await db.getMasterVersions(match.id);
    const versions = versionsRes.data.versions;

    if (!versions) continue;

    const hasVinyl = versions.some(v => {
      const formatStr = (v.format || "").toLowerCase();
      const majorFormats = (v.major_formats || []).map(f => f.toLowerCase());
      const isVinyl = formatStr.includes("vinyl") || majorFormats.includes("vinyl");
      const isPromo = (v.title || "").toLowerCase().includes("promo");

      return isVinyl && !isPromo;
    });

    if (hasVinyl) return true;
  }

  return false;
};
import { DiscogsClient } from "@lionralfs/discogs-client";

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
    artist,
    release_title: album,
    type: "master"
  });

  if (!search.data.results.length) return false;

  const masterId = search.data.results[0].id;

  const versionsRes = await db.getMasterVersions(masterId);
  const versions = versionsRes.data.versions;

  if (!versions || versions.length === 0) return false;

  return versions.some(v => {
    const formatStr = (v.format || "").toLowerCase();
    const majorFormats = (v.major_formats || []).map(f => f.toLowerCase());

    const isVinyl = formatStr.includes("vinyl") || majorFormats.includes("vinyl");

    const isPromo = (v.title || "").toLowerCase().includes("promo");

    return isVinyl && !isPromo;
  });
};

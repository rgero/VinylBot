import { DiscogsClient } from "@lionralfs/discogs-client";

export const CheckAlbumExistence = async (artist: string, album: string): Promise<boolean> => {
  let client = new DiscogsClient({
    auth: {
        method: 'discogs',
        consumerKey: process.env.DISCOG_KEY,
        consumerSecret: process.env.DISCOG_SECRET,
    }
  });

  let db = client.database();
  const response = await db.search({query: album, artist: artist, format:"vinyl"});
    
  let found = false;
  for (const result of response.data.results) {
    if (result.format?.includes("Promo"))
    {
      continue;
    }

    if (result.barcode?.length === 0)
    {
      continue;
    }
    found = true;
  }

  return found;
}
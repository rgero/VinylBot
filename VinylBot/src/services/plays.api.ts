import { ItemCount } from "../interfaces/ItemCount.js";
import { PlayLog } from "../interfaces/PlayLog.js";
import { UUID } from "node:crypto";
import supabase from "./supabase.js";

type PlayLogAlbumRow = {
  album_id: number;
  vinyls?: { artist?: string; album?: string } | null;
};

/// Utility Functions
const aggregateAlbumCounts = (playLogs: PlayLogAlbumRow[]): ItemCount[] => {
  const albumCountMap: Record<number, ItemCount> = {};

  playLogs.forEach((p) => {
    const albumId = p.album_id;
    const artist = p.vinyls?.artist || "Unknown Artist";
    const album = p.vinyls?.album || "Unknown Album";

    if (albumCountMap[albumId]) {
      albumCountMap[albumId].count += 1;
    } else {
      albumCountMap[albumId] = {
        title: `${artist} - ${album}`,
        count: 1,
      };
    }
  });

  return Object.values(albumCountMap).sort((a, b) => b.count - a.count);
};

export const getPlayLogs = async (limit: number = 0): Promise<PlayLog[]> => {
  let query = supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)")
    .order("date", { ascending: false });

  if (limit > 0)
  {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching playlogs:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    ...p,
    artist: p.vinyls?.artist,
    album: p.vinyls?.album,
  }));
};

/// End of Utility Functions

export const getPlaylogByIndex = async (index: number): Promise<PlayLog | null> => {
  if (index < 1) return null;

  const { data, error } = await supabase
    .from("playlogs")
    .select("*, vinyls(artist, album, image_url)")
    .order("date", { ascending: true })
    .range(index - 1, index - 1);

  if (error) {
    console.error("Error fetching playlog:", error);
    return null;
  }

  const targetPlaylog = data?.[0];
  if (!targetPlaylog) return null;

  return {
    ...targetPlaylog,
    artist: targetPlaylog.vinyls?.artist,
    album: targetPlaylog.vinyls?.album,
    imageUrl: targetPlaylog.vinyls?.image_url
  };
};

export const getPlayLogByID = async (id: number): Promise<PlayLog|null> => {
  const { data, error } = await supabase.from("playlogs").select("*, vinyls(artist, album, image_url)").eq("id", id).single();

  if (error) {
    console.error("Error fetching playlogs:", error);
    return null;
  }

  const playlog = data;
  return {
    ...playlog,
    artist: playlog.vinyls?.artist,
    album: playlog.vinyls?.album,
    imageUrl: playlog.vinyls?.image_url
  }
}

export const getPlaylogsByUserIDs = async (userIDs: UUID[], limit: number = 0): Promise<PlayLog[]> => {
  let query = supabase
    .from("playlogs")
    .select("*, vinyls(artist, album)")
    .contains("listeners", userIDs)
    .order("date", { ascending: false });

    if (limit > 0)
    {
      query = query.limit(limit);
    }

  const {data, error} = await query;

  if (error) {
    console.error("Error fetching playlogs:", error);
    return [];
  }
  
  return (data ?? []).map((p) => ({
    ...p,
    artist: p.vinyls?.artist,
    album: p.vinyls?.album,
  }));
};

export const getLastPlayedDates = async (userIDs?: UUID[]): Promise<Map<number, Date>> => {
  let query = supabase.from("playlogs").select("album_id, date");

  if (userIDs?.length) {
    query = query.contains("listeners", userIDs);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching last played dates:", error);
    return new Map();
  }

  const lastPlayed = new Map<number, Date>();

  for (const row of data ?? []) {
    if (!row.date) continue;

    const played = new Date(row.date);
    if (Number.isNaN(played.getTime())) continue;

    const current = lastPlayed.get(row.album_id);
    if (!current || played > current) {
      lastPlayed.set(row.album_id, played);
    }
  }

  return lastPlayed;
};

export const addPlayLog = async (newPlayLog: PlayLog) => {
  const { error } = await supabase.from("playlogs").insert([
    {
      album_id: newPlayLog.album_id,
      listeners: newPlayLog.listeners,
      date: newPlayLog.date,
    },
  ]);

  if (error) {
    console.error("Error adding playlog:", error);
    throw error;
  }
};

export const getTopPlayedAlbumsByUserID = async (userID: string): Promise<ItemCount[]> => {
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls(artist, album)")
    .contains("listeners", [userID]);

  if (error) {
    console.error("Error fetching user plays:", error);
    return [];
  }

  return aggregateAlbumCounts((data as PlayLogAlbumRow[]) || []);
};

export const getSortedPlaysByQuery = async (query: string): Promise<ItemCount[]> => {
  // Uses websearch full-text search syntax (.wfts) inside the foreignTable filter
  // to natively ignore punctuation matching on artist/album strings
  const { data, error } = await supabase
    .from("playlogs")
    .select("album_id, vinyls!inner(artist, album)")
    .or(`artist.wfts.${query},album.wfts.${query}`, { foreignTable: "vinyls" });

  if (error) {
    console.error("Error fetching query plays:", error);
    return [];
  }

  return aggregateAlbumCounts((data as PlayLogAlbumRow[]) || []);
};

export const getTopArtistsByPlay = async (userID?: string): Promise<ItemCount[]> => {
  let playlogs: PlayLog[] = [];
  if (userID) {
    playlogs = await getPlaylogsByUserIDs([userID as UUID]);
  } else {
    playlogs = await getPlayLogs();
  }

  const counts = playlogs.reduce((acc: Record<string, number>, curr) => {
    const artist = curr.artist || "Unknown Artist";
    acc[artist] = (acc[artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([artistName, count]): ItemCount => ({ 
      title: artistName, 
      count 
    }))
    .sort((a, b) => b.count - a.count);
}
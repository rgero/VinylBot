import { AlbumCount } from "../interfaces/AlbumCount.js";
import { SearchResponse } from "../interfaces/SearchResponse.js";
import { Vinyl } from "../interfaces/Vinyl.js";
import { escapeColons } from "../utils/escapeColons.js";
import supabase from "./supabase.js";

/**
 * FETCHERS
*/
export const getVinyls = async (): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .order('artist', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const getVinylsLikedByUserID = async (userID: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .contains("likedBy", [userID]);

  if (error) throw error;
  return data ?? [];
};

export const getVinylsByQuery = async (query: { type: string; term: string }): Promise<SearchResponse[]> => {
  let dbQuery = supabase.from('vinyls').select('id, artist, album');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('owners', [query.term]);
  } else if (query.type === 'search') {
    dbQuery = dbQuery.or(`artist.ilike.%${query.term}%,album.ilike.%${query.term}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data ?? [];
};

export const getFullVinylsByQuery = async (term: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase.from('vinyls').select(`*, purchaseLocation:locations (name)`).ilike('album', `%${term}%`);
  if (error) throw error;
  return data ?? [];
}

export const getVinylID = async (artist: string, album: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("id")
    .ilike("artist", artist)
    .ilike("album", album)
    .maybeSingle();

  if (error) throw error;
  return data ? data.id : null;
};

export const getVinylByID = async (id: number): Promise<Vinyl|null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if (error) throw error;
  return data ? data : null;
}

export const getVinylByDetails = async (artist: string, album: string): Promise<Vinyl | null> => {
  const { data, error } = await supabase
    .from("vinyls")
    .select("*")
    .ilike("artist", artist)
    .ilike("album", album)
    .maybeSingle();

  if (error) throw error;
  return data ? data : null;
};

export const searchVinyls = async (term: string): Promise<SearchResponse[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('id, artist, album')
    .or(`artist.ilike.%${term}%,album.ilike.%${term}%`);

  if (error) throw error;
  return data ?? [];
};

/**
 * MUTATIONS
 */
export type AddStatus = "ADDED" | "DUPLICATE" | "ERROR";
export const addVinyl = async (newVinyl: Omit<Vinyl, 'id'>): Promise<AddStatus> => {
  const { data, error } = await supabase.rpc('insert_vinyl_with_number', { payload: newVinyl});
  if (error) {
    if (error.code === '23505') {
      return "DUPLICATE";
    }
    
    console.error("Supabase Error:", error.message);
    return "ERROR";
  }
  
  return "ADDED";
};

export const addVinyls = async (newVinyls: Omit<Vinyl, 'id'>[]): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .insert(newVinyls)
    .select();

  if (error) throw error;
  return data ?? [];
};

export const deleteVinyl = async (vinylId: string | number): Promise<void> => {
  const { error } = await supabase
    .from('vinyls')
    .delete()
    .eq('id', vinylId);

  if (error) throw error;
};

export const updateVinyl = async (vinylId: number, updatedVinyl: Partial<Vinyl>): Promise<Vinyl> => {
  const { data, error } = await supabase
    .from('vinyls')
    .update(updatedVinyl)
    .eq('id', vinylId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getArtistVinylCounts = async (): Promise<AlbumCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('artist')
  
  if (error) throw error;

  const counts = data.reduce((acc: Record<string, number>, curr) => {
    acc[curr.artist] = (acc[curr.artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
};

export const getVinylsByPlayCount = async (): Promise<AlbumCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('*').order('playCount', { ascending: false })
  if (error) throw error;
  
  return data.map(vinyl => ({ title: `${vinyl.artist} - ${vinyl.album}`, count: vinyl.playCount || 0 }));
};

export const getArtistVinylCountByUserId = async (userID: string): Promise<AlbumCount[]> => {
  const { data, error } = await supabase.from('vinyls').select('artist').contains('owners', [userID]);
  if (error) throw error;
  
  const counts = data.reduce((acc: Record<string, number>, curr) => {
    acc[curr.artist] = (acc[curr.artist] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
}
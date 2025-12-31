import { Vinyl } from "../interfaces/Vinyl";
import supabase from "./supabase";

export const getVinyls = async (): Promise<Vinyl[]> => {
  const { data, error } = await supabase.from('vinyls').select('*');
  if (error) console.error(error);

  return data ?? [];
}

export const getVinylsLikedByUserID = async (userID: string): Promise<Vinyl[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('*')
    .contains("likedBy", [userID]);

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

export const getVinylsByQuery = async (query: { type: string; term: string }): Promise<[string, string][]> => {
  let dbQuery = supabase.from('vinyls').select('artist, album');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('owner', [query.term]);
  } else if (query.type === 'search') {
    dbQuery = dbQuery.or(`artist.ilike.%${query.term}%,album.ilike.%${query.term}%`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return (data || []).map(item => [item.artist, item.album]);
};

export const addVinyl = async (newVinyl: Vinyl) => {
  const { data, error } = await supabase.from('vinyls').insert([newVinyl]);
  if (error) console.error(error);
  else console.log(data);
}

export const addVinyls = async (newVinyls: Vinyl[]) => {
  const { data, error } = await supabase.from('vinyls').insert(newVinyls);
  if (error) console.error(error);
  else console.log(data);
}

export const deleteVinyl = async (vinylId: string) => {
  const { data, error } = await supabase.from('vinyls').delete().eq('id', vinylId);
  if (error) console.error(error);
  else console.log(data);
}

export const updateVinyl = async (vinylId: string, updatedVinyl: Partial<Vinyl>) => {
  const { data, error } = await supabase.from('vinyls').update(updatedVinyl).eq('id', vinylId);
  if (error) console.error(error);
  else console.log(data);
}
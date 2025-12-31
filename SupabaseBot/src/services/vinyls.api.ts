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

export const findVinyl = async (vinyl : Partial<Vinyl>) => {
  let query = supabase.from('vinyls').select('*');
  
  for (const key in vinyl) {
    const value = (vinyl as any)[key];
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) console.error(error);
  else console.log(data);
}
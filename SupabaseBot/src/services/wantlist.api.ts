import { WantedItem } from "../interfaces/WantedItem";
import supabase from "./supabase";

export const getWantedItems = async () => {
  const { data, error } = await supabase.from('wanted_items').select('*');
  if (error) console.error(error);
  else console.log(data);
}

export type AddStatus = "ADDED" | "DUPLICATE" | "ERROR";

export const addWantedItem = async (newWantedItem: WantedItem): Promise<AddStatus> => {
  // Wanted Items now has a unique constraint that the Artist + Album together must be unique.
  // Apparently this will return an error code of 23505 if violated.
  const { error } = await supabase.from('wanted_items').insert([newWantedItem]);

  if (error) {
    if (error.code === '23505') {
      return "DUPLICATE";
    }
    
    console.error("Supabase Error:", error.message);
    return "ERROR";
  }
  
  return "ADDED";
};

export const addWantedItems = async (newWantedItems: WantedItem[]) => {
  const { data, error } = await supabase.from('wanted_items').insert(newWantedItems);
  if (error) console.error(error);
  else console.log(data);
}

export const deleteWantedItem = async (wantlistitemId: string) => {
  const { data, error } = await supabase.from('wanted_items').delete().eq('id', wantlistitemId);
  if (error) console.error(error);
  else console.log(data);
}

export const updateWantedItem = async (wantlistitemId: string, updatedWantedItem: Partial<WantedItem>) => {
  const { data, error } = await supabase.from('wanted_items').update(updatedWantedItem).eq('id', wantlistitemId);
  if (error) console.error(error);
  else console.log(data);
}

export const findWantedItem = async (wantlistitem : Partial<WantedItem>) => {
  let query = supabase.from('wanted_items').select('*');
  
  for (const key in wantlistitem) {
    const value = (wantlistitem as any)[key];
    query = query.eq(key, value);
  }
  const { data } = await query;
  return data;
}
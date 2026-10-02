import { AddStatus } from "../interfaces/AddStatus.js";
import { WantedItem } from "../interfaces/WantedItem.js";
import supabase from "./supabase.js";

type WantedItemRow = Omit<WantedItem, 'imageUrl'> & { image_url?: string };

const toWantedItem = ({ image_url, ...item }: WantedItemRow): WantedItem => ({
  ...item,
  ...(image_url !== undefined ? { imageUrl: image_url } : {}),
});

export const getWantList = async (query: { type: string; term: string }): Promise<WantedItem[]> => {
  let dbQuery = supabase.from('wanted_items').select('*');

  if (query.type === 'user') {
    dbQuery = dbQuery.contains('searcher', [query.term]);
  } else if (query.type === 'search') {
    // Uses websearch full-text search syntax via PostgREST to automatically bypass punctuation parser errors
    dbQuery = dbQuery.or(`artist.wfts.${query.term},album.wfts.${query.term}`);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return ((data ?? []) as WantedItemRow[]).map(toWantedItem);
};


export const addWantedItem = async (newWantedItem: WantedItem): Promise<AddStatus> => {
  const { imageUrl, ...item } = newWantedItem;
  const { error } = await supabase.from('wanted_items').insert([{
    ...item,
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
  }]);

  if (error) {
    if (error.code === '23505') {
      return "DUPLICATE";
    }
    
    console.error("Supabase Error:", error.message);
    return "ERROR";
  }
  
  return "ADDED";
};
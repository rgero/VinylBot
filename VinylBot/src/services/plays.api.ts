import { PlayLog } from "../interfaces/PlayLog.js";
import supabase from "./supabase.js";

export const getPlayLogs = async (): Promise<PlayLog[]> => {
  const { data, error } = await supabase
    .from('playlogs')
    .select('*, vinyls(artist, album)'); 
    
  if (error) console.error(error);

  return (data ?? []).map(p => ({
    ...p,
    artist: p.vinyls?.artist,
    album: p.vinyls?.album
  }));
}

export const addPlayLog = async (newPlayLog: PlayLog) => {
  const { error } = await supabase.from('playlogs').insert([{
    album_id: newPlayLog.album_id,
    listeners: newPlayLog.listeners,
    date: newPlayLog.date
  }]);
  
  if (error) {
    console.error("Error adding playlog:", error);
    throw error;
  }
}
export const addPlayLogs = async (newPlayLogs: PlayLog[]) => {
  const { data, error } = await supabase.from('playlogs').insert(newPlayLogs);
  if (error) console.error(error);
  else console.log(data);
}
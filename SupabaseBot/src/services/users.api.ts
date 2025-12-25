import { User } from "../interfaces/User";
import supabase from "./supabase";

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);

  return data ?? [];
}
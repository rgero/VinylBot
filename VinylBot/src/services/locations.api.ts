import { ItemCount } from "../interfaces/ItemCount.js";
import { Location } from "../interfaces/Location.js";
import { VinylWithLocation } from "../interfaces/Vinyl.js";
import supabase from "./supabase.js";

type LocationRow = Omit<Location, 'purchaseCount'> & { purchase_count: number };

const toLocation = ({ purchase_count, ...location }: LocationRow): Location => ({
  ...location,
  purchaseCount: purchase_count,
});

export const getLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) {
    console.error(error);
    return [];
  }

  return ((data ?? []) as LocationRow[]).map(toLocation);
}

export const getPhysicalLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .not("address", "is", null)
    .neq("address", "");

  if (error) {
    console.error(error);
    return [];
  }
  return ((data ?? []) as LocationRow[]).map(toLocation);
};

const countVinylsByLocation = (vinyls: VinylWithLocation[]): ItemCount[] => {
  const counts: Record<string, number> = vinyls.reduce((acc, curr) => {
    const locName = curr.purchaseLocation.name;
    acc[locName] = (acc[locName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
};

export const getLocationsByPurchaseCountForID = async (userID: string): Promise<ItemCount[]> => {
  const { data, error } = await supabase
    .from('vinyls')
    .select('owners,purchaseLocation:locations(name)')
    .contains('owners', [userID]);

  if (error) throw error;
  if (!data) return [];
  
  const vinyls = data as unknown as VinylWithLocation[];

  return countVinylsByLocation(vinyls);
};

export const getLocationsByPurchaseCount = async (): Promise<ItemCount[]> => {
  const { data, error } = await supabase.from('locations').select('*').order('purchase_count', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as LocationRow[]).map((loc) => ({
    title: loc.name,
    count: loc.purchase_count,
  }));
};
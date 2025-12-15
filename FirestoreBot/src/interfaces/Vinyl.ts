import { Timestamp } from "firebase-admin/firestore";

export type StoreId = string;

export interface Vinyl {
  artist: string;
  album: string;
  datePurchased: Timestamp;
  purchaseLocationId: StoreId;
  price: number;
  owner: string;
  length: number;
  notes?: string;
  playCount: number;
  likedBy: string[];
}


export interface Vinyl {
  artist: string;
  album: string;
  datePurchased: Date;
  purchaseLocationId: string;
  price: number;
  owner: string[];
  length: number;
  notes?: string;
  playCount: number;
  likedBy: string[];
}

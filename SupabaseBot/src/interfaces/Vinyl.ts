
export interface Vinyl {
  id?: string;
  purchaseNumber: number;
  artist: string;
  album: string;
  purchaseDate: Date;
  purchaseLocation: string;
  price: number;
  owner: string[];
  length: number;
  notes?: string;
  playCount: number;
  likedBy: string[];
}

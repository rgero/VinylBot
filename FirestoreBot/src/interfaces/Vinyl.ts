import type Store = require("./Store");

export interface Vinyl {
  id: string,
  artist: string,
  album: string,
  datePurchased: Date,
  purchaseLocation: Store.Store["id"],
  price: number,
  owner: string,
  length: number,
  notes: string,
  playCount: number,
  likedBy: string[]
}
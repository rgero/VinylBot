import type Vinyl = require("./Vinyl");

export interface PlayLog {
  album: Vinyl.Vinyl["id"],
  listener: string,
  date: Date
}
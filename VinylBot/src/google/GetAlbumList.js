import { getData } from "./GetData.js";
import { normalizeString } from "../utils/normalizeString.js";

export const getAlbumList = async (listType, { type, term }) => {

  const isWantList = listType === "want";
  const sheetName = isWantList ? process.env.WANT_LIST_SHEET_NAME : process.env.ALBUM_SHEET_NAME;
  
  // Want List user is col 4 (idx 3), Have List user is col 6 (idx 5)
  const userColumnIndex = isWantList ? 3 : 5;

  let dataRows = await getData(sheetName);

  if (type === "user") {
    dataRows = dataRows.filter(
      (row) => row[userColumnIndex] && 
               row[userColumnIndex].toLowerCase().includes(term.toLowerCase())
    );
  } else if (type === "search") {
    const searchTerm = term.toLowerCase();
    dataRows = dataRows.filter(
      (row) => 
        (row[0] && row[0].toLowerCase().includes(searchTerm)) ||
        (row[1] && row[1].toLowerCase().includes(searchTerm))
    );
  }

  dataRows.sort((a, b) => {
    const artistCompare = normalizeString(a[0]).localeCompare(
      normalizeString(b[0]), 
      undefined, 
      { sensitivity: "base" }
    );

    if (artistCompare !== 0) return artistCompare;

    return normalizeString(a[1]).localeCompare(
      normalizeString(b[1]), 
      undefined, 
      { sensitivity: "base" }
    );
  });

  return dataRows;
};
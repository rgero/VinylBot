import fs from "fs";
import { google } from "googleapis";

const credentials = JSON.parse(fs.readFileSync("./service-account.json"));

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const getWantList = async ({type, term}) => {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const spreadsheetId = process.env.SPREADSHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Searching For",
  });
   
  // Remove header row
  let dataRows = res.data.values.slice(1);

  if (type === "user")
  {
    // Filter the dataRows by column 4 (index 3)
    dataRows = dataRows.filter(
      (row) => row[3] && row[3].toLowerCase().includes(term.toLowerCase())
    );
  } else if (type === "artist") {
    // Filter the dataRows by column 1 (index 0)
    dataRows = dataRows.filter(
      (row) => row[0] && row[0].toLowerCase().includes(term.toLowerCase())
    );
  }

  // Sort the rows - Artist and then Album. Ignoring the/a/an
  dataRows.sort((a, b) => {
    const artistA = normalizeForSort(a[0]);
    const artistB = normalizeForSort(b[0]);

    const artistCompare = artistA.localeCompare(artistB, undefined, {
      sensitivity: "base",
    });

    if (artistCompare !== 0) return artistCompare;

    const albumA = normalizeForSort(a[1]);
    const albumB = normalizeForSort(b[1]);

    return albumA.localeCompare(albumB, undefined, {
      sensitivity: "base",
    });
  });

  return dataRows
}

const normalizeForSort = (value = "") => {
  return value
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
};

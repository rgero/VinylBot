import { db } from "../firebase";
import { google } from "googleapis";

// -------------------------------
// Google Sheets config
// -------------------------------
const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const RANGE = "Stores!A2:D"; // adjust as needed

const sheets = google.sheets("v4");

// -------------------------------
// Auth (service account or OAuth)
// -------------------------------
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function migrateStores() {
  const client = await auth.getClient();

  const response = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("No store rows found.");
    return;
  }

  let migrated = 0;

  for (const row of rows) {
    const [
      name,
      address,
      recommendedRaw,
      notes,
    ] = row;

    if (!name || !address) {
      console.warn("Skipping invalid row:", row);
      continue;
    }

    const recommended =
      String(recommendedRaw).toLowerCase() === "true" ||
      String(recommendedRaw).toLowerCase() === "yes";

    // Use store name as deterministic ID (safe + idempotent)
    const storeId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    await db.collection("stores").doc(storeId).set(
      {
        name,
        address,
        recommended,
        purchaseCount: 0,
        notes: notes || undefined,
      },
      { merge: true }
    );

    migrated++;
  }

  console.log(`✅ Migrated ${migrated} stores`);
}

migrateStores().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

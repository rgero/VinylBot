import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { parse } from "csv-parse/sync";
import supabase from "../services/supabase.js";

export interface ReleaseDateRow {
  id: number;
  release_date: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseReleaseDates = (filePath: string): ReleaseDateRow[] => {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

  const rows: ReleaseDateRow[] = [];
  for (const record of records) {
    const id = Number(record.id);
    const releaseDate = record.release_date;

    if (!Number.isInteger(id) || !releaseDate || !DATE_PATTERN.test(releaseDate)) {
      console.warn(`Skipping invalid row: id=${record.id}, release_date=${releaseDate}`);
      continue;
    }

    rows.push({ id, release_date: releaseDate });
  }

  return rows;
};

export const updateReleaseDates = async (rows: ReleaseDateRow[]) => {
  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const [index, row] of rows.entries()) {
    const progress = `[${index + 1}/${rows.length}]`;
    const { data, error } = await supabase
      .from("vinyls")
      .update({ release_date: row.release_date })
      .eq("id", row.id)
      .select("id");

    if (error) {
      console.error(`${progress} Failed to update vinyl ${row.id}:`, error.message);
      failed++;
    } else if (!data || data.length === 0) {
      console.warn(`${progress} No vinyl found with id ${row.id}`);
      notFound++;
    } else {
      console.log(`${progress} Updated vinyl ${row.id} -> ${row.release_date}`);
      updated++;
    }
  }

  console.log(`Process complete. Updated: ${updated}, not found: ${notFound}, failed: ${failed}.`);
  return { updated, notFound, failed };
};

const populateReleaseDates = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: tsx src/scripts/populateReleaseDates.ts <path-to-csv>");
  }

  const rows = parseReleaseDates(filePath);
  console.log(`Parsed ${rows.length} rows from ${filePath}`);
  await updateReleaseDates(rows);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  populateReleaseDates().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

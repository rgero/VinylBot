import { migrateLocations } from "./migrateLocations";
import { migratePlayLogs } from "./migratePlayLogs";
import { migrateVinyls } from "./migrateVinyls";
import { migrateWantlist } from "./migrateWantlist";
import { populateAlbumArt } from "./populateAlbumArt";

async function populateDatabase() {
  console.log("--- Starting Full Database Population ---");

  try {
    console.log("\n1. Migrating Locations...");
    await migrateLocations();

    console.log("\n2. Migrating Want List...");
    await migrateWantlist();

    console.log("\n3. Migrating Vinyls...");
    await migrateVinyls();

    console.log("\n4. Migrating Play Logs...");
    await migratePlayLogs();

    console.log("\n5. Populating Missing Album Art...");
    await populateAlbumArt();

    console.log("\n--- Database Population Complete! ---");
  } catch (error) {
    console.error("\n!!! Database Population Failed !!!");
    console.error(error);
    process.exit(1);
  }
}

populateDatabase();
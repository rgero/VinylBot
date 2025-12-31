import fs from "fs";
import path from "path";

export const getDropdownValue = (user: string) => {
  let mapping: { [key: string]: string } = {};

  try {
    const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
    mapping = JSON.parse(data);
  } catch (err) {
    console.error("Failed to load discordMapping.json", err);
  }

  return mapping[user] || "Unknown";
};

import fs from "fs";
import path from "path";

let mapping = {};

try {
  const data = fs.readFileSync(path.resolve("./discordMapping.json"), "utf8");
  mapping = JSON.parse(data);
} catch (err) {
  console.error("Failed to load discordMapping.json", err);
}

export const getDropdownValue = (user) => {
  return mapping[user] || "Unknown";
};

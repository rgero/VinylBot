import { Vinyl } from "../interfaces/Vinyl.js";

export const parseTagsFlag = (flag: string | boolean | undefined): string[] => {
  if (typeof flag !== "string") return [];
  return flag.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
};

export const filterVinylsByTags = (vinyls: Vinyl[], tags: string[]): Vinyl[] => {
  if (tags.length === 0) return vinyls;
  const tagSet = new Set(tags.map((tag) => tag.trim().toLowerCase()));
  return vinyls.filter((vinyl) => vinyl.tags?.some((tag) => tagSet.has(tag.trim().toLowerCase())));
};

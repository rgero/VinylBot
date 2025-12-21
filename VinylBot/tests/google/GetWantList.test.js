import { beforeEach, describe, expect, it, vi } from "vitest";

import { getData } from "../../src/google/GetData.js";
import { getWantList } from "../../src/google/GetWantList.js";
import { normalizeString } from "../../src/utils/normalizeString.js";

// Mock dependencies
vi.mock("../../src/google/GetData.js", () => ({
  getData: vi.fn(),
}));

vi.mock("../../src/utils/normalizeString.js", () => ({
  normalizeString: vi.fn((s) => s), // Default: return string as is
}));

describe("getWantList", () => {
  const mockData = [
    ["The Beatles", "Abbey Road", "img1", "John"],
    ["Pink Floyd", "The Wall", "img2", "Paul"],
    ["Beatles", "Revolver", "img3", "John"],
    ["Radiohead", "OK Computer", "img4", "George"],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WANT_LIST_SHEET_NAME = "Wantlist";
    vi.mocked(getData).mockResolvedValue(mockData);
  });

  it("should filter by user (column index 3)", async () => {
    const result = await getWantList({ type: "user", term: "John" });

    expect(result).toHaveLength(2);
    expect(result.every((row) => row[3] === "John")).toBe(true);
    expect(getData).toHaveBeenCalledWith("Wantlist");
  });

  it("should filter by artist (column index 0)", async () => {
    const result = await getWantList({ type: "artist", term: "Pink" });

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe("Pink Floyd");
  });

  it("should return all rows if type is not recognized", async () => {
    const result = await getWantList({ type: "unknown", term: "anything" });
    // It should skip filtering but still apply sorting
    expect(result).toHaveLength(4);
  });

  it("should sort rows by artist, then by album", async () => {
    const unsortedData = [
      ["Zebra", "Album B", "", "User"],
      ["Zebra", "Album A", "", "User"],
      ["Apple", "Album C", "", "User"],
    ];
    vi.mocked(getData).mockResolvedValue(unsortedData);

    const result = await getWantList({ type: "all", term: "" });

    // Expect Apple first, then Zebra (Album A), then Zebra (Album B)
    expect(result[0][0]).toBe("Apple");
    expect(result[1][1]).toBe("Album A");
    expect(result[2][1]).toBe("Album B");
  });

  it("should use normalizeString during sorting", async () => {
    // Setup: simulate normalizeString stripping "The"
    vi.mocked(normalizeString).mockImplementation((s) => s.replace(/^The\s+/i, ""));

    const dataWithArticles = [
      ["The Beatles", "Abbey Road"],
      ["Anthrax", "Persistence of Time"],
    ];
    vi.mocked(getData).mockResolvedValue(dataWithArticles);

    const result = await getWantList({ type: "all", term: "" });

    // "Anthrax" vs "Beatles" -> Anthrax should be first
    expect(result[0][0]).toBe("Anthrax");
    expect(result[1][0]).toBe("The Beatles");
    expect(normalizeString).toHaveBeenCalled();
  });

  it("should handle empty or missing values in filter columns gracefully", async () => {
    vi.mocked(getData).mockResolvedValue([
      [null, "Album", "", null],
      ["Artist", "Album", "", "User"],
    ]);

    const result = await getWantList({ type: "user", term: "User" });

    expect(result).toHaveLength(1);
    expect(result[0][3]).toBe("User");
  });
});
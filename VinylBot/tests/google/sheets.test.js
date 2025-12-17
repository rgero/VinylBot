import {appendAlbumToSheet, getRandomRow} from "../../src/google/sheets.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(() =>
      JSON.stringify({ client_email: "test@test.com" })
    ),
  },
}));

// ---- Mock googleapis ----
const appendMock = vi.fn();
const valuesGetMock = vi.fn();
const sheetsGetMock = vi.fn();

vi.mock("googleapis", () => {
  class GoogleAuthMock {
    getClient = vi.fn().mockResolvedValue("auth-client");
  }

  return {
    google: {
      auth: {
        GoogleAuth: GoogleAuthMock,
      },
      sheets: vi.fn(() => ({
        spreadsheets: {
          get: sheetsGetMock,
          values: {
            get: valuesGetMock,
            append: appendMock,
          },
        },
      })),
    },
  };
});

describe("appendAlbumToSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-sheet-id";
  });

  it("appends a new album when not a duplicate", async () => {
    sheetsGetMock.mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: "Searching For" } }],
      },
    });

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Other Artist", "Other Album"],
        ],
      },
    });

    const result = await appendAlbumToSheet(
      "Gojira",
      "From Mars to Sirius",
      "http://image.jpg",
      "Roy"
    );

    expect(result).toBe(true);
    expect(appendMock).toHaveBeenCalledOnce();
    expect(appendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: {
          values: [[
            "Gojira",
            "From Mars to Sirius",
            '=IMAGE("http://image.jpg")',
            "Roy",
          ]],
        },
      })
    );
  });

  it("returns false when album already exists", async () => {
    sheetsGetMock.mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: "Searching For" } }],
      },
    });

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "From Mars to Sirius"],
        ],
      },
    });

    const result = await appendAlbumToSheet(
      "Gojira",
      "From Mars to Sirius",
      null,
      "Roy"
    );

    expect(result).toBe(false);
    expect(appendMock).not.toHaveBeenCalled();
  });

  it("throws if sheet does not exist", async () => {
    sheetsGetMock.mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: "Other Sheet" } }],
      },
    });

    await expect(
      appendAlbumToSheet("A", "B", null, "Roy")
    ).rejects.toThrow('Sheet/tab "Searching For" not found.');
  });
});

describe("getRandomRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-sheet-id";
  });

  it("returns null if sheet has no data rows", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [["Artist", "Album"]],
      },
    });

    const row = await getRandomRow({ sheetName: "Searching For" });
    expect(row).toBeNull();
  });

  it("returns a random row", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "Magma"],
          ["Opeth", "Ghost Reveries"],
        ],
      },
    });

    const row = await getRandomRow({ sheetName: "Searching For" });

    expect(row).toEqual(["Gojira", "Magma"]);
  });

  it("filters rows before picking random", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["Artist", "Album"],
          ["Gojira", "Magma"],
          ["Opeth", "Ghost Reveries"],
        ],
      },
    });

    const row = await getRandomRow({
      sheetName: "Searching For",
      filterColumnIndex: 0,
      filterValue: "opeth",
    });

    expect(row).toEqual(["Opeth", "Ghost Reveries"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogPlay } from "../../src/google/LogPlay.js";
import { getGoogleSheetsClient } from "../../src/google/GetGoogleSheetsClient.js";

// Mock the Google Client helper
vi.mock("../../src/google/GetGoogleSheetsClient.js", () => ({
  getGoogleSheetsClient: vi.fn(),
}));

describe("LogPlay", () => {
  const mockAppend = vi.fn();
  const mockGet = vi.fn();

  const mockSheetsInstance = {
    spreadsheets: {
      get: mockGet,
      values: { append: mockAppend },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPREADSHEET_ID = "test-id-123";

    // Silence console to keep test output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default: client returns our mock instance
    vi.mocked(getGoogleSheetsClient).mockResolvedValue(mockSheetsInstance);
    
    // Default: spreadsheet.get returns a valid sheet list
    mockGet.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: "Roy's Play Log" } }],
      },
    });

    // Default: append succeeds
    mockAppend.mockResolvedValue({ status: 200 });
  });

  it("should return false if SPREADSHEET_ID is missing", async () => {
    delete process.env.SPREADSHEET_ID;
    const result = await LogPlay("Artist", "Album", "Roy");
    
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "SPREADSHEET_ID is not set in .env" })
    );
  });

  it("should return false if the user's specific sheet does not exist", async () => {
    // Mock return where "Roy's Play Log" is missing
    mockGet.mockResolvedValue({
      data: { sheets: [{ properties: { title: "Someone Else" } }] },
    });

    const result = await LogPlay("Artist", "Album", "Roy");

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("should append data correctly with the current date string", async () => {
    // Fix the date to a specific point in time for the test
    const mockDate = new Date("2023-10-27T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const result = await LogPlay("Rise Against", "Endgame", "Roy");

    expect(result).toBe(true);
    expect(mockAppend).toHaveBeenCalledWith({
      spreadsheetId: "test-id-123",
      range: "'Roy's Play Log'!A:C",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [["Rise Against", "Endgame", mockDate.toDateString()]],
      },
    });

    vi.useRealTimers();
  });

  it("should return false if the Google API throws an error during append", async () => {
    mockAppend.mockRejectedValue(new Error("API Error"));

    const result = await LogPlay("Artist", "Album", "Roy");

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
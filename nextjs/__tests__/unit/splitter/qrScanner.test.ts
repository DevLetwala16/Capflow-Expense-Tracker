import { extractSessionIdFromQR } from "@/lib/splitter/qrScanner";

describe("Splitter QR Scanner Utility", () => {
  test("extracts session ID from URL query parameter ?join=...", () => {
    const url = "https://capflow.app/budgets/splitter?join=CAP-SPLIT-9821-X";
    expect(extractSessionIdFromQR(url)).toBe("CAP-SPLIT-9821-X");
  });

  test("extracts session ID from localhost URL query parameter", () => {
    const url = "http://localhost:3000/budgets/splitter?join=cap-split-3456-y";
    expect(extractSessionIdFromQR(url)).toBe("CAP-SPLIT-3456-Y");
  });

  test("extracts session ID from URL path segment /budgets/splitter/[id]", () => {
    const url = "https://capflow.app/budgets/splitter/CAP-SPLIT-7721-Z";
    expect(extractSessionIdFromQR(url)).toBe("CAP-SPLIT-7721-Z");
  });

  test("extracts session ID from raw alphanumeric code", () => {
    const raw = "CAP-SPLIT-4819-B";
    expect(extractSessionIdFromQR(raw)).toBe("CAP-SPLIT-4819-B");
  });

  test("extracts session ID embedded in text with prefix", () => {
    const text = "Scan this to join: CAP-SPLIT-1234-A in CapFlow";
    expect(extractSessionIdFromQR(text)).toBe("CAP-SPLIT-1234-A");
  });

  test("returns empty string on empty input", () => {
    expect(extractSessionIdFromQR("")).toBe("");
  });
});

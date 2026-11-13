import { describe, expect, it } from "vitest";
import { formatDuration, operationDurationMs } from "@/lib/operation-timing";

const NOW = Date.parse("2026-01-15T10:35:00Z");

describe("operationDurationMs", () => {
  it("measures a finished operation from start to end", () => {
    expect(
      operationDurationMs(
        {
          status: "completed",
          started_at: "2026-01-15T10:30:00Z",
          completed_at: "2026-01-15T10:31:30Z",
        },
        NOW
      )
    ).toBe(90_000);
  });

  it("measures a running operation up to now", () => {
    expect(
      operationDurationMs({ status: "processing", started_at: "2026-01-15T10:34:00Z" }, NOW)
    ).toBe(60_000);
  });

  it("has no duration before a worker starts the operation", () => {
    expect(operationDurationMs({ status: "pending" }, NOW)).toBeNull();
    // Cancelled while queued: it ended without ever running.
    expect(
      operationDurationMs({ status: "cancelled", completed_at: "2026-01-15T10:31:30Z" }, NOW)
    ).toBeNull();
  });

  it("has no duration for a started operation that is neither running nor ended", () => {
    expect(
      operationDurationMs({ status: "pending", started_at: "2026-01-15T10:30:00Z" }, NOW)
    ).toBeNull();
  });
});

describe("formatDuration", () => {
  it.each([
    [850, "850ms"],
    [12_300, "12.3s"],
    [12_000, "12s"],
    [245_000, "4m 5s"],
    [4_320_000, "1h 12m"],
  ])("formats %i ms as %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

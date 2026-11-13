import { describe, expect, it } from "vitest";
import { bucketMetricValue, seriesMetricValue } from "@/components/llm-requests-view";
import type { LLMRequestStatsBucket } from "@/lib/api";

const bucket: LLMRequestStatsBucket = {
  time: "2026-01-15T10:00:00+00:00",
  statuses: { success: 7, error: 2 },
  total: 9,
  tokens: { input: 100, output: 20, thoughts: 60, cached: 10, total: 120 },
  duration_ms: 4500,
};

describe("bucketMetricValue", () => {
  it("reads each metric off the bucket", () => {
    expect(bucketMetricValue(bucket, "calls")).toBe(9);
    // Reasoning tokens are billed but not in the API's total.
    expect(bucketMetricValue(bucket, "tokens")).toBe(180);
    expect(bucketMetricValue(bucket, "time")).toBe(4500);
    expect(bucketMetricValue(bucket, "failures")).toBe(2);
  });

  it("plots zero for what an older server does not report", () => {
    const old: LLMRequestStatsBucket = { ...bucket, statuses: { success: 9 } };
    delete old.duration_ms;
    expect(bucketMetricValue(old, "time")).toBe(0);
    expect(bucketMetricValue(old, "failures")).toBe(0);
  });
});

describe("seriesMetricValue", () => {
  it("reads each metric off one line of a split", () => {
    const sums = { calls: 4, tokens: 90, duration_ms: 2100, errors: 1 };
    expect(seriesMetricValue(sums, "calls")).toBe(4);
    expect(seriesMetricValue(sums, "tokens")).toBe(90);
    expect(seriesMetricValue(sums, "time")).toBe(2100);
    expect(seriesMetricValue(sums, "failures")).toBe(1);
  });

  it("plots zero for what an older server does not report", () => {
    expect(seriesMetricValue({ calls: 4, tokens: 90 }, "time")).toBe(0);
    expect(seriesMetricValue({ calls: 4, tokens: 90 }, "failures")).toBe(0);
  });
});

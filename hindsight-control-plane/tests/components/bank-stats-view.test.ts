import { describe, expect, it } from "vitest";

import { getCausalLinkCount, toRunningTotals } from "@/components/bank-stats-view";

describe("getCausalLinkCount", () => {
  it("combines canonical and legacy causal link types", () => {
    expect(
      getCausalLinkCount({
        caused_by: 7,
        causes: 3,
        enables: 2,
        prevents: 1,
        temporal: 20,
        semantic: 10,
        entity: 5,
      })
    ).toBe(13);
  });

  it("treats absent causal link types as zero", () => {
    expect(getCausalLinkCount({ temporal: 2 })).toBe(0);
  });
});

describe("toRunningTotals", () => {
  const bucket = (time: string, world: number, experience: number, observation: number) => ({
    time,
    world,
    experience,
    observation,
  });

  it("accumulates each series separately and keeps the other fields", () => {
    expect(
      toRunningTotals([bucket("t1", 2, 1, 0), bucket("t2", 0, 4, 3), bucket("t3", 5, 0, 1)])
    ).toEqual([bucket("t1", 2, 1, 0), bucket("t2", 2, 5, 3), bucket("t3", 7, 5, 4)]);
  });

  it("leaves the input buckets untouched", () => {
    const buckets = [bucket("t1", 1, 1, 1), bucket("t2", 1, 1, 1)];
    toRunningTotals(buckets);
    expect(buckets[1]).toEqual(bucket("t2", 1, 1, 1));
  });
});

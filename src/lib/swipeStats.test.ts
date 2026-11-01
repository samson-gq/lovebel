import { describe, expect, it } from "vitest";
import { computeSwipeStats } from "./swipeStats";

describe("computeSwipeStats", () => {
  it("counts liked, responded and pending", () => {
    const stats = computeSwipeStats(["a", "b", "c"], ["b"]);
    expect(stats).toEqual({ liked: 3, responded: 1, pending: 2 });
  });

  it("counts each person once even with duplicate swipes", () => {
    const stats = computeSwipeStats(["a", "a", "b"], ["a", "a"]);
    expect(stats).toEqual({ liked: 2, responded: 1, pending: 1 });
  });

  it("ignores incoming likes from people I did not like", () => {
    const stats = computeSwipeStats(["a"], ["x", "y"]);
    expect(stats).toEqual({ liked: 1, responded: 0, pending: 1 });
  });

  it("returns zeros when nothing was liked", () => {
    expect(computeSwipeStats([], [])).toEqual({ liked: 0, responded: 0, pending: 0 });
  });
});

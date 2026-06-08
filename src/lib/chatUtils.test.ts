import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { formatDayLabel, formatTime, sameDay, linkify } from "./chatUtils";

describe("chatUtils", () => {
  beforeAll(() => {
    // Freeze "now" to a known date so "Сегодня"/"Вчера" labels are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T12:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  describe("sameDay", () => {
    it("returns true for same calendar day", () => {
      expect(sameDay(new Date("2026-06-08T01:00:00Z"), new Date("2026-06-08T23:00:00Z"))).toBe(true);
    });
    it("returns false for different days", () => {
      expect(sameDay(new Date("2026-06-08"), new Date("2026-06-09"))).toBe(false);
    });
  });

  describe("formatDayLabel", () => {
    it('renders "Сегодня" for today', () => {
      expect(formatDayLabel(new Date("2026-06-08T15:00:00Z"))).toBe("Сегодня");
    });
    it('renders "Вчера" for yesterday', () => {
      expect(formatDayLabel(new Date("2026-06-07T15:00:00Z"))).toBe("Вчера");
    });
    it("renders day + month for older same-year dates", () => {
      const label = formatDayLabel(new Date("2026-01-15T12:00:00Z"));
      expect(label).toMatch(/15/);
      expect(label).toMatch(/январ/i);
    });
    it("includes the year for prior years", () => {
      const label = formatDayLabel(new Date("2024-12-25T12:00:00Z"));
      expect(label).toMatch(/2024/);
    });
  });

  describe("formatTime", () => {
    it("returns HH:MM in 24h", () => {
      expect(formatTime(new Date("2026-06-08T09:05:00"))).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("linkify", () => {
    it("returns empty array for empty input", () => {
      expect(linkify("")).toEqual([]);
    });
    it("returns single text part for plain text", () => {
      expect(linkify("hello world")).toEqual([{ type: "text", value: "hello world" }]);
    });
    it("splits text and url", () => {
      const parts = linkify("see https://lovebel.app today");
      expect(parts).toEqual([
        { type: "text", value: "see " },
        { type: "link", value: "https://lovebel.app" },
        { type: "text", value: " today" },
      ]);
    });
    it("handles multiple urls", () => {
      const parts = linkify("a https://x.com b https://y.com");
      expect(parts.filter((p) => p.type === "link")).toHaveLength(2);
    });
    it("handles url at start and end", () => {
      const parts = linkify("https://x.com");
      expect(parts).toEqual([{ type: "link", value: "https://x.com" }]);
    });
  });
});

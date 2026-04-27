import { describe, it, expect } from "vitest";
import { normalizeCity, suggestCities, FALLBACK_POPULAR_CITIES } from "@/lib/cities";

describe("normalizeCity", () => {
  it("returns empty for nullish input", () => {
    expect(normalizeCity("")).toBe("");
    expect(normalizeCity(null)).toBe("");
    expect(normalizeCity(undefined)).toBe("");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeCity("  Москва   ")).toBe("москва");
    expect(normalizeCity("Нижний  Новгород")).toBe("нижний новгород");
  });

  it("lowercases and replaces ё with е", () => {
    expect(normalizeCity("Орёл")).toBe("орел");
  });

  it("expands СПб and С-Петербург to санкт-петербург", () => {
    expect(normalizeCity("СПб")).toBe("санкт-петербург");
    expect(normalizeCity("спб.")).toBe("санкт-петербург");
    expect(normalizeCity("С.-Петербург")).toBe("санкт-петербург");
    expect(normalizeCity("С-Петербург")).toBe("санкт-петербург");
  });

  it("expands МСК to москва and НН to нижний новгород", () => {
    expect(normalizeCity("МСК")).toBe("москва");
    expect(normalizeCity("нн")).toBe("нижний новгород");
  });

  it("matches abbreviations against canonical names", () => {
    expect(normalizeCity("спб")).toBe(normalizeCity("Санкт-Петербург"));
    expect(normalizeCity("МСК")).toBe(normalizeCity("Москва"));
  });
});

describe("suggestCities", () => {
  it("returns the full list when query is empty", () => {
    const out = suggestCities("", FALLBACK_POPULAR_CITIES, 6);
    expect(out.length).toBe(6);
    expect(out[0]).toBe("Москва");
  });

  it("matches by abbreviation", () => {
    const out = suggestCities("спб", FALLBACK_POPULAR_CITIES);
    expect(out).toContain("Санкт-Петербург");
  });

  it("ignores extra whitespace and case", () => {
    const out = suggestCities("  МоСк  ", FALLBACK_POPULAR_CITIES);
    expect(out).toContain("Москва");
  });

  it("handles ё/е equivalence (Орёл-style)", () => {
    const out = suggestCities("орел", ["Орёл"]);
    expect(out).toEqual(["Орёл"]);
  });

  it("respects limit", () => {
    const out = suggestCities("", FALLBACK_POPULAR_CITIES, 3);
    expect(out.length).toBe(3);
  });

  it("returns empty when nothing matches", () => {
    expect(suggestCities("xyznotacity", FALLBACK_POPULAR_CITIES)).toEqual([]);
  });
});

// Lightweight client-side normalization mirroring the SQL `public.normalize_city`
// function so suggestions and client-side filtering stay consistent with the server.

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/(^|\s)спб($|\s|\.)/gi, "$1санкт-петербург$2"],
  [/(^|\s)с\.?-?петербург/gi, "$1санкт-петербург"],
  [/(^|\s)мск($|\s|\.)/gi, "$1москва$2"],
  [/(^|\s)нн($|\s|\.)/gi, "$1нижний новгород$2"],
];

export function normalizeCity(input: string | null | undefined): string {
  if (!input) return "";
  let s = input;
  for (const [re, rep] of ABBREVIATIONS) s = s.replace(re, rep);
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestCities(
  query: string,
  cities: string[],
  limit = 6,
): string[] {
  const q = normalizeCity(query);
  if (!q) return cities.slice(0, limit);
  return cities.filter((c) => normalizeCity(c).includes(q)).slice(0, limit);
}

// Fallback list used until server data loads (also used in tests).
export const FALLBACK_POPULAR_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Минск",
  "Киев",
];

// Popular cities + lightweight client-side normalization mirroring the
// SQL `public.normalize_city` function so suggestions match server filtering.

export const POPULAR_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Уфа",
  "Ростов-на-Дону",
  "Краснодар",
  "Воронеж",
  "Пермь",
  "Волгоград",
  "Минск",
  "Киев",
  "Алматы",
];

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/(^|\s)спб($|\s|\.)/gi, "$1санкт-петербург$2"],
  [/(^|\s)с\.?-?петербург/gi, "$1санкт-петербург"],
  [/(^|\s)мск($|\s|\.)/gi, "$1москва$2"],
  [/(^|\s)нн($|\s|\.)/gi, "$1нижний новгород$2"],
];

export function normalizeCity(input: string): string {
  if (!input) return "";
  let s = input;
  for (const [re, rep] of ABBREVIATIONS) s = s.replace(re, rep);
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();
}

export function suggestCities(query: string, limit = 6): string[] {
  const q = normalizeCity(query);
  if (!q) return POPULAR_CITIES.slice(0, limit);
  return POPULAR_CITIES.filter((c) => normalizeCity(c).includes(q)).slice(0, limit);
}

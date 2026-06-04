// Utilities for chat formatting

export const formatDayLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Сегодня";
  if (d.getTime() === yesterday.getTime()) return "Вчера";
  const sameYear = d.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
};

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Linkify: splits text into parts so URLs become anchor elements
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export interface TextPart {
  type: "text" | "link";
  value: string;
}

export const linkify = (text: string): TextPart[] => {
  if (!text) return [];
  const parts: TextPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
};

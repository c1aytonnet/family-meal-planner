import { clsx, type ClassValue } from "clsx";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function makeId(prefix: string, seed?: string) {
  const unique = seed ? slugify(seed) : crypto.randomUUID().slice(0, 8);
  return `${prefix}-${unique}`;
}

export function formatLongDate(date: string) {
  return format(parseISO(date), "EEEE, MMMM d");
}

export function formatShortDate(date: string) {
  return format(parseISO(date), "MMM d");
}

export function getWeekDays(weekOf?: string) {
  const start = weekOf ? parseISO(weekOf) : startOfWeek(new Date(), { weekStartsOn: 1 });

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      day: format(date, "EEEE"),
      date: format(date, "yyyy-MM-dd"),
    };
  });
}

export function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

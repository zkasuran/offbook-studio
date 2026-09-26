export const LA_TZ = "America/Los_Angeles";

export function laTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: LA_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function laDayLabel(iso: string) {
  const d = new Date(iso);
  const today = laDateKey(new Date().toISOString());
  const tomorrow = laDateKey(new Date(Date.now() + 86400000).toISOString());
  const key = laDateKey(iso);
  if (key === today) return "Today";
  if (key === tomorrow) return "Tomorrow";
  return d.toLocaleDateString("en-US", {
    timeZone: LA_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function laDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: LA_TZ });
}

export function laFull(iso: string) {
  return `${laDayLabel(iso)}, ${laTime(iso)} PT`;
}

export function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Offset (min) de um fuso numa data, sem bibliotecas. */
function tzOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Converte "AAAA-MM-DD" + hora local do usuário em instante UTC. */
export function windowToUTC(day: string, hour: number, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
  const off = tzOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - off * 60000);
}

export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const jitter = (minMs: number, maxMs: number) => minMs + Math.floor(Math.random() * (maxMs - minMs));

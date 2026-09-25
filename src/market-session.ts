import type { Series } from "./design-schema";
import { chartObservations, verifiedUsEquityTradingDay } from "./chart-observations";

const easternClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function afterConservativeClose(timestamp: string, sessionDate: string) {
  const instant = Date.parse(timestamp);
  if (!Number.isFinite(instant)) return false;
  const parts = Object.fromEntries(easternClock.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  // 16:00 ET is the regular close. On known early closes we deliberately still
  // wait until 16:00; Intl's IANA timezone conversion handles summer/winter DST.
  return date > sessionDate || (date === sessionDate && Number(parts.hour) >= 16);
}

/** An observed US equity daily close, never a publication timestamp or live quote. */
export function completedUsEquityDailyBar(series: Series, date: string, asOf: string): boolean {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff) || date !== new Date(cutoff).toISOString().slice(0, 10) ||
    series.semantics.frequency !== "daily" ||
    !["close", "adjusted_close"].includes(series.semantics.kind) ||
    series.semantics.fxDirection !== null || series.provisionalLastBar ||
    !verifiedUsEquityTradingDay(series, date) ||
    series.points.at(-1)?.date !== date || series.points.at(-1)?.value == null ||
    series.points.some((point) => point.date > date) ||
    chartObservations(series).issues.length) return false;
  return afterConservativeClose(asOf, date) && afterConservativeClose(series.retrieved_at, date);
}

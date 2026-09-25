import type { Series } from "./design-schema";

export type ChartObservation = Series["points"][number] & { value: number };
export type ChartExclusion = {
  date: string;
  kind: "explicit-null" | "absent-date";
  reason: string;
  source_url: string;
};
export type ChartObservationIssue = {
  code:
    | "missing_endpoint"
    | "insufficient_observations"
    | "invalid_dates"
    | "unexpected_missing"
    | "unverified_calendar"
    | "missing_period"
    | "long_gap";
  message: string;
  dates: string[];
};
export type ChartObservationPlan = {
  calendar: string;
  points: ChartObservation[];
  segments: ChartObservation[][];
  exclusions: ChartExclusion[];
  issues: ChartObservationIssue[];
};

const DAY = 86_400_000;
const FED_CALENDAR = "https://www.federalreserve.gov/aboutthefed/k8.htm";
const WTI_HISTORY = "https://www.eia.gov/dnav/pet/hist/RWTCd.htm";
const BRENT_HISTORY = "https://www.eia.gov/dnav/pet/hist/rbrteD.htm";
const NYSE_CALENDAR = "https://www.nyse.com/trade/hours-calendars";
const NASDAQ_CALENDAR =
  "https://www.nasdaq.com/market-activity/stock-market-holiday-schedule";
const FX_CALENDAR =
  "https://twelvedata.com/news/forex-api-accessing-the-66-trillion-market";
const day = (time: number) => new Date(time).toISOString().slice(0, 10);
const time = (date: string) => Date.parse(`${date}T00:00:00Z`);
const nthMonday = (year: number, month: number, nth: number) => {
  const first = Date.UTC(year, month - 1, 1);
  return day(
    first + (((8 - new Date(first).getUTCDay()) % 7) + (nth - 1) * 7) * DAY,
  );
};
const observedFixed = (year: number, month: number, date: number) => {
  const stamp = Date.UTC(year, month - 1, date);
  const weekday = new Date(stamp).getUTCDay();
  return day(stamp + (weekday === 6 ? -1 : weekday === 0 ? 1 : 0) * DAY);
};

// K.8 explicitly covers 2026–2030 and distinguishes Board closures from Reserve
// Bank Friday operations. This is a Treasury/Board calendar, not an exchange
// calendar; Good Friday is intentionally not inferred from stock-market rules.
function treasuryHoliday(date: string): string | null {
  const year = Number(date.slice(0, 4));
  if (year < 2026 || year > 2030) return null;
  const holidays = new Map<string, string>([
    [observedFixed(year, 1, 1), "New Year's Day"],
    [nthMonday(year, 1, 3), "Martin Luther King Jr. Day"],
    [nthMonday(year, 2, 3), "Washington's Birthday"],
    [
      day(
        Date.UTC(year, 5, 0) -
          ((new Date(Date.UTC(year, 5, 0)).getUTCDay() + 6) % 7) * DAY,
      ),
      "Memorial Day",
    ],
    [observedFixed(year, 6, 19), "Juneteenth"],
    [observedFixed(year, 7, 4), "Independence Day"],
    [nthMonday(year, 9, 1), "Labor Day"],
    [nthMonday(year, 10, 2), "Columbus Day"],
    [observedFixed(year, 11, 11), "Veterans Day"],
    [
      day(
        Date.UTC(year, 10, 1) +
          (((11 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7) + 21) * DAY,
      ),
      "Thanksgiving Day",
    ],
    [observedFixed(year, 12, 25), "Christmas Day"],
  ]);
  // A following year's Saturday New Year can close the preceding Friday.
  if (year < 2030)
    holidays.set(observedFixed(year + 1, 1, 1), "New Year's Day observed");
  return holidays.get(date) ?? null;
}

const wtiClosures: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Washington's Birthday",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day observed",
  "2026-09-07": "Labor Day",
};
const brentClosures: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-05-04": "Early May bank holiday",
  "2026-05-25": "Spring bank holiday",
  "2026-08-31": "Summer bank holiday",
};
// Full-day closures shared by the official NYSE/Nasdaq 2026 schedules.
// Early closes (Nov 27 / Dec 24) are trading days and must not be excluded.
const usEquityClosures: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Washington's Birthday",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day observed",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
};

/** Classified from provider metadata only; a ticker/symbol never determines a calendar. */
export function marketCalendarFromMetadata(
  meta: NonNullable<Series["marketMetadata"]>,
): NonNullable<Series["marketCalendar"]> {
  const type = meta.instrumentType.trim().toLowerCase().replaceAll(" ", "");
  if (type === "digitalcurrency") return "crypto-24x7";
  if (["physicalcurrency", "forex"].includes(type)) return "fx-weekdays";
  const exchange = meta.exchange?.trim().toUpperCase();
  const mic = meta.micCode?.trim().toUpperCase();
  const verifiedVenue = mic
    ? ["XNAS", "XNGS", "XNYS", "ARCX", "XASE"].includes(mic)
    : ["NASDAQ", "NYSE", "NYSE ARCA", "NYSE AMERICAN"].includes(exchange ?? "");
  return verifiedVenue &&
    [
      "commonstock",
      "etf",
      "depositaryreceipt",
      "americandepositaryreceipt",
      "reit",
      "preferredstock",
    ].includes(type)
    ? "us-equities"
    : "unknown";
}

function calendarFor(series: Series) {
  if (series.provider === "fixture") return "fixture-weekdays";
  if (series.provider === "fred") {
    if (
      /^DGS(?:[0-9]+|[0-9]+MO)$/.test(series.symbol) ||
      series.symbol === "T10YIE"
    )
      return "us-treasury-2026-2030";
    if (series.symbol === "DCOILWTICO") return "eia-wti-verified-2026";
    if (series.symbol === "DCOILBRENTEU") return "eia-brent-verified-2026";
  }
  if (series.provider === "twelve") {
    const verified = series.marketMetadata
      ? marketCalendarFromMetadata(series.marketMetadata)
      : "unknown";
    if (verified === "crypto-24x7") return verified;
    if (verified === "us-equities" && series.marketCalendar === verified)
      return "us-equities-2026";
    if (verified === "fx-weekdays" || series.semantics.kind === "fx")
      return "fx-weekdays";
  }
  return "unverified";
}

function closure(series: Series, calendar: string, date: string) {
  if (calendar === "unverified" || calendar === "crypto-24x7") return null;
  const weekday = new Date(time(date)).getUTCDay();
  const source_url = calendar.startsWith("us-treasury")
    ? FED_CALENDAR
    : calendar.startsWith("eia-wti")
      ? WTI_HISTORY
      : calendar.startsWith("eia-brent")
        ? BRENT_HISTORY
        : calendar.startsWith("us-equities")
          ? series.marketMetadata?.exchange?.toUpperCase() === "NASDAQ"
            ? NASDAQ_CALENDAR
            : NYSE_CALENDAR
          : calendar === "fx-weekdays"
            ? FX_CALENDAR
            : series.source_url;
  if (weekday === 0 || weekday === 6)
    return { reason: "Scheduled weekend non-observation", source_url };
  const holiday = calendar.startsWith("us-treasury")
    ? treasuryHoliday(date)
    : calendar.startsWith("eia-wti")
      ? wtiClosures[date]
      : calendar.startsWith("eia-brent")
        ? brentClosures[date]
        : calendar.startsWith("us-equities")
          ? usEquityClosures[date]
          : null;
  return holiday
    ? { reason: `Verified non-observation: ${holiday}`, source_url }
    : null;
}

/** Session checks share this bounded venue/calendar evidence; never infer from a ticker. */
export function verifiedUsEquityTradingDay(series: Series, date: string): boolean {
  const stamp = time(date);
  return series.provider === "twelve" && calendarFor(series) === "us-equities-2026" &&
    /^2026-\d{2}-\d{2}$/.test(date) && Number.isFinite(stamp) && day(stamp) === date &&
    closure(series, "us-equities-2026", date) === null;
}

/**
 * A view of observed values, never a repaired dataset. Only verified calendar
 * exclusions may join two real observations. Unresolved gaps remain in issues; segments preserve visible discontinuities.
 * Original dates/values/nulls are untouched; date-axis spacing remains real time.
 */
export function chartObservations(series: Series): ChartObservationPlan {
  const calendar = calendarFor(series);
  const plan: ChartObservationPlan = {
    calendar,
    points: [],
    segments: [],
    exclusions: [],
    issues: [],
  };
  const raw = series.points;
  const issue = (
    code: ChartObservationIssue["code"],
    message: string,
    dates: string[],
  ) => plan.issues.push({ code, message: `${series.id}: ${message}`, dates });
  if (
    raw.some(
      (point, i) =>
        !Number.isFinite(time(point.date)) ||
        day(time(point.date)) !== point.date ||
        (i > 0 && point.date <= raw[i - 1].date),
    )
  ) {
    issue(
      "invalid_dates",
      "invalid, duplicate or unsorted observation dates",
      [],
    );
    return plan;
  }
  if (!raw.length || raw[0].value === null || raw.at(-1)!.value === null)
    issue(
      "missing_endpoint",
      "baseline/latest observation missing; do not trim or replace endpoints",
      [raw[0]?.date, raw.at(-1)?.date].filter((date): date is string =>
        Boolean(date),
      ),
    );
  plan.points = raw
    .filter((point): point is ChartObservation => point.value !== null)
    .map((point) => ({ ...point }));
  if (plan.points.length < 2) {
    issue(
      "insufficient_observations",
      "at least two actual observations required",
      [],
    );
    return plan;
  }
  const rawDates = new Map(raw.map((point) => [point.date, point]));
  let segment: ChartObservation[] = [];
  for (const point of plan.points) {
    const previous = segment.at(-1);
    let interrupted = false;
    if (previous) {
      const elapsed = (time(point.date) - time(previous.date)) / DAY;
      if (series.semantics.frequency === "daily") {
        if (elapsed > 10) {
          issue(
            "long_gap",
            "long unexplained daily gap; missing source observations",
            [previous.date, point.date],
          );
          interrupted = true;
        } else {
          const unknownDates: string[] = [];
          for (
            let cursor = time(previous.date) + DAY;
            cursor < time(point.date);
            cursor += DAY
          ) {
            const date = day(cursor);
            const scheduled = closure(series, calendar, date);
            if (scheduled)
              plan.exclusions.push({
                date,
                kind: rawDates.has(date) ? "explicit-null" : "absent-date",
                ...scheduled,
              });
            else unknownDates.push(date);
          }
          if (unknownDates.length) {
            issue(
              calendar === "unverified"
                ? "unverified_calendar"
                : "unexpected_missing",
              calendar === "unverified"
                ? "calendar is unverified; do not infer stock/FX/crypto closures. Missing instrument calendar"
                : "unexplained missing daily observations; never bridge or interpolate",
              unknownDates,
            );
            interrupted = true;
          }
        }
      } else {
        const explicitMissing = raw
          .filter(
            (candidate) =>
              candidate.date > previous.date &&
              candidate.date < point.date &&
              candidate.value === null,
          )
          .map((candidate) => candidate.date);
        const months =
          (Number(point.date.slice(0, 4)) - Number(previous.date.slice(0, 4))) *
            12 +
          Number(point.date.slice(5, 7)) -
          Number(previous.date.slice(5, 7));
        const normalCadence =
          series.semantics.frequency === "weekly"
            ? elapsed >= 4 && elapsed <= 10
            : months === (series.semantics.frequency === "monthly" ? 1 : 3);
        if (explicitMissing.length || !normalCadence) {
          issue(
            "missing_period",
            "missing observation period; do not substitute a release date or interpolate",
            explicitMissing.length
              ? explicitMissing
              : [previous.date, point.date],
          );
          interrupted = true;
        }
      }
    }
    if (interrupted) {
      plan.segments.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length) plan.segments.push(segment);
  return plan;
}

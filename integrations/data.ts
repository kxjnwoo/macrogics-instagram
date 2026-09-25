import { seriesSchema, type DataRequest, type Series } from "./schema";
import { fetchJSON, required } from "./io";
import { marketCalendarFromMetadata } from "../src/chart-observations";
type Request = DataRequest;
const dailyNumber = (value: unknown): number | null => {
  if (value == null || (typeof value === "string" && !value.trim()))
    return null;
  if (
    !["string", "number"].includes(typeof value) ||
    !Number.isFinite(Number(value))
  )
    throw Error("Twelve Data returned an invalid numeric observation");
  return Number(value);
};
export async function fetchSeries(r: Request, asOf: string): Promise<Series> {
  const retrieved_at = new Date().toISOString();
  if (r.provider === "farside")
    throw Error(
      "Farside requires an independently fetched primary table snapshot via farsideSeries; do not substitute ETF prices for flows",
    );
  if (r.provider === "fred") {
    if (!["yield", "spot", "economic"].includes(r.semantics.kind))
      throw Error(`Invalid FRED semantic kind: ${r.id}`);
    const cutoffDay = new Date(asOf).toISOString().slice(0, 10);
    const vintage = r.semantics.vintage ?? cutoffDay;
    // FRED vintages identify a calendar day, not an intraday publication time.
    // Block look-ahead before credentials are read or any request is sent.
    if (vintage > cutoffDay)
      throw Error(`FRED vintage after cutoff UTC day: ${r.id}`);
    const base = "https://api.stlouisfed.org/fred/";
    const params = {
      api_key: required("FRED_API_KEY"),
      file_type: "json",
      series_id: r.symbol,
    };
    const [meta, result] = await Promise.all([
      fetchJSON(base + "series?" + new URLSearchParams(params)),
      fetchJSON(
        base +
          "series/observations?" +
          new URLSearchParams({
            ...params,
            observation_start: r.start,
            observation_end: r.end,
            realtime_start: vintage,
            realtime_end: vintage,
          }),
      ),
    ]);
    const m = meta.seriess?.[0];
    if (!m || !Array.isArray(result.observations))
      throw Error(`FRED response invalid: ${r.id}`);
    const frequency = (
      {
        Daily: "daily",
        Weekly: "weekly",
        Monthly: "monthly",
        Quarterly: "quarterly",
      } as Record<string, string>
    )[m.frequency];
    const unit = r.semantics.unit === "%" ? "Percent" : r.semantics.unit;
    if (
      m.units !== unit ||
      frequency !== r.semantics.frequency ||
      m.seasonal_adjustment !== r.semantics.seasonalAdjustment
    )
      throw Error(
        `FRED metadata differs from requested units/frequency/seasonal adjustment: ${r.id}`,
      );
    if (r.semantics.revision === "initial")
      throw Error(
        "Initial release requires independently verified release vintage; use latest_vintage with explicit vintage date",
      );
    if (
      r.semantics.kind === "spot" &&
      !["DCOILWTICO", "DCOILBRENTEU"].includes(r.symbol)
    )
      throw Error("Only documented FRED oil spot series supported");
    if (r.semantics.kind === "yield" && !/^DGS/.test(r.symbol))
      throw Error("Yield adapter expects Treasury DGS series");
    return seriesSchema.parse({
      id: r.id,
      provider: "fred",
      symbol: r.symbol,
      title: m.title,
      source_url: `https://fred.stlouisfed.org/series/${r.symbol}`,
      publisher: "FRED / " + m.title,
      retrieved_at,
      published_at: null,
      semantics: { ...r.semantics, vintage, revision: "latest_vintage" },
      points: result.observations.map((p: any) => ({
        date: p.date,
        value: p.value === "." ? null : Number(p.value),
      })),
    });
  }
  if (!["close", "adjusted_close", "fx"].includes(r.semantics.kind))
    throw Error(
      "Twelve adapter supports explicit close/adjusted_close/FX; total return and futures need separate audited adapter",
    );
  if (r.semantics.frequency !== "daily")
    throw Error("Twelve adapter currently supports daily bars only");
  if (r.semantics.kind === "close" && r.semantics.adjustment !== "none")
    throw Error("Unadjusted close must use adjust=none");
  if (
    r.semantics.kind === "adjusted_close" &&
    !["splits", "all"].includes(r.semantics.adjustment)
  )
    throw Error("Adjusted close must specify splits or all");
  if (
    r.semantics.kind === "fx" &&
    (!r.semantics.fxDirection || !r.symbol.includes("/"))
  )
    throw Error("FX base/quote direction required");
  const data = await fetchJSON(
    "https://api.twelvedata.com/time_series?" +
      new URLSearchParams({
        symbol: r.symbol,
        interval: "1day",
        start_date: r.start,
        // Daily dates are exchange-local. A bare end date can stop at midnight
        // and omit that day's bar; include its full authored calendar day.
        end_date: `${r.end}T23:59:59`,
        order: "ASC",
        outputsize: "5000",
        adjust:
          r.semantics.adjustment === "not_applicable"
            ? "none"
            : r.semantics.adjustment,
        apikey: required("TWELVE_DATA_API_KEY"),
      }),
  );
  if (data.status === "error" || !data.values?.length || !data.meta)
    throw Error(`Twelve Data unavailable: ${r.symbol}`);
  if (
    data.values.some((point: { datetime?: unknown }) => {
      if (typeof point.datetime !== "string") return true;
      const date = point.datetime.slice(0, 10);
      const instant = Date.parse(`${date}T00:00:00Z`);
      return (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(instant) ||
        new Date(instant).toISOString().slice(0, 10) !== date ||
        date < r.start ||
        date > r.end
      );
    })
  )
    throw Error(
      `Twelve Data returned observations outside the authored date window: ${r.id}`,
    );
  if (
    r.semantics.currency &&
    data.meta.currency &&
    data.meta.currency !== r.semantics.currency
  )
    throw Error("Currency mismatch");
  const marketMetadata = {
    exchange:
      typeof data.meta.exchange === "string" ? data.meta.exchange : null,
    micCode: typeof data.meta.mic_code === "string" ? data.meta.mic_code : null,
    instrumentType:
      typeof data.meta.type === "string" ? data.meta.type : "unknown",
  };
  return seriesSchema.parse({
    id: r.id,
    provider: "twelve",
    symbol: r.symbol,
    title: r.title,
    source_url: `https://twelvedata.com/markets/${encodeURIComponent(r.symbol)}`,
    publisher: "Twelve Data",
    retrieved_at,
    published_at: null,
    marketMetadata,
    marketCalendar: marketCalendarFromMetadata(marketMetadata),
    semantics: r.semantics,
    points: data.values.map((p: any) => ({
      date: p.datetime.slice(0, 10),
      value: dailyNumber(p.close),
      open: dailyNumber(p.open) ?? undefined,
      high: dailyNumber(p.high) ?? undefined,
      low: dailyNumber(p.low) ?? undefined,
    })),
  });
}
export async function companyProfile(symbol: string) {
  const p = await fetchJSON(
    "https://finnhub.io/api/v1/stock/profile2?" +
      new URLSearchParams({ symbol, token: required("FINNHUB_API_KEY") }),
  );
  if (!p.name || !p.ticker) throw Error(`No Finnhub profile: ${symbol}`);
  return {
    symbol: p.ticker,
    name: p.name,
    logo: p.logo || null,
    country: p.country,
    industry: p.finnhubIndustry,
    source_url: `https://finnhub.io/`,
    retrieved_at: new Date().toISOString(),
  };
}

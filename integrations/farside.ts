import type { Series } from "./schema";
// Import the primary table's saved web text, preserving parentheses and missing
// per-fund cells. A displayed total of 0 with '-' inputs is NOT a zero flow.
export function parseFarsideTable(text: string) {
  if (
    !text.includes("Bitcoin ETF Flow (US$m)") ||
    !text.includes("Farside Investors")
  )
    throw Error("Unrecognized Farside BTC table");
  const rows: { date: string; value: number | null; raw: string }[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(
      /(?:L\d+:\s*)?(\d{2} [A-Z][a-z]{2} \d{4})\s*\|(.+)/,
    );
    if (!match) continue;
    const date = new Date(match[1] + " 00:00:00 UTC")
      .toISOString()
      .slice(0, 10);
    const fields = match[2]
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    if (fields.length !== 13) throw Error("Unexpected ETF fund/total columns");
    const parse = (s: string) =>
      s === "-"
        ? null
        : Number(s.replaceAll(",", "").replace(/^\((.*)\)$/, "-$1"));
    const funds = fields.slice(0, -1).map(parse),
      total = parse(fields.at(-1)!);
    if (
      funds.some((v) => v !== null && !Number.isFinite(v)) ||
      (total !== null && !Number.isFinite(total))
    )
      throw Error("Invalid ETF amount");
    const complete = funds.every((v) => v !== null);
    if (
      complete &&
      total !== null &&
      Math.abs(funds.reduce<number>((a, v) => a + v!, 0) - total) > 0.65
    )
      throw Error("ETF total differs from fund rows");
    rows.push({
      date,
      value: complete && total !== null ? Math.round(total * 1e6) : null,
      raw: line,
    });
  }
  if (
    rows.length < 2 ||
    rows.some((r, i) => i > 0 && r.date <= rows[i - 1].date)
  )
    throw Error("Missing or unordered Farside rows");
  return rows;
}
export function farsideSeries(
  text: string,
  retrieved_at: string,
  cutoffDay: string,
): Series {
  const rows = parseFarsideTable(text),
    points = rows
      .filter((r) => r.date < cutoffDay)
      .map(({ date, value }) => ({ date, value }));
  return {
    id: "btc-etf-flow",
    provider: "farside",
    symbol: "US-SPOT-BTC-ETF-NET-FLOW",
    title: "미국 비트코인 ETF 순유입",
    source_url: "https://farside.co.uk/btc/",
    publisher: "Farside",
    retrieved_at,
    published_at: null,
    semantics: {
      kind: "economic",
      unit: "USD",
      currency: "USD",
      adjustment: "not_applicable",
      fxDirection: null,
      frequency: "daily",
      vintage: null,
      revision: "latest_vintage",
      seasonalAdjustment: "Not Seasonally Adjusted",
      maxAgeDays: 7,
    },
    points,
  };
}

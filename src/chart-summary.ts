import type { Series } from "./design-schema";

const formatted = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Math.abs(value) < 0.0000001 ? 0 : value,
  );
const signed = (value: number) => `${value > 0 ? "+" : ""}${formatted(value)}`;

const fredLegendNames: Readonly<Record<string, string>> = {
  DCOILBRENTEU: "Brent",
  DCOILWTICO: "WTI",
  DGS1: "US 1Y",
  DGS2: "US 2Y",
  DGS5: "US 5Y",
  DGS10: "US 10Y",
  DGS30: "US 30Y",
};

/** Viewer-facing aliases only; the source series ID and accessible title stay intact. */
export function chartLegend(series: Pick<Series, "provider" | "symbol">) {
  return (
    (series.provider === "fred" && fredLegendNames[series.symbol]) ||
    series.symbol
  );
}

/** A summary of actual boundary observations; never substitutes missing endpoints. */
export function chartSummary(series: Series, index = false) {
  const first = series.points[0];
  const last = series.points.at(-1);
  if (!first || !last || first.value === null || last.value === null)
    return null;
  const { kind, unit } = series.semantics;
  const percentUnit = /^(%|percent)$/i.test(unit.trim());
  const difference = last.value - first.value;
  if (index && first.value <= 0) return null;
  const start = index ? 100 : first.value;
  const end = index ? (last.value / first.value) * 100 : last.value;
  const suffix = !index && percentUnit ? "%" : "";
  let change: string;
  if (index) {
    change = `${signed(end - start)}%`;
  } else if (kind === "yield" && percentUnit) {
    change = `${signed(difference * 100)} bp`;
  } else if (percentUnit) {
    change = `${signed(difference)}%p`;
  } else if (
    [
      "close",
      "adjusted_close",
      "fx",
      "spot",
      "futures",
      "total_return_index",
    ].includes(kind) &&
    first.value > 0
  ) {
    change = `${signed((difference / first.value) * 100)}%`;
  } else {
    // Absolute difference in the unit declared above the chart, not an inferred return.
    change = `Δ ${signed(difference)}`;
  }
  return {
    start: `${formatted(start)}${suffix}`,
    end: `${formatted(end)}${suffix}`,
    change,
    from: first.date,
    to: last.date,
  };
}

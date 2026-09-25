import type { SceneVisual, Series } from "./design-schema";
export function chartHeading(
  chart: NonNullable<SceneVisual["chart"]>,
  series: Series[],
) {
  if (chart.kind === "sector-valuation")
    return `${chart.title ?? "섹터별 지수 FY1 예상 PER"} (단위: 배)`;
  const title = chart.title ?? series.map((s) => s.title).join(" / ");
  const unit =
    chart.kind === "index"
      ? "기준값 = 100"
      : chart.kind === "performance"
        ? "%"
        : [
            ...new Set(
              series.map((s) =>
                s.semantics.unit === "Dollars per Barrel" &&
                s.semantics.currency === "USD"
                  ? "달러/배럴"
                  : s.semantics.unit,
              ),
            ),
          ].join(" / ");
  return `${title} (단위: ${unit})`;
}

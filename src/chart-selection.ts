import type { SceneVisual, Series } from "./design-schema";
export function chartSeriesForScene(scene: SceneVisual, series: Series[]): Series[] {
  return (scene.chart?.seriesIds ?? []).map((id) => {
    const source = series.find((s) => s.id === id);
    if (!source) throw Error(`Unknown chart series ${id}`);
    const points = source.points.filter(
      (p) =>
        (!scene.chart?.startDate || p.date >= scene.chart.startDate) &&
        (!scene.chart?.endDate || p.date <= scene.chart.endDate),
    );
    if (!points.length) throw Error("Empty chart window");
    return { ...source, points };
  });
}

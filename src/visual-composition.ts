import type { SceneVisual } from "./design-schema";
import type { CompositionElement, DiagramEdge, DiagramNode } from "./composition-schema";
import { cueStartFrame } from "./visual-timing";
import { tokens } from "./tokens";

export const formatStatisticValue = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumSignificantDigits: 12 }).format(value);

export function chartsForScene(scene: SceneVisual): NonNullable<SceneVisual["chart"]>[] {
  return scene.composition
    ? scene.composition.elements.flatMap((item) => item.kind === "chart" ? [item.chart] : [])
    : scene.chart ? [scene.chart] : [];
}

export function chartScenesForScene(scene: SceneVisual): SceneVisual[] {
  return chartsForScene(scene).map((chart) => ({ ...scene, chart, composition: undefined, visual: undefined }));
}

export function compositionAssetIds(scene: SceneVisual): string[] {
  return scene.composition?.elements.flatMap((item) =>
    item.kind === "image" || item.kind === "portrait" ? [item.assetId]
      : item.kind === "diagram" ? item.nodes.flatMap((node) => node.assetId ? [node.assetId] : [])
      : item.kind === "chart" ? Object.values(item.chart.identityAssets ?? {}) : []) ?? [];
}

export function firstContentCue(element: CompositionElement): number {
  const start = element.cueIndex ?? 0;
  if (element.kind === "timeline") return Math.max(start, element.items[0].cueIndex);
  if (element.kind === "relation" && element.cueIndices) return Math.max(start, element.cueIndices[0]);
  if (element.kind === "diagram") return Math.min(...element.nodes.map((node) => Math.max(start, node.cueIndex ?? start)));
  return start;
}

type Point = { x: number; y: number };
/** Anchors stop outside boxes, so connector strokes never cover node text/images. */
export function diagramEdgePoints(from: DiagramNode, to: DiagramNode, edge: DiagramEdge, width: number, height: number): [Point, Point] {
  const center = (node: DiagramNode) => ({ x: (node.box.x + node.box.width / 2) * width, y: (node.box.y + node.box.height / 2) * height });
  const a = center(from), b = center(to);
  const dx = b.x - a.x, dy = b.y - a.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const anchor = (node: DiagramNode, side: NonNullable<DiagramEdge["fromSide"]>) => {
    const c = center(node), gap = 12;
    return side === "left" ? { x: node.box.x * width - gap, y: c.y }
      : side === "right" ? { x: (node.box.x + node.box.width) * width + gap, y: c.y }
      : side === "top" ? { x: c.x, y: node.box.y * height - gap }
      : { x: c.x, y: (node.box.y + node.box.height) * height + gap };
  };
  return [
    anchor(from, edge.fromSide ?? (horizontal ? dx >= 0 ? "right" : "left" : dy >= 0 ? "bottom" : "top")),
    anchor(to, edge.toSide ?? (horizontal ? dx >= 0 ? "left" : "right" : dy >= 0 ? "top" : "bottom")),
  ];
}

export function elementFrames(scene: SceneVisual, element: CompositionElement) {
  return {
    start: element.cueIndex === undefined ? 0 : cueStartFrame(scene.captions, element.cueIndex),
    end: element.endCueIndex === undefined ? scene.durationFrames : cueStartFrame(scene.captions, element.endCueIndex),
    emphasis: element.emphasisCueIndex === undefined ? undefined : cueStartFrame(scene.captions, element.emphasisCueIndex),
  };
}

export function elementCompletionFrame(scene: SceneVisual, element: CompositionElement) {
  const start = elementFrames(scene, element).start;
  if (element.kind === "timeline")
    return Math.max(start, ...element.items.map((item) => cueStartFrame(scene.captions, item.cueIndex))) + 12;
  if (element.kind === "diagram") return Math.max(start,
    ...element.nodes.map((node) => node.cueIndex === undefined ? start : cueStartFrame(scene.captions, node.cueIndex)),
    ...element.edges.map((edge) => cueStartFrame(scene.captions, edge.cueIndex))) + tokens.motion.enter;
  if (element.kind === "relation" && element.cueIndices) return cueStartFrame(scene.captions, element.cueIndices[2]) + tokens.motion.enter;
  if (element.kind !== "chart") return start + (element.motion?.enter && element.motion.enter !== "none" ? tokens.motion.enter : 12);
  if (["line", "area", "index"].includes(element.chart.kind)) return start + tokens.motion.chartReveal;
  if (["bar", "performance"].includes(element.chart.kind)) return start + 36;
  if (element.chart.kind === "sector-valuation") return start + Math.max(0, (element.chart.sectorTickers?.length ?? 1) - 1) * 5 + 16;
  return start + 12;
}

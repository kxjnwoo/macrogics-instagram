import React from "react";
import { CanvasImage, staticFile, useCurrentFrame } from "remotion";
import type { VisualContext, SceneVisual } from "../design-schema";
import type { CompositionElement } from "../composition-schema";
import { elementFrames, formatStatisticValue } from "../visual-composition";
import { cueProgress, cueStartFrame } from "../visual-timing";
import { chartSeriesForScene } from "../chart-selection";
import { chartHeading } from "../chart-heading";
import { tokens as t } from "../tokens";
import { MixedText } from "./MixedText";
import { LineChart, AreaChart, BarChart, PerformanceChart, IndexComparison, CandlestickChart, YieldCurve } from "./Charts";
import { SectorValuationChart } from "./SectorValuationChart";
import { CompositionDiagram } from "./CompositionDiagram";

const localSource = (src: string) => /^(https?:|data:)/.test(src) ? src : staticFile(src);

function ComposedChart({ element, scene, context, width, height, start }: {
  element: Extract<CompositionElement, { kind: "chart" }>;
  scene: SceneVisual; context: VisualContext; width: number; height: number; start: number;
}) {
  const chart = element.chart;
  const series = chartSeriesForScene({ ...scene, chart }, context.series);
  const scaleMax = Math.ceil(Math.max(1, ...(context.valuationSnapshot?.rows.map((row) => row.value) ?? [])) / 10) * 10;
  const heading = chart.kind === "sector-valuation"
    ? `지수 FY1 PER · ${context.valuationSnapshot?.asOfDate ?? "미확인"} · 0–${scaleMax}배`
    : chartHeading(chart, series);
  const Chart = { line: LineChart, area: AreaChart, bar: BarChart, performance: PerformanceChart, index: IndexComparison, candlestick: CandlestickChart }[chart.kind as "line"];
  const plotHeight = height - 58 - (series.length > 1 ? 46 : 0);
  return <div style={{ width, height }}>
    <div data-qa="chart-label" style={{ fontSize: t.size.label, color: t.color.muted, minHeight: 44, marginBottom: 14, textAlign: "right", lineHeight: 1.25 }}>
      <MixedText text={heading} variant="chart" />
    </div>
    {chart.kind === "sector-valuation"
      ? <SectorValuationChart rows={(context.valuationSnapshot?.rows ?? []).filter((row) => chart.sectorTickers?.includes(row.ticker as never))} scaleMax={scaleMax} width={width} height={plotHeight} startFrame={start} />
      : chart.kind === "indicator"
        ? <div style={{ fontSize: 96, color: t.color.accent, lineHeight: 1.2 }}><MixedText text={`${series[0].points.at(-1)!.value} ${series[0].semantics.unit}`} variant="body" /></div>
        : chart.kind === "yield"
          ? <YieldCurve width={width} height={plotHeight} tenors={series.map((item) => ({ years: Number(item.symbol.replace("DGS", "")), label: item.symbol, value: item.points.at(-1)!.value! }))} />
          : <Chart series={series} width={width} height={plotHeight} startFrame={start} pendingDate={chart.pendingDate} />}
    {series.length > 1 && <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 28, lineHeight: 1.25, justifyContent: "center" }}>
      {series.map((item, index) => <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 16, height: 16, flexShrink: 0, background: index ? t.color.negative : t.color.accent }} />
        <MixedText text={item.title} variant="chart" />
      </div>)}
    </div>}
  </div>;
}

function Content({ element, scene, context, width, height, frame, start }: {
  element: CompositionElement; scene: SceneVisual; context: VisualContext; width: number; height: number; frame: number; start: number;
}) {
  if (element.kind === "chart") return <ComposedChart {...{ element, scene, context, width, height, start }} />;
  if (element.kind === "diagram") return <CompositionDiagram {...{ element, scene, context, width, height, frame, start }} />;
  if (element.kind === "image" || element.kind === "portrait") {
    const asset = context.visualAssets?.find((item) => item.id === element.assetId);
    if (!asset) throw Error(`Unknown composition asset ${element.assetId}`);
    const portrait = element.kind === "portrait";
    const generated = asset.origin === "generated";
    const labelHeight = portrait ? 120 + (element.quote ? 135 : 0) : element.label ? 84 : 0;
    return <div style={{ width, height, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <CanvasImage src={localSource(asset.src)} name={portrait ? element.name : element.alt} style={{ width: "100%", height: Math.max(1, height - labelHeight - (generated ? 48 : 0)), objectFit: portrait ? "cover" : element.fit ?? "contain", objectPosition: !portrait && element.focus ? `${element.focus.x * 100}% ${element.focus.y * 100}%` : "center" }} />
      {portrait ? <div style={{ textAlign: "center", width: "100%", lineHeight: 1.2 }}>
        <div style={{ fontSize: t.visualText.label }}><MixedText text={element.name} variant="body" /></div>
        <div style={{ fontSize: t.visualText.role, color: t.color.muted, marginTop: 8 }}><MixedText text={element.role} variant="body" /></div>
        {element.quote && <div style={{ fontFamily: t.font.quote, fontSize: t.visualText.quote, marginTop: 18, lineHeight: 1.3 }}><MixedText text={element.quote} /></div>}
      </div> : element.label && <div style={{ fontSize: t.visualText.label, lineHeight: 1.3, textAlign: "center" }}><MixedText text={element.label} variant="body" /></div>}
      {generated && <div style={{ fontSize: 25, color: t.color.muted }}><MixedText text="AI 생성 삽화" variant="chart" /></div>}
    </div>;
  }
  if (element.kind === "statistic") {
    const statistic = context.statistics.find((item) => item.id === element.statisticId);
    if (!statistic || statistic.value === null || !statistic.unit) throw Error("Composition statistic needs a number and unit");
    return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, height, textAlign: "center" }}>
      <div style={{ fontSize: 108, lineHeight: 1.1, color: t.color.accent }}><MixedText text={formatStatisticValue(statistic.value)} variant="body" /></div>
      <div style={{ fontSize: t.visualText.unit, lineHeight: 1.2 }}><MixedText text={statistic.unit} variant="body" /></div>
      <div style={{ fontSize: t.visualText.label, lineHeight: 1.3 }}><MixedText text={element.label} variant="body" /></div>
    </div>;
  }
  if (element.kind === "relation") {
    const vertical = element.direction === "vertical";
    const stepStyle = (index: number) => {
      if (!element.cueIndices) return {};
      const at = cueStartFrame(scene.captions, element.cueIndices[index]);
      return { visibility: frame < at ? "hidden" as const : "visible" as const, opacity: .35 + .65 * cueProgress(frame, at, t.motion.enter) };
    };
    return <div style={{ width, height, display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", justifyContent: "space-evenly", gap: 18, fontSize: t.visualText.label, lineHeight: 1.3, textAlign: "center" }}>
      <div style={{ flex: 1, ...stepStyle(0) }}><MixedText text={element.left} variant="body" /></div>
      <span style={{ color: t.color.accent, fontSize: 64, ...stepStyle(1) }}>{element.operator === "equal" ? "=" : element.operator === "not-equal" ? "≠" : vertical ? "↓" : "→"}</span>
      <div style={{ flex: 1, ...stepStyle(2) }}><MixedText text={element.right} variant="body" /></div>
    </div>;
  }
  if (element.kind === "timeline") return <div style={{ height, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
    {element.items.map((item, index) => {
      const visible = frame >= cueStartFrame(scene.captions, item.cueIndex);
      return <div key={index} style={{ visibility: visible ? "visible" : "hidden", display: "flex", alignItems: "center", gap: 22, fontSize: t.visualText.label, lineHeight: 1.3 }}>
        <span style={{ width: 18, height: 18, borderRadius: 9, flexShrink: 0, background: t.color.accent }} />
        <MixedText text={item.label} variant="body" />
      </div>;
    })}
  </div>;
  const size = element.style === "emphasis" ? 72 : element.style === "label" ? t.visualText.label : t.visualText.body;
  return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: element.align === "left" ? "flex-start" : element.align === "right" ? "flex-end" : "center", fontSize: size, lineHeight: 1.35, color: element.style === "emphasis" ? t.color.accent : t.color.ink, textAlign: element.align ?? "center", whiteSpace: "pre-line", wordBreak: "keep-all" }}><MixedText text={element.text} variant="body" /></div>;
}

export const VisualComposition: React.FC<{ scene: SceneVisual; context: VisualContext }> = ({ scene, context }) => {
  const frame = useCurrentFrame();
  return <div data-qa="central-visual" data-central-visual="composition" style={{ position: "relative", width: t.layout.contentWidth, height: t.layout.centralHeight, fontFamily: t.font.body, fontWeight: t.weight.body, letterSpacing: t.tracking.body }}>
    {scene.composition?.elements.map((element) => {
      const timing = elementFrames(scene, element);
      if (frame < timing.start || frame >= timing.end) return null;
      const width = element.box.width * t.layout.contentWidth;
      const height = element.box.height * t.layout.centralHeight;
      const explicitEnter = element.motion?.enter;
      const progress = explicitEnter === "none" ? 1 : explicitEnter ? .35 + .65 * cueProgress(frame, timing.start, t.motion.enter) : element.cueIndex === undefined ? 1 : 0.35 + 0.65 * cueProgress(frame, timing.start);
      const exit = element.motion?.exit === "fade" && element.endCueIndex !== undefined ? Math.min(1, Math.max(0, (timing.end - frame) / t.motion.enter)) : 1;
      const emphasis = timing.emphasis !== undefined && frame >= timing.emphasis ? Math.sin(Math.min(1, (frame - timing.emphasis) / 24) * Math.PI) : 0;
      const outline = (element.motion?.emphasis ?? "outline") === "outline";
      const inset = explicitEnter === "rise" ? t.motion.offset : 0;
      const shift = explicitEnter === "rise" ? t.motion.offset * Math.pow(1 - cueProgress(frame, timing.start, t.motion.enter), 3) : 0;
      return <div key={element.id} data-composition-element={element.id} data-qa={`composition-${element.id}`} style={{ position: "absolute", left: element.box.x * t.layout.contentWidth, top: element.box.y * t.layout.centralHeight, width, height, opacity: progress * exit, outline: emphasis > 0 && outline ? `2px solid rgba(68,101,87,${emphasis * .5})` : undefined, outlineOffset: 3, boxSizing: "border-box" }}>
        <div style={{ position: "absolute", left: inset, top: inset + shift, width: width - 2 * inset, height: height - 2 * inset }}>
          <Content {...{ element, scene, context, frame }} width={width - 2 * inset} height={height - 2 * inset} start={timing.start} />
        </div>
        {element.motion?.emphasis === "underline" && emphasis > 0 && <div style={{ position: "absolute", left: "20%", bottom: 3, width: "60%", height: 3, opacity: emphasis, background: t.color.accent }} />}
      </div>;
    })}
  </div>;
};

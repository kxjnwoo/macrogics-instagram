import { ChartText } from "./ChartText";
import { formatUsd } from "../currency-notation";
import React, { useId } from "react";
import { chartAnimation, chartHead } from "../chart-motion";
import { chartObservations } from "../chart-observations";
import { chartSummary } from "../chart-summary";
import { interpolate, useCurrentFrame } from "remotion";
import type { Series } from "../design-schema";
import { tokens as t } from "../tokens";
type P = {
  series: Series[];
  opening?: boolean;
  startFrame?: number;
  pendingDate?: string;
  width?: number;
  height?: number;
};
const L = 110,
  R = 44,
  T = 44,
  B = 80;
const number = (v: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
// Axis guides do not need cents at five-digit price levels. Keep original
// observations/path coordinates unchanged while fitting the shared label gutter.
const axisNumber = (v: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
  }).format(v);
export const LineChart: React.FC<P & { area?: boolean; index?: boolean }> = ({
  series,
  area = false,
  index = false,
  startFrame = 0,
  width: W = t.layout.contentWidth,
  height: H = t.layout.chartHeight,
}) => {
  const f = useCurrentFrame();
  const revealId = useId().replaceAll(":", "");
  const observations = series.map(chartObservations);
  const observationErrors = observations.flatMap((plan) =>
    plan.issues.map((issue) => issue.message),
  );
  if (observationErrors.length) throw Error(observationErrors.join("; "));
  if (series.length > 2)
    throw Error("Line charts support at most two clearly identified series");
  if (index && series.some((s) => !chartSummary(s, true)))
    throw Error(
      "Index comparison requires present endpoints and a positive baseline",
    );
  // Numeric takeaways and their color/logo identities live together in the body below.
  const plotTop = T;
  const points = series.flatMap((s) =>
    s.points.filter((p) => p.value !== null),
  );
  if (!points.length) return <div>데이터 없음</div>;
  const values = series.flatMap((s) =>
    s.points
      .filter((p) => p.value !== null)
      .map((p) =>
        index
          ? (p.value! / s.points.find((q) => q.value !== null)!.value!) * 100
          : p.value!,
      ),
  );
  const rawMin = Math.min(...values),
    rawMax = Math.max(...values),
    pad = (rawMax - rawMin || Math.abs(rawMax) * 0.05 || 1) * 0.15;
  const min = rawMin - pad,
    max = rawMax + pad;
  const dates = points.map((p) => Date.parse(p.date)),
    d0 = Math.min(...dates),
    d1 = Math.max(...dates);
  const x = (d: string) =>
    L + ((Date.parse(d) - d0) / (d1 - d0 || 1)) * (W - L - R);
  const y = (v: number) =>
    H - B - ((v - min) / (max - min)) * (H - B - plotTop);
  const { progress, ripple } = chartAnimation(f - startFrame, t.motion);
  const edge = L + progress * (W - L - R);
  return (
    <svg
      data-qa="chart"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        display: "block",
        overflow: "visible",
        fontFamily: t.font.latin,
        letterSpacing: t.tracking.chart,
      }}
    >
      <title>
        {series
          .map(
            (s) =>
              `${s.title} (${s.symbol}), ${index ? "first observation = 100" : s.semantics.unit}`,
          )
          .join("; ")}
      </title>
      {[0, 0.5, 1].map((k) => (
        <g key={k}>
          <line
            x1={L}
            x2={W - R}
            y1={y(min + k * (max - min))}
            y2={y(min + k * (max - min))}
            stroke={t.color.line}
          />
          <ChartText
            x={L - 16}
            y={y(min + k * (max - min)) + 9}
            textAnchor="end"
            fontSize={26}
            fill={t.color.muted}
          >
            {!index && series[0].semantics.currency === "USD"
              ? "$" + axisNumber(min + k * (max - min))
              : axisNumber(min + k * (max - min))}
          </ChartText>
        </g>
      ))}
      <clipPath id={revealId}>
        <rect x={0} y={0} width={edge} height={H} />
      </clipPath>
      {series.map((s, i) => {
        const first = s.points.find((p) => p.value !== null);
        if (!first) return null;
        const base = first.value!;
        const valid = observations[i].points;
        const path = valid
          .map((p, pointIndex) => {
            const cmd = pointIndex === 0 ? "M" : "L";
            return `${cmd}${x(p.date)},${y(index ? (p.value / base) * 100 : p.value)}`;
          })
          .join(" ");
        const color = i ? t.color.negative : t.color.accent;
        const head = chartHead(
          valid.map((p) => ({
            x: x(p.date),
            y:
              p.value === null
                ? null
                : y(index ? (p.value / base) * 100 : p.value),
          })),
          Math.min(edge, x(valid.at(-1)!.date)),
        );
        return (
          <g key={s.id}>
            <g clipPath={`url(#${revealId})`}>
              {area && (
                <path
                  d={`${path} L${x(valid.at(-1)!.date)},${H - B} L${x(valid[0].date)},${H - B} Z`}
                  fill={t.color.accent}
                  opacity={0.1}
                />
              )}
              <path
                d={path}
                fill="none"
                stroke={i ? t.color.negative : t.color.accent}
                strokeWidth={4}
              />
            </g>
            {head && (
              <g aria-label="Chart drawing head">
                {ripple !== null && (
                  <circle
                    cx={head.x}
                    cy={head.y}
                    r={t.motion.chartHeadRadius + ripple * 24}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={(1 - ripple) * 0.28}
                  />
                )}
                <circle
                  cx={head.x}
                  cy={head.y}
                  r={t.motion.chartHeadRadius}
                  fill={color}
                />
              </g>
            )}
          </g>
        );
      })}
      <ChartText x={L} y={H - 20} fontSize={26} fill={t.color.muted}>
        {new Date(d0).toISOString().slice(0, 10)}
      </ChartText>
      <ChartText
        x={W - R}
        y={H - 20}
        textAnchor="end"
        fontSize={26}
        fill={t.color.muted}
      >
        {new Date(d1).toISOString().slice(0, 10)}
      </ChartText>
    </svg>
  );
};
export const AreaChart: React.FC<P> = (p) => <LineChart {...p} area />;
export const IndexComparison: React.FC<P> = (p) => <LineChart {...p} index />;
export const BarChart: React.FC<P> = ({
  series,
  opening = false,
  startFrame = 0,
  pendingDate,
  width: W = t.layout.contentWidth,
  height: H = t.layout.chartHeight,
}) => {
  const f = useCurrentFrame();
  const s = series[0];
  const pts = [
    ...s.points.slice(-6),
    ...(pendingDate ? [{ date: pendingDate, value: null }] : []),
  ];
  const extent = Math.max(1, ...pts.map((p) => Math.abs(p.value ?? 0))) * 1.3;
  const lo = -extent,
    hi = extent;
  const y = (v: number) => H - B - ((v - lo) / (hi - lo || 1)) * (H - B - T),
    step = (W - L - R) / pts.length;
  return (
    <svg
      data-qa="chart"
      data-chart-kind="bar"
      data-chart-frame={opening ? 36 : f}
      data-chart-start={startFrame}
      data-observation-count={s.points.filter((p) => p.value !== null).length}
      width={W}
      height={H}
      style={{
        display: "block",
        fontFamily: t.font.latin,
        letterSpacing: t.tracking.chart,
      }}
    >
      <line
        data-zero-baseline="true"
        x1={L}
        x2={W - R}
        y1={y(0)}
        y2={y(0)}
        stroke={t.color.muted}
      />
      <ChartText
        x={L - 16}
        y={y(0) + 9}
        textAnchor="end"
        fontSize={26}
        fill={t.color.muted}
      >
        {s.semantics.currency === "USD" ? "$0" : "0"}
      </ChartText>
      {pts.map((p, i) => {
        if (p.value === null)
          return (
            <g key={p.date}>
              <ChartText
                x={L + (i + 0.5) * step}
                y={y(0) - 22}
                textAnchor="middle"
                fontFamily={t.font.body}
                fontSize={28}
                fill={t.color.muted}
              >
                집계 전
              </ChartText>
              <ChartText
                x={L + (i + 0.5) * step}
                y={H - 20}
                textAnchor="middle"
                fontSize={25}
                fill={t.color.muted}
              >
                {p.date.slice(5)}
              </ChartText>
            </g>
          );
        const v =
          p.value *
          (opening
            ? 1
            : interpolate(f - startFrame, [0, 36], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }));
        return (
          <g key={p.date}>
            <rect
              data-bar-value={p.value}
              x={L + i * step + 20}
              y={Math.min(y(0), y(v))}
              width={step - 40}
              height={Math.abs(y(v) - y(0))}
              fill={p.value < 0 ? t.color.negative : t.color.accent}
            />
            <ChartText
              x={L + i * step + step / 2}
              y={p.value >= 0 ? y(v) - 14 : y(v) + 32}
              textAnchor="middle"
              fontSize={28}
              fill={t.color.ink}
            >
              {s.semantics.currency === "USD"
                ? formatUsd(p.value)
                : number(p.value)}
            </ChartText>
            <ChartText
              x={L + i * step + step / 2}
              y={H - 20}
              textAnchor="middle"
              fontSize={23}
              fill={t.color.muted}
            >
              {p.date.slice(5)}
            </ChartText>
          </g>
        );
      })}
    </svg>
  );
};
export const PerformanceChart: React.FC<P> = ({ series, ...props }) => (
  <BarChart
    {...props}
    series={series.map((s) => ({
      ...s,
      points: s.points.map((p) => ({
        ...p,
        value:
          p.value === null ? null : (p.value / s.points[0].value! - 1) * 100,
      })),
    }))}
  />
);
export const CandlestickChart: React.FC<P> = ({ series, width: W = t.layout.contentWidth, height: H = t.layout.chartHeight }) => {
  const pts = series[0].points.slice(-14);
  if (
    pts.some(
      (p) =>
        p.open === undefined ||
        p.high === undefined ||
        p.low === undefined ||
        p.value === null,
    )
  )
    throw Error("OHLC required");
  const lo = Math.min(...pts.map((p) => p.low!)),
    hi = Math.max(...pts.map((p) => p.high!));
  const y = (v: number) => H - B - ((v - lo) / (hi - lo || 1)) * (H - B - T),
    step = (W - L - R) / pts.length;
  return (
    <svg
      data-qa="chart"
      width={W}
      height={H}
      style={{
        display: "block",
        fontFamily: t.font.latin,
        letterSpacing: t.tracking.chart,
      }}
    >
      {pts.map((p, i) => (
        <g
          key={p.date}
          stroke={p.value! >= p.open! ? t.color.accent : t.color.negative}
        >
          <line
            x1={L + i * step + step / 2}
            x2={L + i * step + step / 2}
            y1={y(p.high!)}
            y2={y(p.low!)}
          />
          <rect
            x={L + i * step + step * 0.25}
            y={Math.min(y(p.open!), y(p.value!))}
            width={step * 0.5}
            height={Math.max(2, Math.abs(y(p.open!) - y(p.value!)))}
            fill={p.value! >= p.open! ? t.color.accent : t.color.negative}
          />
        </g>
      ))}
      <ChartText x={L} y={H - 20} fontSize={24}>
        {pts[0].date}
      </ChartText>
      <ChartText x={W - R} y={H - 20} textAnchor="end" fontSize={24}>
        {pts.at(-1)!.date}
      </ChartText>
      <ChartText x={0} y={T + 10} fontSize={24}>
        {number(hi)}
      </ChartText>
      <ChartText x={0} y={H - B} fontSize={24}>
        {number(lo)}
      </ChartText>
    </svg>
  );
};
export const YieldCurve: React.FC<{
  tenors: { years: number; label: string; value: number }[];
  width?: number;
  height?: number;
}> = ({ tenors, width: W = t.layout.contentWidth, height: H = t.layout.chartHeight }) => {
  const maxX = Math.max(...tenors.map((p) => p.years)),
    lo = Math.min(...tenors.map((p) => p.value)) - 0.2,
    hi = Math.max(...tenors.map((p) => p.value)) + 0.2;
  const x = (v: number) => L + (v / maxX) * (W - L - R),
    y = (v: number) => H - B - ((v - lo) / (hi - lo)) * (H - B - T);
  return (
    <svg
      data-qa="chart"
      width={W}
      height={H}
      style={{
        display: "block",
        fontFamily: t.font.latin,
        letterSpacing: t.tracking.chart,
      }}
    >
      <path
        d={tenors
          .map((p, i) => `${i ? "L" : "M"}${x(p.years)},${y(p.value)}`)
          .join(" ")}
        stroke={t.color.accent}
        strokeWidth={4}
        fill="none"
      />
      {tenors.map((p) => (
        <g key={p.label}>
          <ChartText
            x={x(p.years)}
            y={y(p.value) - 18}
            textAnchor="middle"
            fontSize={25}
          >
            {p.value}%
          </ChartText>
          <ChartText
            x={x(p.years)}
            y={H - 20}
            textAnchor="middle"
            fontSize={24}
          >
            {p.label}
          </ChartText>
        </g>
      ))}
    </svg>
  );
};

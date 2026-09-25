import React from "react";
import { CanvasImage, interpolate, useCurrentFrame } from "remotion";
import { MixedText } from "./MixedText";
import { tokens as t } from "../tokens";
export const NumberCounter: React.FC<{ value: number; unit?: string }> = ({
  value,
  unit = "",
}) => {
  const f = useCurrentFrame();
  return (
    <span
      style={{
        fontFamily: t.font.number,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: t.tracking.chart,
      }}
    >
      {interpolate(f, [0, 40], [0, value], {
        extrapolateRight: "clamp",
      }).toFixed(2)}
      {unit}
    </span>
  );
};
export const PercentageChange: React.FC<{ from: number; to: number }> = ({
  from,
  to,
}) => {
  if (!from) throw Error("Zero denominator");
  const n = (to / from - 1) * 100;
  return (
    <span
      style={{
        fontFamily: t.font.number,
        letterSpacing: t.tracking.chart,
        color: n < 0 ? t.color.negative : t.color.accent,
      }}
    >
      {n > 0 ? "+" : ""}
      {n.toFixed(2)}%
    </span>
  );
};
export const MacroIndicator: React.FC<{
  value: number;
  unit: string;
  label: string;
}> = ({ value, unit, label }) => (
  <div style={{ letterSpacing: t.tracking.chartKorean }}>
    <div data-qa="metric" style={{ fontSize: 150 }}>
      <NumberCounter value={value} unit={unit} />
    </div>
    <div data-qa="metric-label" style={{ fontSize: 32, color: t.color.muted }}>
      <MixedText text={label} variant="chart" />
    </div>
  </div>
);
export const QuoteCard: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-qa="quote"
    style={{
      fontFamily: t.font.quote,
      fontSize: t.size.quote,
      fontWeight: t.weight.quote,
      letterSpacing: t.tracking.quote,
      whiteSpace: "pre-line",
      wordBreak: "keep-all",
      lineHeight: 1.4,
      borderLeft: `2px solid ${t.color.accent}`,
      paddingLeft: 34,
      marginLeft: t.layout.bodyInset,
      marginRight: t.layout.bodyInset,
    }}
  >
    <MixedText text={text} />
  </div>
);
export const EventMarker: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      borderLeft: `2px solid ${t.color.accent}`,
      paddingLeft: 20,
      fontSize: 28,
    }}
  >
    <MixedText text={label} variant="chart" />
  </div>
);
export const Timeline: React.FC<{
  events: { date: string; text: string }[];
}> = ({ events }) => (
  <div style={{ display: "grid", gap: 35 }}>
    {events.map((e) => (
      <EventMarker key={e.date} label={`${e.date} · ${e.text}`} />
    ))}
  </div>
);
export const CompanyLogo: React.FC<{ src: string; name: string }> = ({
  src,
  name,
}) => (
  <CanvasImage
    src={src}
    name={name}
    style={{ width: 96, height: 96, objectFit: "contain" }}
  />
);

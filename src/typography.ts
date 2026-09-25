import { tokens as t } from "./tokens";

export const textRoles = {
  body: {
    fontFamily: t.font.body,
    fontWeight: t.weight.body,
    letterSpacing: t.tracking.body,
  },
  caption: {
    fontFamily: t.font.caption,
    fontWeight: t.weight.caption,
    letterSpacing: t.tracking.caption,
  },
  chart: {
    fontFamily: t.font.body,
    fontWeight: t.weight.body,
    letterSpacing: t.tracking.chartKorean,
  },
  "body-latin": {
    fontFamily: t.font.latin,
    fontWeight: 400,
    letterSpacing: "normal",
  },
  "caption-latin": {
    fontFamily: t.font.captionLatin,
    fontWeight: 400,
    letterSpacing: t.tracking.caption,
  },
  "chart-latin": {
    fontFamily: t.font.latin,
    fontWeight: 400,
    letterSpacing: t.tracking.chart,
  },
} as const;
export type TextRole = keyof typeof textRoles;
export type TypographyMeasurement = {
  role: TextRole;
  text: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  letterSpacing: number;
  fontLoaded: boolean;
};

/** Compare computed pixels, not the authored CSS string: em tracking can be inherited at the wrong size. */
export function inspectTypography(m: TypographyMeasurement): string[] {
  const expected = textRoles[m.role],
    errors: string[] = [];
  const wanted =
    expected.letterSpacing === "normal"
      ? 0
      : parseFloat(expected.letterSpacing) * m.fontSize;
  if (
    m.fontFamily.replace(/["']/g, "").trim() !== expected.fontFamily ||
    !m.fontLoaded
  )
    errors.push(
      `TYPOGRAPHY ${m.role}: ${m.text}: expected loaded ${expected.fontFamily}, got ${m.fontFamily}`,
    );
  if (Number(m.fontWeight) !== expected.fontWeight)
    errors.push(
      `TYPOGRAPHY ${m.role}: ${m.text}: expected weight ${expected.fontWeight}, got ${m.fontWeight}`,
    );
  if (
    !Number.isFinite(m.letterSpacing) ||
    Math.abs(m.letterSpacing - wanted) > 0.02
  )
    errors.push(
      `TYPOGRAPHY ${m.role}: ${m.text}: expected ${wanted.toFixed(3)}px tracking at ${m.fontSize}px, got ${m.letterSpacing}px`,
    );
  return errors;
}

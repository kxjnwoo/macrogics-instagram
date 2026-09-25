export type BarMeasurement = { value: number; y: number; height: number };
export function inspectBars(
  zero: number,
  frame: number,
  start: number,
  expectedCount: number,
  bars: BarMeasurement[],
): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(zero)) errors.push("BAR_QA: missing zero baseline");
  if (bars.length !== expectedCount)
    errors.push(
      "BAR_QA: a reported observation is missing or an unreported observation became a bar",
    );
  for (const bar of bars) {
    if (
      ![bar.value, bar.y, bar.height].every(Number.isFinite) ||
      bar.height < 0
    ) {
      errors.push("BAR_QA: invalid bar geometry");
      continue;
    }
    const edge = bar.value >= 0 ? bar.y + bar.height : bar.y;
    if (Math.abs(edge - zero) > 0.05)
      errors.push(
        "BAR_QA: signed bar must grow from zero in the correct direction",
      );
    if (frame <= start && bar.height > 0.05)
      errors.push("BAR_QA: bar must start at zero at the reveal cue");
    if (frame >= start + 36 && bar.value !== 0 && bar.height <= 0)
      errors.push("BAR_QA: reported nonzero flow did not animate into view");
    if (bar.value === 0 && bar.height > 0.05)
      errors.push("BAR_QA: zero flow has a nonzero bar");
  }
  return [...new Set(errors)];
}

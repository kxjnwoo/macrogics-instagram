export function chartAnimation(
  frame: number,
  timing: {
    chartReveal: number;
    chartRipple: number;
    chartRippleCycle: number;
  },
) {
  const { chartReveal, chartRipple, chartRippleCycle } = timing;
  if (chartReveal <= 0 || chartRipple <= 0 || chartRippleCycle < chartRipple)
    throw Error("Invalid chart reveal/ripple timing");
  const progress = Math.max(0, Math.min(1, frame / chartReveal));
  const elapsed = frame - chartReveal;
  const phase = elapsed % chartRippleCycle;
  return {
    progress,
    // A quiet interval separates each restrained pulse, after the drawing is complete.
    ripple: elapsed >= 0 && phase < chartRipple ? phase / chartRipple : null,
  };
}

// Interpolate only the drawn segment, never across missing observations.
export function chartHead(
  points: { x: number; y: number | null }[],
  edge: number,
) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.y !== null && Math.abs(edge - p.x) < 0.001) return { x: p.x, y: p.y };
    const q = points[i + 1];
    if (q && p.y !== null && q.y !== null && edge > p.x && edge < q.x) {
      const k = (edge - p.x) / (q.x - p.x);
      return { x: edge, y: p.y + (q.y - p.y) * k };
    }
  }
  return null;
}

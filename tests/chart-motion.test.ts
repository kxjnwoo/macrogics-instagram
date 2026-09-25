import test from "node:test";
import assert from "node:assert/strict";
import { chartAnimation } from "../src/chart-motion";
import { tokens } from "../src/tokens";

test("all chart drawings start at the baseline and finish once, with no opening bypass", () => {
  assert.equal(chartAnimation(0, tokens.motion).progress, 0);
  assert.equal(
    chartAnimation(tokens.motion.chartReveal / 2, tokens.motion).progress,
    0.5,
  );
  assert.equal(
    chartAnimation(tokens.motion.chartReveal, tokens.motion).progress,
    1,
  );
  assert.equal(
    chartAnimation(tokens.motion.chartReveal + 500, tokens.motion).progress,
    1,
  );
});

test("chart ripple begins only after drawing and repeats with a quiet interval", () => {
  const { chartReveal, chartRipple, chartRippleCycle } = tokens.motion;
  assert.equal(chartAnimation(chartReveal - 1, tokens.motion).ripple, null);
  assert.equal(chartAnimation(chartReveal, tokens.motion).ripple, 0);
  assert.equal(
    chartAnimation(chartReveal + chartRipple / 2, tokens.motion).ripple,
    0.5,
  );
  assert.equal(
    chartAnimation(chartReveal + chartRipple, tokens.motion).ripple,
    null,
  );
  assert.equal(
    chartAnimation(chartReveal + chartRippleCycle - 1, tokens.motion).ripple,
    null,
  );
  assert.equal(
    chartAnimation(chartReveal + chartRippleCycle, tokens.motion).ripple,
    0,
  );
  assert.equal(
    chartAnimation(
      chartReveal + 8 * chartRippleCycle + chartRipple / 2,
      tokens.motion,
    ).ripple,
    0.5,
  );
});

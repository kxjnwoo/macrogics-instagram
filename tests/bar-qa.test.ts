import test from "node:test";
import assert from "node:assert/strict";
import { inspectBars } from "../src/bar-qa";
test("flow bars start at zero, preserve outflow direction and show every reported value", () => {
  const bars = [
    { value: 100, y: 50, height: 50 },
    { value: -40, y: 100, height: 20 },
  ];
  assert.deepEqual(inspectBars(100, 36, 0, 2, bars), []);
  assert.match(
    inspectBars(100, 36, 0, 2, [bars[0], { ...bars[1], y: 80 }]).join(),
    /correct direction/,
  );
  assert.match(inspectBars(100, 0, 0, 2, bars).join(), /start at zero/);
  assert.deepEqual(
    inspectBars(
      100,
      0,
      0,
      2,
      bars.map((b) => ({ ...b, y: 100, height: 0 })),
    ),
    [],
  );
  assert.match(inspectBars(100, 36, 0, 3, bars).join(), /observation/);
  assert.match(inspectBars(NaN, 36, 0, 2, bars).join(), /baseline/);
});

import assert from "node:assert/strict";
import {
  camera,
  project,
  screenGeometry,
  footageTransform,
} from "./src/spatial";
import { slots } from "./src/config";
let maxError = 0;
for (const slot of slots) {
  for (
    let frame = Math.round((slot.start - 2.1) * 30);
    frame < Math.round((slot.end + 1.15) * 30);
    frame++
  ) {
    let t = frame / 30;
    let { cam, ps } = screenGeometry(t, slot);
    let target = ps.map((v) => project(cam, v));
    let m = footageTransform(t, slot).slice(9, -1).split(",").map(Number);
    for (const [i, [x, y]] of [
      [0, [0, 0]],
      [1, [1780, 0]],
      [2, [1780, 810]],
      [3, [0, 810]],
    ] as any) {
      let w = m[3] * x + m[7] * y + 1;
      let xx = (m[0] * x + m[4] * y + m[12]) / w,
        yy = (m[1] * x + m[5] * y + m[13]) / w;
      assert.ok(Number.isFinite(xx) && Number.isFinite(yy));
      maxError = Math.max(
        maxError,
        Math.hypot(xx - target[i].x, yy - target[i].y),
      );
    }
  }
}
assert.ok(maxError < 1e-7);
let a = camera(),
  b = camera(200);
let near = Math.abs(project(a, [0, 0, 500]).x - project(b, [0, 0, 500]).x);
let far = Math.abs(project(a, [0, 0, -900]).x - project(b, [0, 0, -900]).x);
assert.ok(near > far * 2);
console.log(
  JSON.stringify(
    {
      maxFootageCornerErrorPixels: maxError,
      nearParallaxPixels: near,
      farParallaxPixels: far,
      pass: true,
    },
    null,
    2,
  ),
);

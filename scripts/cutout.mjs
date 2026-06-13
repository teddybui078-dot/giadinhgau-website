// Cut a bear off its flat teal background into a transparent PNG.
//
// Strategy: flood-fill inward from the four corners, removing only pixels that
// are (a) within T_HARD color distance of the sampled background AND (b)
// connected to a corner. Connectivity is what protects the green hoodie — it is
// fenced off from the background by the bear's darker brown outline, so the fill
// can't leak into it even though hoodie-green is numerically close to the teal.
// A second looser band (T_SOFT) feathers anti-aliased edge pixels to partial
// alpha so no teal fringe survives. Output is trimmed to the bear's bbox.
//
// Usage: node scripts/cutout.mjs <input.png> <output.png>

import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node scripts/cutout.mjs <input.png> <output.png>');
  process.exit(1);
}

const T_HARD = 56; // <= this distance from bg => fully removed (if connected)
const T_SOFT = 104; // hard..soft => feathered partial alpha on the edge ring

const png = PNG.sync.read(readFileSync(inPath));
const { width: w, height: h, data } = png; // data is RGBA, 4 bytes/px

const idx = (x, y) => (y * w + x) * 4;
const dist = (i, r, g, b) => {
  const dr = data[i] - r, dg = data[i + 1] - g, db = data[i + 2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

// Sample background color: average the four corner 8x8 blocks.
let sr = 0, sg = 0, sb = 0, n = 0;
for (const [cx, cy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
  for (let dy = 0; dy < 8; dy++) {
    for (let dx = 0; dx < 8; dx++) {
      const x = Math.min(w - 1, Math.max(0, cx + (cx ? -dx : dx)));
      const y = Math.min(h - 1, Math.max(0, cy + (cy ? -dy : dy)));
      const i = idx(x, y);
      sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
    }
  }
}
const bg = [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)];
console.log(`bg seed = rgb(${bg.join(',')})`);

// BFS flood-fill from the whole border over pixels within T_HARD of the bg.
// Seeding every edge pixel (not just corners) catches background pockets that
// touch an edge, e.g. the gap between the bear's feet.
const removed = new Uint8Array(w * h); // 1 => background (fully transparent)
const stack = [];
for (let x = 0; x < w; x++) {
  if (dist(idx(x, 0), ...bg) <= T_HARD) stack.push(x);
  if (dist(idx(x, h - 1), ...bg) <= T_HARD) stack.push((h - 1) * w + x);
}
for (let y = 0; y < h; y++) {
  if (dist(idx(0, y), ...bg) <= T_HARD) stack.push(y * w);
  if (dist(idx(w - 1, y), ...bg) <= T_HARD) stack.push(y * w + (w - 1));
}
while (stack.length) {
  const p = stack.pop();
  if (removed[p]) continue;
  const x = p % w, y = (p / w) | 0;
  if (dist(idx(x, y), ...bg) > T_HARD) continue;
  removed[p] = 1;
  if (x > 0) stack.push(p - 1);
  if (x < w - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - w);
  if (y < h - 1) stack.push(p + w);
}

// Apply alpha: removed => 0. Edge ring (not removed, within T_SOFT, touching a
// removed pixel) => feather alpha by distance so anti-aliased teal vanishes.
const touchesRemoved = (x, y) => {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (removed[ny * w + nx]) return true;
    }
  }
  return false;
};

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4;
    if (removed[p]) { data[i + 3] = 0; continue; }
    const d = dist(i, ...bg);
    if (d < T_SOFT && touchesRemoved(x, y)) {
      // 0 at T_HARD (fully clear) .. 1 at T_SOFT (fully opaque)
      const a = Math.max(0, Math.min(1, (d - T_HARD) / (T_SOFT - T_HARD)));
      data[i + 3] = Math.round(255 * a);
    }
  }
}

// Inpaint enclosed teal specks (e.g. a teal blotch on the hoodie, stray nubs
// the flood-fill couldn't reach because they're fenced off from the border).
// These are opaque pixels still close to the bg color; repaint each with the
// average of its non-teal opaque neighbours so the spot blends in instead of
// becoming a hole. The hoodie's forest-green is > T_PATCH from teal, so it is
// left untouched.
const T_PATCH = 50;
const toFix = new Uint8Array(w * h);
let fixCount = 0;
for (let p = 0; p < w * h; p++) {
  const i = p * 4;
  if (!removed[p] && data[i + 3] > 8 && dist(i, ...bg) < T_PATCH) {
    toFix[p] = 1; fixCount++;
  }
}
for (let pass = 0; pass < 64 && fixCount > 0; pass++) {
  let fixedThisPass = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!toFix[p]) continue;
      let r = 0, g = 0, b = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = ny * w + nx, ni = np * 4;
          if (toFix[np] || removed[np] || data[ni + 3] <= 8) continue;
          r += data[ni]; g += data[ni + 1]; b += data[ni + 2]; k++;
        }
      }
      if (k > 0) {
        const i = p * 4;
        data[i] = Math.round(r / k); data[i + 1] = Math.round(g / k); data[i + 2] = Math.round(b / k);
        data[i + 3] = 255;
        toFix[p] = 0; fixCount--; fixedThisPass++;
      }
    }
  }
  if (fixedThisPass === 0) break; // remaining pixels have no valid neighbours
}
console.log(`inpainted ${fixCount === 0 ? 'all' : 'most'} teal specks`);

// Trim to the bounding box of pixels with any opacity (+ small padding).
let minX = w, minY = h, maxX = 0, maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
const pad = 12;
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
const cw = maxX - minX + 1, ch = maxY - minY + 1;

const out = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * w + (x + minX)) * 4;
    const di = (y * cw + x) * 4;
    out.data[di] = data[si];
    out.data[di + 1] = data[si + 1];
    out.data[di + 2] = data[si + 2];
    out.data[di + 3] = data[si + 3];
  }
}
writeFileSync(outPath, PNG.sync.write(out));
console.log(`wrote ${outPath} (${cw}x${ch}, trimmed from ${w}x${h})`);

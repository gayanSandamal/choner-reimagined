// Generator for assets/lottie/choner-logo.json. Rebuilds the Choner
// heart-orbit mark as Lottie shape layers from the parametric geometry
// (1254-space, shifted into a 660x480 comp by -300,-310) and authors a 4s
// loop (frames 18-138 @ 30fps) of a heartbeat pulse + the detached dot
// swooping onto the ring, orbiting once, and returning home. Frames 0-18
// hold no motion — components/auth/AnimatedBrandLogo.tsx always starts
// playback at frame 18, relying on the screen's own entrance transition
// instead of an independent one baked into this asset.
//
// Usage: node scripts/generate-choner-logo-lottie.mjs assets/lottie/choner-logo.json

import { writeFileSync } from 'node:fs';

// ---- palette ----------------------------------------------------------
const ORANGE = [0.984, 0.486, 0.02]; // #FB7C05 (matches traced mark)
const BG = [0.012, 0.102, 0.176]; // #031A2D app background (weave casing)

// ---- geometry (comp space = artwork - [300,310]) ----------------------
const CX = 327.5, CY = 235, RX = 316, RY = 88, ROT = (-16.57 * Math.PI) / 180;
const COS = Math.cos(ROT), SIN = Math.sin(ROT);
const DOT_HOME = [588, 54], DOT_R = 26;
const STROKE = 45, CASING = 84, COMMA_W = 52;

const rad = (d) => (d * Math.PI) / 180;
// point + derivative on the tilted ellipse at param t (radians)
const P = (t) => [
  CX + RX * Math.cos(t) * COS - RY * Math.sin(t) * SIN,
  CY + RX * Math.cos(t) * SIN + RY * Math.sin(t) * COS
];
const D = (t) => [
  -RX * Math.sin(t) * COS - RY * Math.cos(t) * SIN,
  -RX * Math.sin(t) * SIN + RY * Math.cos(t) * COS
];

// open elliptical arc t1..t2 (degrees) as a Lottie path {v,i,o,c}
function arcPath(t1deg, t2deg, maxSegDeg = 60) {
  const t1 = rad(t1deg), t2 = rad(t2deg);
  const n = Math.max(1, Math.ceil(Math.abs(t2deg - t1deg) / maxSegDeg));
  const dt = (t2 - t1) / n;
  const alpha = (4 / 3) * Math.tan(dt / 4);
  const v = [], inn = [], out = [];
  for (let k = 0; k <= n; k++) {
    const t = t1 + k * dt;
    const pt = P(t), dv = D(t);
    v.push(pt.map((x) => +x.toFixed(2)));
    out.push(k < n ? dv.map((x) => +(x * alpha).toFixed(2)) : [0, 0]);
    inn.push(k > 0 ? dv.map((x) => +(-x * alpha).toFixed(2)) : [0, 0]);
  }
  return { a: 0, k: { i: inn, o: out, v, c: false } };
}

// heart outline (closed) from the parametric bezier path
const HEART = {
  a: 0,
  k: {
    v: [[330, 120], [197, 23], [105, 173], [330, 455], [555, 173], [463, 23]],
    o: [[-12, -50], [-82, 0], [0, 95], [150, -113], [0, -70], [-70, 0]],
    i: [[12, -50], [70, 0], [0, -70], [-150, -113], [0, 95], [82, 0]],
    c: true
  }
};

// ---- shape helpers ----------------------------------------------------
const stroke = (color, width) => ({
  ty: 'st', c: { a: 0, k: [...color, 1] }, o: { a: 0, k: 100 },
  w: { a: 0, k: width }, lc: 2, lj: 2
});
const fill = (color) => ({ ty: 'fl', c: { a: 0, k: [...color, 1] }, o: { a: 0, k: 100 } });
const TR = { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } };
const group = (items) => ({ ty: 'gr', it: [...items, TR] });
const statics = { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [330, 240] }, a: { a: 0, k: [330, 240] }, s: { a: 0, k: [100, 100, 100] } };
const layer = (ind, nm, shapes, ks = statics) => ({
  ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: 0, op: 138, st: 0
});

// ---- dot orbit keyframes ----------------------------------------------
// f18 hold at home; f18-30 swoop to ring entry t=350deg; f30-114 once around
// (t increasing 350 -> 710, 30deg per 7 frames); f114-126 swoop back; hold.
function dotPositionKeyframes() {
  const ease = { i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } };
  const lin = { i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 } };
  const segRad = rad(30), tangent = segRad / 3;
  const kf = [];
  kf.push({ t: 0, s: DOT_HOME, h: 1 });
  kf.push({ t: 18, s: DOT_HOME, ...ease, to: [0, 0], ti: [0, 0] });
  for (let n = 0; n <= 12; n++) {
    const tdeg = 350 + n * 30;
    const t = rad(tdeg);
    const pos = P(t).map((x) => +x.toFixed(2));
    const dv = D(t);
    kf.push({
      t: 30 + n * 7, s: pos, ...(n === 0 || n === 12 ? ease : lin),
      to: dv.map((x) => +(x * tangent).toFixed(2)),
      ti: dv.map((x) => +(-x * tangent).toFixed(2))
    });
  }
  kf.push({ t: 126, s: DOT_HOME, ...ease, to: [0, 0], ti: [0, 0] });
  return { a: 1, k: kf };
}
// front layer visible while the dot rides the ellipse's near side
// (t in 0..180, i.e. frames ~32..72); back layer is the inverse.
const cuts = (frames, values) => ({
  a: 1,
  k: frames.map((t, idx) => ({ t, s: [values[idx]], h: 1 }))
});
const dotShape = [group([
  { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [DOT_R * 2, DOT_R * 2] } },
  fill(ORANGE)
])];
const dotKs = (opacity) => ({
  o: opacity, r: { a: 0, k: 0 }, p: dotPositionKeyframes(),
  a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100, 100] }
});

// ---- heartbeat scale (lub-dub once per loop) ---------------------------
const beat = { i: { x: 0.3, y: 1 }, o: { x: 0.5, y: 0 } };
const heartKs = {
  o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
  p: { a: 0, k: [330, 240] }, a: { a: 0, k: [330, 240] },
  s: {
    a: 1,
    k: [
      { t: 0, s: [100, 100, 100], ...beat },
      { t: 34, s: [100, 100, 100], ...beat },
      { t: 40, s: [106, 106, 100], ...beat },
      { t: 46, s: [100, 100, 100], ...beat },
      { t: 52, s: [104, 104, 100], ...beat },
      { t: 60, s: [100, 100, 100], ...beat }
    ]
  }
};

// ---- mark precomp layers (index 1 = topmost) ---------------------------
const markLayers = [
  layer(1, 'dot-front', dotShape, dotKs(cuts([0, 32, 72], [0, 100, 0]))),
  layer(2, 'comma', [group([{ ty: 'sh', ks: arcPath(12, -14, 30) }, stroke(ORANGE, COMMA_W)])]),
  layer(3, 'ring-bottom', [group([{ ty: 'sh', ks: arcPath(180, 0) }, stroke(ORANGE, STROKE)])]),
  layer(4, 'ring-casing', [group([{ ty: 'sh', ks: arcPath(133, 33, 50) }, stroke(BG, CASING)])]),
  layer(5, 'heart', [group([{ ty: 'sh', ks: HEART }, fill(BG), stroke(ORANGE, STROKE)])], heartKs),
  layer(6, 'dot-back', dotShape, dotKs(cuts([0, 32, 72], [100, 0, 100]))),
  layer(7, 'ring-top', [group([{ ty: 'sh', ks: arcPath(180, 360) }, stroke(ORANGE, STROKE)])])
];

// ---- root: static precomp reference -------------------------------------
// Frames 0-18 carry no motion: playback always starts at LOOP_START (18) —
// AnimatedBrandLogo.tsx relies solely on the screen's existing Reanimated
// FadeInDown for the entrance, to avoid stacking two independent entrance
// animations. This root transform is therefore fully static; all motion
// lives in the precomp's own layers (see markLayers above).
const lottie = {
  v: '5.7.4', fr: 30, ip: 0, op: 138, w: 660, h: 480,
  nm: 'choner-logo', ddd: 0,
  assets: [{ id: 'mark', layers: markLayers }],
  layers: [{
    ddd: 0, ind: 1, ty: 0, nm: 'mark', refId: 'mark', sr: 1,
    ks: {
      o: { a: 0, k: 100 }, r: { a: 0, k: 0 },
      p: { a: 0, k: [330, 240] }, a: { a: 0, k: [330, 240] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0, w: 660, h: 480, ip: 0, op: 138, st: 0
  }]
};

const out = process.argv[2];
writeFileSync(out, JSON.stringify(lottie, null, 2));
console.log('wrote', out, JSON.stringify(lottie).length, 'bytes (pretty-printed on disk)');

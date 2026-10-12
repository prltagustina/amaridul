import { cn } from "@/lib/cn";

/*
 * Organic botanical line art drawn in code: drooping cannabis fan leaves, dense flowering colas
 * with violet pistils, and lavender. A seeded random keeps every render identical.
 * Stroke uses currentColor (set a text colour on the wrapper); pistils and lavender use the accent.
 * Provisional until the commissioned illustrations arrive.
 */

type Pt = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rot = ([x, y]: Pt, deg: number): Pt => {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
};
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
function smooth(pts: Pt[], closed: boolean, tension = 1) {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + " Z" : d;
}

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
  ];
}

/**
 * One leaflet with a curved midrib (bend > 0 curls to the right), soft irregular serration
 * and a slightly asymmetric blade.
 */
function leaflet(origin: Pt, length: number, deg: number, bend: number, seed: number, widthRatio = 0.105) {
  const r = rng(seed);
  const W = length * widthRatio;
  const spine = (t: number): Pt => [bend * length * t * t, -length * t];
  const normal = (t: number): Pt => {
    const dx = 2 * bend * length * t;
    const dy = -length;
    const m = Math.hypot(dx, dy);
    return [-dy / m, dx / m];
  };
  const width = (t: number) => W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.68)), 1.3);
  const teeth = Math.max(7, Math.round(length / 5.2));
  const edge = (s: 1 | -1) => {
    const asym = 1 + s * 0.08;
    const pts: Pt[] = [];
    for (let i = 0; i < teeth; i++) {
      const tn = 0.05 + (i / teeth) * 0.9;
      const tt = Math.min(0.97, tn + ((0.7 + r() * 0.2) / teeth) * 0.9);
      const amp = length * (0.006 + r() * 0.006);
      const [nx, ny] = normal(tn);
      const [mx, my] = normal(tt);
      const a = spine(tn);
      const b = spine(tt);
      pts.push([a[0] + s * nx * width(tn) * 0.88 * asym, a[1] + s * ny * width(tn) * 0.88 * asym]);
      pts.push([b[0] + s * mx * (width(tt) * asym + amp), b[1] + s * my * (width(tt) * asym + amp)]);
    }
    return pts;
  };
  const tip = spine(1);
  const outline: Pt[] = [[0, 0], ...edge(-1), tip, ...edge(1).reverse()];
  const place = (p: Pt) => add(origin, rot(p, deg));
  const rib = Array.from({ length: 8 }, (_, i) => place(spine((i / 7) * 0.93)));
  const veins: string[] = [];
  for (let i = 2; i < teeth - 2; i += 2) {
    const t = 0.05 + (i / teeth) * 0.9;
    for (const s of [-1, 1] as const) {
      const a = spine(t);
      const b = spine(t + 0.08);
      const [nx, ny] = normal(t + 0.08);
      veins.push(smooth([place(a), place([b[0] + s * nx * width(t + 0.08) * 0.75, b[1] + s * ny * width(t + 0.08) * 0.75])], false));
    }
  }
  return { outline: smooth(outline.map(place), true, 0.85), rib: smooth(rib, false), veins: veins.join(" ") };
}

/** Palmate fan leaf that droops naturally: outer leaflets are shorter and curl down and out. */
function fanLeaf(origin: Pt, size: number, deg: number, seed: number, leaflets: 5 | 7 | 9 = 7, droop = 0.12) {
  const r = rng(seed);
  const half = (leaflets - 1) / 2;
  const spread = leaflets === 9 ? 102 : leaflets === 7 ? 96 : 76;
  const parts = Array.from({ length: leaflets }, (_, i) => {
    const k = i - half;
    const side = Math.sign(k);
    const a = (k / half) * spread + (r() - 0.5) * 7;
    const len = size * (1 - Math.pow(Math.abs(k) / half, 1.3) * 0.68) * (0.94 + r() * 0.1);
    const bend = side * (0.05 + (Math.abs(k) / half) * 0.16) + droop * (r() - 0.3) * 0.4;
    return leaflet(origin, len, deg + a, bend, seed * 31 + i, Math.abs(k) === half ? 0.13 : 0.105);
  });
  const end = add(origin, rot([size * 0.08, size * 0.46], deg));
  const ctrl = add(origin, rot([-size * 0.06, size * 0.24], deg));
  return {
    outlines: parts.map((p) => p.outline).join(" "),
    ribs: parts.map((p) => p.rib).join(" "),
    veins: parts.map((p) => p.veins).join(" "),
    petiole: `M${f(origin[0])} ${f(origin[1])} Q${f(ctrl[0])} ${f(ctrl[1])} ${f(end[0])} ${f(end[1])}`,
  };
}

function calyx(origin: Pt, len: number, deg: number, puff: number) {
  const w = len * (0.4 + puff * 0.18);
  const p = (x: number, y: number) => add(origin, rot([x, y], deg));
  const [b, l1, l2, t, r1, r2] = [p(0, 0), p(-w, -len * 0.3), p(-w * 0.5, -len * 0.92), p(len * 0.04, -len), p(w * 0.55, -len * 0.88), p(w, -len * 0.28)];
  return `M${f(b[0])} ${f(b[1])} C${f(l1[0])} ${f(l1[1])} ${f(l2[0])} ${f(l2[1])} ${f(t[0])} ${f(t[1])} C${f(r1[0])} ${f(r1[1])} ${f(r2[0])} ${f(r2[1])} ${f(b[0])} ${f(b[1])} Z`;
}

/** Dense cola: overlapping calyxes on a slightly curved axis, sugar leaves and curly pistils. */
function cola(base: Pt, height: number, lean: number, seed: number) {
  const r = rng(seed);
  const axis = (t: number): Pt => [base[0] + lean * height * t * t, base[1] - height * t];
  const envelope = (t: number) => height * 0.26 * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * t)), 0.7) * (1 - t * 0.45);
  const items: { t: number; d: string }[] = [];
  const pistils: string[] = [];
  const count = Math.round(height * 0.62);
  for (let k = 0; k < count; k++) {
    const t = Math.pow(r(), 0.85) * 0.97;
    const [ax, ay] = axis(t);
    const off = (r() * 2 - 1) * envelope(t);
    const size = height * (0.1 + r() * 0.05) * (1 - t * 0.45);
    const tilt = (off / (envelope(t) || 1)) * 38 + (r() - 0.5) * 16 + lean * 30;
    const o: Pt = [ax + off, ay + size * 0.35];
    items.push({ t, d: calyx(o, size, tilt, r()) });
    if (r() < 0.42) {
      const tip = add(o, rot([0, -size * 0.95], tilt));
      const dir = off >= 0 ? 1 : -1;
      const c1 = add(tip, [dir * size * (0.4 + r() * 0.4), -size * 0.25]);
      const c2 = add(tip, [dir * size * (0.1 + r() * 0.3), -size * (0.7 + r() * 0.3)]);
      const e = add(tip, [dir * size * (0.5 + r() * 0.5), -size * (0.8 + r() * 0.4)]);
      pistils.push(`M${f(tip[0])} ${f(tip[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])}`);
    }
  }
  items.sort((a, b) => b.t - a.t);
  const sugar = [0.12, 0.3, 0.5, 0.68].map((t, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const o = add(axis(t), [side * envelope(t) * 0.6, 0]);
    return leaflet(o, height * (0.42 - t * 0.28), side * (40 + r() * 18) + lean * 20, side * 0.16, seed * 7 + i, 0.12);
  });
  return {
    calyxes: items.map((i) => i.d),
    pistils: pistils.join(" "),
    sugar: sugar.map((s) => s.outline).join(" "),
    sugarRibs: sugar.map((s) => s.rib).join(" "),
  };
}

function lavender(base: Pt, height: number, lean: number, seed: number) {
  const r = rng(seed);
  const top = add(base, [lean, -height]);
  const ctrl = add(base, [lean * 0.1 + (r() - 0.5) * 10, -height * 0.55]);
  const buds: { cx: number; cy: number; deg: number; s: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const t = 0.52 + (i / 12) * 0.48;
    const x = (1 - t) ** 2 * base[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * top[0];
    const y = (1 - t) ** 2 * base[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * top[1];
    const side = i % 2 === 0 ? -1 : 1;
    buds.push({ cx: x + side * (2.6 + r() * 1.4), cy: y + (r() - 0.5) * 2, deg: side * (18 + r() * 14), s: (1 - (i / 12) * 0.5) * (0.9 + r() * 0.2) });
  }
  return { stem: `M${f(base[0])} ${f(base[1])} Q${f(ctrl[0])} ${f(ctrl[1])} ${f(top[0])} ${f(top[1])}`, buds };
}

function Leaf({ leaf, weight = 1 }: { leaf: ReturnType<typeof fanLeaf>; weight?: number }) {
  return (
    <g>
      <path d={leaf.outlines} fill="currentColor" fillOpacity={0.06} strokeWidth={weight} />
      <path d={leaf.ribs} strokeWidth={weight * 0.75} />
      <path d={leaf.veins} strokeWidth={weight * 0.4} opacity={0.4} />
      <path d={leaf.petiole} strokeWidth={weight * 1.1} />
    </g>
  );
}

function Cola({ c, weight = 0.8 }: { c: ReturnType<typeof cola>; weight?: number }) {
  return (
    <g>
      <path d={c.sugar} fill="currentColor" fillOpacity={0.07} strokeWidth={weight} />
      <path d={c.sugarRibs} strokeWidth={weight * 0.6} />
      {c.calyxes.map((d, i) => (
        <path key={i} d={d} fill="var(--color-surface, #fbf7ef)" strokeWidth={weight * 0.85} />
      ))}
      <path d={c.calyxes.join(" ")} fill="currentColor" fillOpacity={0.1} stroke="none" />
      <path d={c.pistils} stroke="var(--color-accent, #7b5e8e)" strokeWidth={weight * 0.9} />
    </g>
  );
}

function Lavender({ l }: { l: ReturnType<typeof lavender> }) {
  return (
    <g>
      <path d={l.stem} strokeWidth={0.9} opacity={0.75} />
      {l.buds.map((b, j) => (
        <ellipse key={j} cx={f(b.cx)} cy={f(b.cy)} rx={f(3.3 * b.s)} ry={f(6 * b.s)} transform={`rotate(${f(b.deg)} ${f(b.cx)} ${f(b.cy)})`} fill="var(--color-accent-soft, #c9b8d3)" stroke="var(--color-accent, #7b5e8e)" strokeWidth={0.7} />
      ))}
    </g>
  );
}

const svgProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Single drooping fan leaf. */
export function CannabisLeaf({ className, leaflets = 7, weight = 1.1 }: { className?: string; leaflets?: 5 | 7 | 9; weight?: number }) {
  const leaf = fanLeaf([115, 132], 112, 0, 11, leaflets);
  return (
    <svg {...svgProps} viewBox="0 0 230 190" className={cn("block", className)}>
      <Leaf leaf={leaf} weight={weight} />
    </svg>
  );
}

/** Flowering branch: swaying stem, three fan leaves, a top cola and a side cola; optional lavender. */
export function CannabisSprig({ className, flip, withLavender = true }: { className?: string; flip?: boolean; withLavender?: boolean }) {
  const s: [Pt, Pt, Pt, Pt] = [[150, 418], [136, 320], [182, 210], [164, 104]];
  const node = (t: number) => cubicAt(...s, t);
  const leaves = [fanLeaf(node(0.32), 120, -64, 3, 7), fanLeaf(node(0.5), 98, 58, 5, 7), fanLeaf(node(0.7), 62, -46, 9, 5)];
  const sideStem = node(0.58);
  const sideTop: Pt = [sideStem[0] + 44, sideStem[1] - 52];
  const colas = [cola(node(1), 118, 0.06, 21), cola(sideTop, 62, 0.12, 27)];
  const lav = [lavender([174, 418], 196, 62, 41), lavender([188, 418], 152, 92, 43)];
  return (
    <svg {...svgProps} viewBox="0 0 320 420" className={cn("block", flip && "-scale-x-100", className)}>
      {withLavender && lav.map((l, i) => <Lavender key={i} l={l} />)}
      <path d={`M${s[0]} C${s[1]} ${s[2]} ${s[3]}`} strokeWidth={1.4} />
      <path d={`M${f(sideStem[0])} ${f(sideStem[1])} Q${f(sideStem[0] + 30)} ${f(sideStem[1] - 10)} ${f(sideTop[0])} ${f(sideTop[1])}`} strokeWidth={1.1} />
      {leaves.map((l, i) => (
        <Leaf key={i} leaf={l} weight={i === 2 ? 0.9 : 1} />
      ))}
      {colas.map((c, i) => (
        <Cola key={i} c={c} weight={i === 0 ? 0.85 : 0.75} />
      ))}
    </svg>
  );
}

/** Leaves and a small cola rising from a corner, for page edges. */
export function CornerLeaves({ className, flip }: { className?: string; flip?: boolean }) {
  const leaves = [fanLeaf([46, 262], 118, -10, 13, 7), fanLeaf([104, 270], 140, 26, 17, 7), fanLeaf([160, 284], 90, 56, 19, 7)];
  const c = cola([82, 214], 70, 0.1, 23);
  return (
    <svg {...svgProps} viewBox="0 0 330 300" className={cn("block", flip && "-scale-x-100", className)}>
      {leaves.map((l, i) => (
        <Leaf key={i} leaf={l} weight={1} />
      ))}
      <path d="M78 300 Q 74 260 82 214" strokeWidth={1} />
      <Cola c={c} weight={0.75} />
    </svg>
  );
}

/** Small leaf mark for headers and card titles. */
export function LeafMark({ className }: { className?: string }) {
  const leaf = fanLeaf([50, 60], 48, 0, 7, 7, 0.05);
  return (
    <svg {...svgProps} viewBox="0 0 100 88" className={cn("block", className)}>
      <path d={leaf.outlines} strokeWidth={2.2} fill="currentColor" fillOpacity={0.08} />
      <path d={leaf.ribs} strokeWidth={1.6} />
      <path d={leaf.petiole} strokeWidth={2.2} />
    </svg>
  );
}

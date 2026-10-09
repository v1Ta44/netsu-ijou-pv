import React from "react";
import { beatPos, beatTime, FPS, LINES, rnd } from "../lib/time";

// Cut engine: turns a section's per-line motif lists into a deterministic cut list.
//   T1 (B/E/I): ½-beat grid, fillers, 1–2 frame inserts, high-speed transitions
//   T2 (C/H):   1-beat grid, anchor shot keeps returning, fewer fillers/inserts
// Overload budget: inserts carry the flicker; a share of former insert slots became
// fast motion transitions (whip / push / zoom-through / slice / spin) so the energy
// stays but each image survives long enough to read.

export type Ctx = {
  t: number; // song time
  s: number; // cut start
  e: number; // cut end
  lt: number; // seconds since cut start
  p: number; // 0..1 through the cut
  k: number; // cut index in section
  j: number; // slot index within the line spec
  seed: string;
  li: number; // lyric line the cut belongs to
  rep: number; // repetition index for ×N specs (0-based), else 0
};
export type Render = (c: Ctx) => React.ReactNode;

export type Tier = 1 | 2;
export type Kind = "motif" | "fill" | "ins";
// Transitions use the previous cut; entries only move the current one.
export type Move = "whipL" | "whipR" | "whipU" | "whipD" | "push" | "zoomThru" | "slice" | "spin" | "punch" | "shake" | "none";
export const TRANSITIONS: Move[] = ["whipL", "whipR", "whipU", "whipD", "push", "zoomThru", "slice", "spin"];
export type Cut = { s: number; e: number; r: Render; kind: Kind; k: number; j: number; li: number; rep: number; seed: string; move: Move };

export type Spec = {
  li: number; // first lyric line covered; the spec runs until the next spec's start
  at?: number; // explicit start time (default: line start)
  m: Render[]; // motif shots
  div?: number; // grid subdivision per beat (default by tier)
  fill?: number; // filler probability per slot
  ins?: number; // insert probability per cut
  trans?: number; // fast-transition probability per cut
  anchor?: boolean; // T2: m[0] returns every other slot
  fixed?: boolean; // one shot for the whole span, no fillers / inserts
  fillers?: Render[]; // override filler pool
  moves?: Move[]; // restrict transitions for this spec
};

const TIER = {
  1: { div: 2, fill: 0.3, ins: 0.26, trans: 0.16 },
  2: { div: 1, fill: 0.18, ins: 0.13, trans: 0.14 },
} as const;

const snap = (t: number) => Math.round(t * FPS) / FPS;
const F = 1 / FPS;

// `fillers` take whole slots; `inserts` (default: same pool) are the 1–2 frame flickers.
export const buildCuts = (
  name: string,
  end: number,
  specs: Spec[],
  tier: Tier,
  fillers: Render[],
  repOf?: (li: number) => number,
  inserts?: Render[],
): Cut[] => {
  const cuts: Cut[] = [];
  let k = 0;
  specs.forEach((sp, si) => {
    const t0 = snap(sp.at ?? LINES[sp.li].start);
    const next = specs[si + 1];
    const t1 = snap(next ? next.at ?? LINES[next.li].start : end);
    if (t1 - t0 < F) return;
    const rep = repOf ? repOf(sp.li) : 0;
    const pool = sp.fillers ?? fillers;
    if (sp.fixed) {
      cuts.push({ s: t0, e: t1, r: sp.m[0], kind: "motif", k: k++, j: 0, li: sp.li, rep, seed: `${name}${si}f`, move: "none" });
      return;
    }
    const div = sp.div ?? TIER[tier].div;
    const pFill = sp.fill ?? TIER[tier].fill;
    const pIns = sp.ins ?? TIER[tier].ins;
    const pTrans = sp.trans ?? TIER[tier].trans;
    const moves = sp.moves ?? TRANSITIONS;
    // slot boundaries: spec start, then every grid point strictly inside
    const bounds = [t0];
    for (let b = Math.floor(beatPos(t0) * div) + 1; ; b++) {
      const tb = snap(beatTime(b / div));
      if (tb >= t1 - 1.5 * F) break;
      if (tb - bounds[bounds.length - 1] >= 2 * F) bounds.push(tb);
    }
    bounds.push(t1);
    let prev = -1;
    for (let j = 0; j < bounds.length - 1; j++) {
      const s = bounds[j];
      const e = bounds[j + 1];
      const seed = `${name}${si}:${j}`;
      let r: Render;
      let kind: Kind = "motif";
      const n = sp.m.length;
      if (j > 0 && rnd(`fl${seed}`) < pFill) {
        r = pool[Math.floor(rnd(`fp${seed}`) * pool.length)];
        kind = "fill";
      } else if (sp.anchor && tier === 2) {
        const idx = j % 2 === 0 || n === 1 ? 0 : 1 + (Math.floor(j / 2) % (n - 1));
        r = sp.m[idx];
        prev = idx;
      } else {
        let idx = j === 0 ? 0 : Math.floor(rnd(`mi${seed}`) * n);
        if (n > 1 && idx === prev) idx = (idx + 1) % n;
        r = sp.m[idx];
        prev = idx;
      }
      const frames = Math.round((e - s) * FPS);
      // one roll decides: tail insert | entering transition | plain entry move
      const roll = rnd(`in${seed}`);
      let move: Move = "none";
      if (roll >= pIns && roll < pIns + pTrans && frames >= 4 && cuts.length > 0) move = moves[Math.floor(rnd(`mv${seed}`) * moves.length)];
      else if (kind === "motif") move = (["punch", "punch", "shake", "none"] as Move[])[Math.floor(rnd(`en${seed}`) * 4)];
      if (frames >= 4 && roll < pIns) {
        const len = rnd(`il${seed}`) < 0.6 ? 1 : 2;
        const cutAt = snap(e - len * F);
        cuts.push({ s, e: cutAt, r, kind, k: k++, j, li: sp.li, rep, seed, move });
        const ipool = inserts ?? pool;
        const ir = ipool[Math.floor(rnd(`ip${seed}`) * ipool.length)];
        cuts.push({ s: cutAt, e, r: ir, kind: "ins", k: k++, j, li: sp.li, rep, seed: `${seed}i`, move: "none" });
      } else {
        cuts.push({ s, e, r, kind, k: k++, j, li: sp.li, rep, seed, move });
      }
    }
  });
  return cuts;
};

export const cutIndex = (cuts: Cut[], t: number): number => {
  let lo = 0;
  let hi = cuts.length - 1;
  if (hi < 0 || t < cuts[0].s || t >= cuts[hi].e) return -1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (cuts[m].s <= t) lo = m;
    else hi = m - 1;
  }
  return lo;
};
export const cutAt = (cuts: Cut[], t: number): Cut | undefined => {
  const i = cutIndex(cuts, t);
  return i < 0 ? undefined : cuts[i];
};

export const ctxOf = (c: Cut, t: number): Ctx => ({
  t,
  s: c.s,
  e: c.e,
  lt: t - c.s,
  p: (t - c.s) / Math.max(F, c.e - c.s),
  k: c.k,
  j: c.j,
  seed: c.seed,
  li: c.li,
  rep: c.rep,
});

// ---------- motion ----------
const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

// Directional motion blur (SVG gaussian with separate x/y deviation).
export const MBlur: React.FC<{ id: string; bx: number; by: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ id, bx, by, style, children }) => {
  if (bx < 0.5 && by < 0.5) return <div style={{ ...abs, ...style }}>{children}</div>;
  return (
    <div style={{ ...abs, ...style, filter: `url(#${id})` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${bx.toFixed(1)} ${by.toFixed(1)}`} edgeMode="duplicate" />
        </filter>
      </svg>
      {children}
    </div>
  );
};

const TRANS_DUR = 4 / FPS;

// Continuous fast drift on every cut: stills never sit dead.
const Drift: React.FC<{ c: Cut; t: number; children: React.ReactNode }> = ({ c, t, children }) => {
  const lt = t - c.s;
  const a = rnd(`da${c.seed}`) * Math.PI * 2;
  // capped so the 1.08 overscan never shows an edge
  const v = Math.min(120 + rnd(`dv${c.seed}`) * 260, 70 / Math.max(0.05, c.e - c.s)); // px/s
  const z = 1.08 + 0.12 * lt;
  return <div style={{ ...abs, transform: `scale(${z}) translate(${Math.cos(a) * v * lt}px, ${Math.sin(a) * v * lt}px)` }}>{children}</div>;
};

const Shot: React.FC<{ c: Cut; t: number; drift?: boolean }> = ({ c, t, drift = true }) =>
  drift && c.kind !== "ins" ? (
    <Drift c={c} t={t}>
      {c.r(ctxOf(c, t))}
    </Drift>
  ) : (
    <>{c.r(ctxOf(c, t))}</>
  );

export const CutPlayer: React.FC<{ t: number; cuts: Cut[] }> = ({ t, cuts }) => {
  const i = cutIndex(cuts, t);
  if (i < 0) return null;
  const c = cuts[i];
  const lt = t - c.s;
  const mv = c.move;
  const isTrans = TRANSITIONS.includes(mv) && lt < TRANS_DUR && i > 0;
  if (!isTrans) {
    // entry moves
    if (mv === "punch" && lt < 4 / FPS) {
      const q = easeOut(lt / (4 / FPS));
      return (
        <MBlur id={`pb${c.k}`} bx={(1 - q) * 6} by={(1 - q) * 6} style={{ transform: `scale(${1 + 0.22 * (1 - q)})` }}>
          <Shot c={c} t={t} />
        </MBlur>
      );
    }
    if (mv === "shake" && lt < 5 / FPS) {
      const f = Math.floor(lt * FPS);
      const amp = 34 * (1 - lt / (5 / FPS));
      return (
        <div style={{ ...abs, transform: `translate(${(rnd(`sx${c.k}${f}`) - 0.5) * 2 * amp}px, ${(rnd(`sy${c.k}${f}`) - 0.5) * 2 * amp}px) rotate(${(rnd(`sr${c.k}${f}`) - 0.5) * 2}deg)` }}>
          <Shot c={c} t={t} />
        </div>
      );
    }
    return <Shot c={c} t={t} />;
  }
  // transitions: previous cut keeps running underneath / alongside
  const prev = cuts[i - 1];
  const q = easeOut(lt / TRANS_DUR);
  const W = 1920;
  const H = 1080;
  const prevNode = <Shot c={prev} t={t} />;
  const curNode = <Shot c={c} t={t} />;
  if (mv === "whipL" || mv === "whipR" || mv === "whipU" || mv === "whipD" || mv === "push") {
    const horiz = mv === "whipL" || mv === "whipR" || mv === "push";
    const dir = mv === "whipL" || mv === "whipU" ? -1 : 1;
    const span = horiz ? W : H;
    const blur = mv === "push" ? (1 - q) * 10 : (1 - q) * 70;
    const off = (x: number) => (horiz ? `translateX(${x}px)` : `translateY(${x}px)`);
    return (
      <div style={{ ...abs, overflow: "hidden", background: "#000" }}>
        <MBlur id={`wp${c.k}`} bx={horiz ? blur : 0} by={horiz ? 0 : blur} style={{ transform: off(-dir * q * span) }}>
          {prevNode}
        </MBlur>
        <MBlur id={`wc${c.k}`} bx={horiz ? blur : 0} by={horiz ? 0 : blur} style={{ transform: off(dir * (1 - q) * span) }}>
          {curNode}
        </MBlur>
        {mv === "push" && (
          <div
            style={{
              position: "absolute",
              background: "#fff",
              ...(horiz ? { top: 0, bottom: 0, width: 6, left: (dir > 0 ? (1 - q) * W : q * W) - 3 } : { left: 0, right: 0, height: 6, top: (dir > 0 ? (1 - q) * H : q * H) - 3 }),
            }}
          />
        )}
      </div>
    );
  }
  if (mv === "zoomThru") {
    return (
      <div style={{ ...abs, overflow: "hidden", background: "#000" }}>
        <MBlur id={`zc${c.k}`} bx={(1 - q) * 14} by={(1 - q) * 14} style={{ transform: `scale(${0.55 + 0.45 * q})` }}>
          {curNode}
        </MBlur>
        <MBlur id={`zp${c.k}`} bx={q * 24} by={q * 24} style={{ transform: `scale(${1 + 2.6 * q})`, opacity: 1 - q }}>
          {prevNode}
        </MBlur>
      </div>
    );
  }
  if (mv === "spin") {
    const dir = rnd(`sd${c.k}`) < 0.5 ? -1 : 1;
    return (
      <div style={{ ...abs, overflow: "hidden", background: "#000" }}>
        <MBlur id={`sc${c.k}`} bx={(1 - q) * 30} by={(1 - q) * 10} style={{ transform: `rotate(${dir * 28 * (1 - q)}deg) scale(${1 + 0.5 * (1 - q)})` }}>
          {curNode}
        </MBlur>
      </div>
    );
  }
  // slice: horizontal strips slide in from alternating sides, staggered
  const n = 6;
  return (
    <div style={{ ...abs, overflow: "hidden" }}>
      {prevNode}
      {Array.from({ length: n }, (_, s) => {
        const qs = easeOut(lt / TRANS_DUR - (s % 3) * 0.12);
        const dir = s % 2 ? 1 : -1;
        return (
          <div key={s} style={{ ...abs, clipPath: `inset(${(s * H) / n}px 0 ${H - ((s + 1) * H) / n}px 0)`, transform: `translateX(${dir * (1 - qs) * W}px)` }}>
            {curNode}
          </div>
        );
      })}
    </div>
  );
};

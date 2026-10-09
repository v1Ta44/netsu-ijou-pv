import React from "react";
import { Img } from "remotion";
import { heatAt, MINCHO, paletteAt, PIX, WHITE } from "../lib/heat";
import { SIZES } from "../lib/sizes";
import { lerp, rnd } from "../lib/time";
import { Bg, Char, picSize, src, World } from "../lib/world";
import { Ctx, Render } from "./engine";

// Shot vocabulary. Every helper returns a Render (ctx → node); all are full-frame.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
export const isChar = (id: string) => id.startsWith("CH");

type HeatO = { heat?: number | ((t: number) => number) };
export const hOf = (o: HeatO, t: number) => (o.heat == null ? heatAt(t) : typeof o.heat === "number" ? o.heat : o.heat(t));

// Palette helpers: gradient-map stops 0..4 as CSS colors for the current heat.
export const tone = (heat: number, i: number) => {
  const c = paletteAt(heat).g.stops[i];
  return `rgb(${c.map(Math.round).join(",")})`;
};
export const ui = (heat: number) => paletteAt(heat).ui;
export const plate = (heat: number) => paletteAt(heat).plate;

const r01 = (c: Ctx, key: string) => rnd(`${c.seed}${key}`);
const rr = (c: Ctx, key: string, a: number, b: number) => lerp(a, b, r01(c, key));

// Graded wrapper picking the layer by asset id.
const Grade: React.FC<{ id: string; heat: number; children: React.ReactNode }> = ({ id, heat, children }) =>
  isChar(id) ? <Char heat={heat}>{children}</Char> : <World heat={heat}>{children}</World>;

// ---------- FULL ----------
// Each cut re-rolls its framing inside the given ranges, then drifts.
export const full = (
  id: string,
  o: HeatO & { z?: [number, number]; px?: [number, number]; py?: [number, number]; drift?: number; rot?: number; pre?: string; bg?: string } = {},
): Render => (c) => {
  const heat = hOf(o, c.t);
  const [z0, z1] = o.z ?? [1.02, 1.3];
  const zoom = rr(c, "z", z0, z1) * (1 + (o.drift ?? 0.06) * c.lt);
  const px = rr(c, "px", ...(o.px ?? [-0.8, 0.8]));
  const py = rr(c, "py", ...(o.py ?? [-0.6, 0.6]));
  return (
    <div style={{ ...abs, background: o.bg ?? tone(heat, 1) }}>
      <World heat={heat} pre={o.pre}>
        <Bg id={id} zoom={zoom} px={px} py={py} rot={o.rot ?? 0} />
      </World>
    </div>
  );
};

// ---------- CROP ----------
// u,v: crop center in the asset (0..1); z: zoom relative to cover. Ranges re-roll per cut.
type Range = number | [number, number];
const pick = (c: Ctx, key: string, v: Range) => (typeof v === "number" ? v : rr(c, key, v[0], v[1]));
export const crop = (id: string, o: HeatO & { u?: Range; v?: Range; z?: Range; bg?: string; drift?: number; rot?: Range } = {}): Render => (c) => {
  const heat = hOf(o, c.t);
  const [iw, ih] = SIZES[id];
  const z = pick(c, "z", o.z ?? [2, 4]) * (1 + (o.drift ?? 0.08) * c.lt);
  const u = pick(c, "u", o.u ?? [0.3, 0.7]);
  const v = pick(c, "v", o.v ?? [0.3, 0.7]);
  const s = Math.max(1920 / iw, 1080 / ih) * z;
  const dw = iw * s;
  const dh = ih * s;
  const left = 960 - u * dw;
  const top = 540 - v * dh;
  return (
    <div style={{ ...abs, background: o.bg ?? tone(heat, isChar(id) ? 2 : 1) }}>
      <Grade id={id} heat={heat}>
        <Img src={src(id)} style={{ position: "absolute", left, top, width: dw, height: dh, transform: `rotate(${pick(c, "r", o.rot ?? 0)}deg)` }} />
      </Grade>
    </div>
  );
};

// ---------- CHAR / OBJ placed over a background render or flat color ----------
export const place = (
  id: string,
  o: HeatO & { cx?: Range; cy?: Range; h?: Range; w?: Range; bg?: Render | string; rot?: Range; drift?: number },
): Render => (c) => {
  const heat = hOf(o, c.t);
  const h = o.h != null ? pick(c, "h", o.h) : undefined;
  const w = o.w != null ? pick(c, "w", o.w) : undefined;
  const [pw, ph] = picSize(id, w, h);
  const k = 1 + (o.drift ?? 0.04) * c.lt;
  const cx = pick(c, "cx", o.cx ?? 960);
  const cy = pick(c, "cy", o.cy ?? 540);
  const bg = typeof o.bg === "function" ? o.bg(c) : <div style={{ ...abs, background: o.bg ?? tone(heat, 1) }} />;
  return (
    <div style={abs}>
      {bg}
      <Grade id={id} heat={heat}>
        <Img
          src={src(id)}
          style={{
            position: "absolute",
            left: cx - (pw * k) / 2,
            top: cy - (ph * k) / 2,
            width: pw * k,
            height: ph * k,
            transform: `rotate(${pick(c, "r", o.rot ?? 0)}deg)`,
          }}
        />
      </Grade>
    </div>
  );
};

// ---------- SILHOUETTE ----------
export const sil = (id: string, o: { color: string | ((h: number) => string); bg: string | ((h: number) => string); cx?: Range; cy?: Range; w: Range; rot?: Range; heat?: number }): Render => (c) => {
  const heat = o.heat ?? heatAt(c.t);
  const w = pick(c, "w", o.w) * (1 + 0.05 * c.lt);
  const [pw, ph] = picSize(id, w);
  const cx = pick(c, "cx", o.cx ?? 960);
  const cy = pick(c, "cy", o.cy ?? 540);
  const col = typeof o.color === "function" ? o.color(heat) : o.color;
  const bg = typeof o.bg === "function" ? o.bg(heat) : o.bg;
  return (
    <div style={{ ...abs, background: bg }}>
      <div
        style={{
          position: "absolute",
          left: cx - pw / 2,
          top: cy - ph / 2,
          width: pw,
          height: ph,
          backgroundColor: col,
          WebkitMaskImage: `url(${src(id)})`,
          WebkitMaskSize: "100% 100%",
          transform: `rotate(${pick(c, "r", o.rot ?? 0)}deg)`,
        }}
      />
    </div>
  );
};

// ---------- SPLIT ----------
// Panels side by side (dir "v" = vertical columns) or stacked ("h"). Weights re-roll per cut if `jitter`.
export const split = (rs: Render[], o: { dir?: "v" | "h"; weights?: number[]; jitter?: number; gap?: number } = {}): Render => (c) => {
  const n = rs.length;
  const wts = (o.weights ?? rs.map(() => 1)).map((w, i) => w * (1 + (o.jitter ?? 0) * (r01(c, `sw${i}`) * 2 - 1)));
  const sum = wts.reduce((a, b) => a + b, 0);
  const total = o.dir === "h" ? 1080 : 1920;
  const gap = o.gap ?? 6;
  let acc = 0;
  return (
    <div style={{ ...abs, background: "#000" }}>
      {rs.map((r, i) => {
        const a = (acc / sum) * total;
        acc += wts[i];
        const b = (acc / sum) * total;
        const ins = o.dir === "h" ? `${a + (i ? gap / 2 : 0)}px 0 ${1080 - b + (i < n - 1 ? gap / 2 : 0)}px 0` : `0 ${1920 - b + (i < n - 1 ? gap / 2 : 0)}px 0 ${a + (i ? gap / 2 : 0)}px`;
        return (
          <div key={i} style={{ ...abs, clipPath: `inset(${ins})` }}>
            {r({ ...c, seed: `${c.seed}p${i}` })}
          </div>
        );
      })}
    </div>
  );
};

// ---------- modifiers ----------
export const fx = (r: Render, filter: string | ((c: Ctx) => string)): Render => (c) => (
  <div style={{ ...abs, filter: typeof filter === "string" ? filter : filter(c) }}>{r(c)}</div>
);
export const inv = (r: Render) => fx(r, "invert(1)");
export const thresh = (r: Render) => fx(r, "grayscale(1) contrast(9)");
export const stack = (...rs: Render[]): Render => (c) => (
  <div style={abs}>
    {rs.map((r, i) => (
      <React.Fragment key={i}>{r(c)}</React.Fragment>
    ))}
  </div>
);
// SVG overlay drawn in frame coordinates.
export const svg = (draw: (c: Ctx) => React.ReactNode): Render => (c) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {draw(c)}
  </svg>
);
export const flat = (color: string | ((h: number) => string)): Render => (c) => (
  <div style={{ ...abs, background: typeof color === "function" ? color(heatAt(c.t)) : color }} />
);

// ---------- WORD: a lyric keyword filling the frame (Mincho) ----------
export const word = (text: string, o: { size?: number; color?: string; bg?: string | ((h: number) => string); weight?: number; x?: Range; y?: Range; vertical?: boolean } = {}): Render => (c) => {
  const heat = heatAt(c.t);
  const bg = typeof o.bg === "function" ? o.bg(heat) : o.bg ?? "#000";
  return (
    <div style={{ ...abs, background: bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: pick(c, "wx", o.x ?? 960),
          top: pick(c, "wy", o.y ?? 540),
          transform: `translate(-50%,-50%) scale(${1 + 0.15 * c.lt})`,
          fontFamily: MINCHO,
          fontWeight: o.weight ?? 900,
          fontSize: o.size ?? 640,
          lineHeight: 1,
          color: o.color ?? WHITE,
          whiteSpace: "nowrap",
          writingMode: o.vertical ? "vertical-rl" : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------- pixel text block (system voice) ----------
export const PixText: React.FC<{
  x: number;
  y: number;
  size?: number;
  color: string;
  lines: string[];
  lh?: number;
  anchor?: "start" | "middle" | "end";
  bg?: string;
  opacity?: number;
}> = ({ x, y, size = 24, color, lines, lh = 1.25, anchor = "start", bg, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: anchor === "middle" ? "translateX(-50%)" : anchor === "end" ? "translateX(-100%)" : undefined,
      fontFamily: PIX,
      fontSize: size,
      lineHeight: lh,
      color,
      whiteSpace: "pre",
      background: bg,
      opacity,
    }}
  >
    {lines.join("\n")}
  </div>
);

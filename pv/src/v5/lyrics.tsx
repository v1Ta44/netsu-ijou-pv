import React from "react";
import { MINCHO, paletteAt, WHITE } from "../lib/heat";
import { LINES, rnd, sungN } from "../lib/time";

// Lyrics that take part in the chaos: every layout key re-rolls position, size,
// direction and treatment. Text stays Mincho. Older lines linger as ghosts.

const abs: React.CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };

type LayoutFn = (o: { text: string; n: number; seed: string; ui: string; plate: string; scale: number }) => React.ReactNode;

const R = (seed: string, k: string) => rnd(`${seed}${k}`);
const shown = (text: string, n: number) => [...text].map((ch, i) => (i < n ? ch : "　")).join("");

const base = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: "absolute",
  fontFamily: MINCHO,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 1.1,
  whiteSpace: "pre",
  color: WHITE,
  ...extra,
});

const LAYOUTS: LayoutFn[] = [
  // 0 centered on a black bar
  ({ text, n, seed, scale }) => {
    const size = Math.round((110 + R(seed, "s") * 70) * scale);
    return (
      <div style={base(size, { left: 960, top: 540 + (R(seed, "y") - 0.5) * 500, transform: "translate(-50%,-50%)", background: "#000", padding: "0.08em 0.3em" })}>
        {shown(text, n)}
      </div>
    );
  },
  // 1 inverted label tape, small, anywhere
  ({ text, n, seed, ui, plate, scale }) => (
    <div style={base(Math.round(64 * scale), { left: 80 + R(seed, "x") * 900, top: 90 + R(seed, "y") * 820, background: ui, color: plate, padding: "0.05em 0.25em", fontWeight: 700 })}>
      {shown(text, n)}
    </div>
  ),
  // 2 vertical column
  ({ text, n, seed, scale }) => (
    <div style={base(Math.round((96 + R(seed, "s") * 40) * scale), { right: 90 + R(seed, "x") * 1500, top: 70, writingMode: "vertical-rl" })}>{shown(text, n)}</div>
  ),
  // 3 huge, overflowing the frame
  ({ text, n, seed, scale }) => (
    <div style={base(Math.round((380 + R(seed, "s") * 200) * scale), { left: -120 - R(seed, "x") * 600, top: 200 + R(seed, "y") * 400, transform: "translateY(-50%)", opacity: 0.95, fontWeight: 900 })}>
      {shown(text, n)}
    </div>
  ),
  // 4 stacked echoes
  ({ text, n, seed, scale }) => {
    const size = Math.round(96 * scale);
    const x = 100 + R(seed, "x") * 600;
    const y = 160 + R(seed, "y") * 400;
    return (
      <>
        {[0.25, 0.5, 1].map((o, i) => (
          <div key={i} style={base(size, { left: x + i * 34, top: y + i * size * 1.05, opacity: o })}>
            {shown(text, n)}
          </div>
        ))}
      </>
    );
  },
  // 5 rotated along an edge
  ({ text, n, seed, scale }) => {
    const left = R(seed, "e") < 0.5;
    return (
      <div
        style={base(Math.round(120 * scale), {
          left: left ? 70 : 1850,
          top: 540,
          transform: `translate(-50%,-50%) rotate(${left ? -90 : 90}deg)`,
        })}
      >
        {shown(text, n)}
      </div>
    );
  },
  // 6 outline only, giant
  ({ text, n, seed, scale }) => (
    <div
      style={base(Math.round((260 + R(seed, "s") * 120) * scale), {
        left: 960,
        top: 540,
        transform: "translate(-50%,-50%)",
        color: "transparent",
        WebkitTextStroke: `${3 + Math.round(R(seed, "w") * 3)}px ${WHITE}`,
        fontWeight: 900,
      })}
    >
      {shown(text, n)}
    </div>
  ),
  // 7 characters scattered off the grid
  ({ text, n, seed, scale }) => (
    <>
      {[...text].slice(0, n).map((ch, i) => (
        <div
          key={i}
          style={base(Math.round((90 + R(seed, `cs${i}`) * 120) * scale), {
            left: 120 + R(seed, `cx${i}`) * 1600,
            top: 80 + R(seed, `cy${i}`) * 820,
            transform: `rotate(${(R(seed, `cr${i}`) - 0.5) * 40}deg)`,
          })}
        >
          {ch}
        </div>
      ))}
    </>
  ),
  // 8 small, bracketed, corner
  ({ text, n, seed, scale }) => {
    const c = Math.floor(R(seed, "c") * 4);
    const pos: React.CSSProperties = [{ left: 110, top: 150 }, { right: 110, top: 150 }, { left: 110, bottom: 150 }, { right: 110, bottom: 150 }][c];
    return <div style={base(Math.round(72 * scale), { ...pos, fontWeight: 600 })}>{`「${shown(text, n)}」`}</div>;
  },
];

// Entry snap: overshoot in, settle within 3 frames.
const pop = (since: number) => {
  const q = Math.min(1, since / 0.1);
  return 1 + 0.14 * (1 - q) ** 2;
};

export const ChaosLyric: React.FC<{
  t: number;
  li: number;
  layoutKey: string; // changes → new layout
  heat: number;
  scale?: number;
  ghosts?: number; // how many previous lines linger
  span?: number;
  allow?: number[]; // restrict layouts
  text?: string;
  since?: number; // seconds since the layout changed: drives the entry snap
}> = ({ t, li, layoutKey, heat, scale = 1, ghosts = 1, span = 0.55, allow, text, since = 1 }) => {
  const l = LINES[li];
  if (!l || t < l.ls) return null;
  const P = paletteAt(heat);
  const str = text ?? l.text;
  const n = sungN(t, li, [...str].length, span);
  const pool = allow ?? [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 8];
  const seed = `ly${layoutKey}`;
  const L = LAYOUTS[pool[Math.floor(R(seed, "L") * pool.length)]];
  const jx = (R(seed, "jx") - 0.5) * 30;
  const jy = (R(seed, "jy") - 0.5) * 20;
  return (
    <div style={abs}>
      {Array.from({ length: ghosts }, (_, g) => {
        const gl = LINES[li - 1 - g];
        if (!gl || R(seed, `gh${g}`) < 0.65) return null;
        const gs = `${seed}g${g}`;
        return (
          <div key={g} style={{ ...abs, opacity: 0.1 + R(gs, "o") * 0.14 }}>
            {LAYOUTS[[1, 2, 4, 8][Math.floor(R(gs, "L") * 4)]]({ text: gl.text, n: 99, seed: gs, ui: P.ui, plate: P.plate, scale: scale * 0.7 })}
          </div>
        );
      })}
      <div style={{ ...abs, transform: `translate(${jx}px, ${jy}px) scale(${pop(since)})`, transformOrigin: "50% 50%" }}>{L({ text: str, n, seed, ui: P.ui, plate: P.plate, scale })}</div>
    </div>
  );
};

// Plain copy at a fixed spot (for accumulating ×N copies).
export const LyricCopy: React.FC<{ text: string; x: number; y: number; size: number; rot?: number; opacity?: number; strike?: boolean; color?: string; outline?: boolean }> = ({
  text,
  x,
  y,
  size,
  rot = 0,
  opacity = 1,
  strike,
  color = WHITE,
  outline,
}) => (
  <div
    style={base(size, {
      left: x,
      top: y,
      transform: `translate(-50%,-50%) rotate(${rot}deg)`,
      opacity,
      color: outline ? "transparent" : color,
      WebkitTextStroke: outline ? `2px ${color}` : undefined,
      textDecoration: strike ? "line-through" : undefined,
      textDecorationThickness: strike ? "0.09em" : undefined,
    })}
  >
    {text}
  </div>
);

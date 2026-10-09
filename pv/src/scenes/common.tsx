import React from "react";
import { BLUE, ORANGE, paletteAt, WHITE } from "../lib/heat";
import { LINES } from "../lib/time";
import { Lyric, revealN } from "../sys/sys";

export const W = 1920;
export const H = 1080;

export const within = (t: number, a: number, b: number) => t >= a && t < b;

export type Shot = { s: number; e: number; r: (t: number, p: number) => React.ReactNode };
export const Shots: React.FC<{ t: number; list: Shot[] }> = ({ t, list }) => (
  <>
    {list
      .filter((sh) => t >= sh.s && t < sh.e)
      .map((sh) => (
        <React.Fragment key={sh.s}>{sh.r(t, (t - sh.s) / (sh.e - sh.s))}</React.Fragment>
      ))}
  </>
);

export const pal = paletteAt;
export { BLUE, ORANGE, WHITE };

// Manuscript-style vertical lyric block: newest line on the right, older lines step left and dim.
export const Manuscript: React.FC<{
  t: number;
  idx: number[]; // lyric line indices in order
  right: number;
  top: number;
  size: number;
  gap: number;
  hi?: Record<number, Record<number, string>>;
  color?: string;
  shadow?: string;
}> = ({ t, idx, right, top, size, gap, hi, color = WHITE, shadow }) => (
  <>
    {idx.map((li, k) => {
      const l = LINES[li];
      if (t < l.ls) return null;
      const newer = idx.filter((j) => LINES[j].ls <= t).length - 1 - k;
      return (
        <Lyric
          key={li}
          li={li}
          text={l.text}
          t={t}
          start={l.start}
          end={l.end}
          x={right - k * gap}
          y={top}
          size={size}
          vertical
          weight={newer === 0 ? 600 : 400}
          color={color}
          opacity={newer === 0 ? 1 : 0.38}
          hi={hi?.[li]}
          shadow={shadow}
          cursor={newer === 0}
        />
      );
    })}
  </>
);

// Sprint caption: typed lyric on a hard black plate (label-tape look).
export const Cap: React.FC<{
  t: number;
  li: number;
  x: number;
  y: number;
  size?: number;
  span?: number;
  plate?: string;
  color?: string;
  weight?: number;
  jitter?: number;
  text?: string;
  anchor?: "start" | "middle" | "end";
  until?: number;
}> = ({ t, li, x, y, size = 72, span = 0.45, plate = "#000", color = WHITE, weight = 700, jitter, text, anchor = "start", until }) => {
  const l = LINES[li];
  if (t < l.start || t >= (until ?? l.end)) return null;
  const str = text ?? l.text;
  // the plate grows with the typed text (label tape being printed)
  const n = revealN(t, l.start, l.end, [...str].length, span);
  const full = [...str].length * size * 1.08 + size * 0.6;
  const w = Math.min(n + 1, [...str].length) * size * 1.08 + size * 0.6;
  const left = anchor === "middle" ? x - full / 2 : anchor === "end" ? x - full : x;
  return (
    <>
      <div style={{ position: "absolute", left, top: y - size * 0.18, width: w, height: size * 1.36, background: plate }} />
      <Lyric text={str} t={t} start={l.start} end={l.end} x={left + size * 0.3} y={y} size={size} weight={weight} span={span} color={color} jitter={jitter} seed={`cap${li}`} />
    </>
  );
};

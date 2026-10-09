import React from "react";
import { MINCHO, MONO, PIX8, RED, WHITE } from "../lib/heat";
import { BEAT, clamp, FPS, LINES, noise, quant, rnd, steps } from "../lib/time";

// System layer: hard-edged vector UI that belongs to the narrator.

export const Sys: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// ---------- temperature ----------
const TEMP_KEYS: [number, number][] = [
  [0, 36.5],
  [21.9, 36.5],
  [66.5, 41.2],
  [79.69, 41.2],
  [79.7, 52.0],
  [87.5, 52.0],
  [87.6, 38.1],
  [110.4, 38.1],
  [110.167, 44],
  [131.5, 61],
  [142.7, 52],
  [165.0, 180],
  [170.85, 180],
  [170.86, 220],
  [186.19, 240],
  [186.2, 300],
  [207.5, 420],
  [210.76, 420],
  [210.77, 999.9],
  [228.5, 999.9],
  [236, 0],
];
export const tempAt = (t: number) => {
  for (let i = 1; i < TEMP_KEYS.length; i++) {
    const [t1, v1] = TEMP_KEYS[i];
    if (t <= t1) {
      const [t0, v0] = TEMP_KEYS[i - 1];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
};

const tc = (t: number) => {
  const f = Math.floor(t * FPS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(f / (FPS * 3600)))}:${p(Math.floor(f / (FPS * 60)) % 60)}:${p(Math.floor(f / FPS) % 60)}:${p(f % FPS)}`;
};

// ---------- HUD ----------
export const Hud: React.FC<{
  t: number;
  ui: string;
  rec: number; // record number 0..126
  sec: string;
  label: string;
  temp?: number;
  brk?: number; // breakage 0..1
  recOn?: boolean;
  opacity?: number;
  hide?: ("corners" | "rec" | "temp" | "count" | "sec")[];
}> = ({ t, ui, rec, sec, label, temp, brk = 0, recOn = true, opacity = 1, hide = [] }) => {
  const k = Math.floor(t * 15);
  const j = (name: string, amt: number) =>
    brk > 0 ? [(rnd(`hx${name}${k}`) * 2 - 1) * amt * brk, (rnd(`hy${name}${k}`) * 2 - 1) * amt * brk * 0.4] : [0, 0];
  const gone = (name: string) => hide.includes(name as never) || (brk > 0 && rnd(`hg${name}${k}`) < brk * 0.45);
  const blink = Math.floor(t / (BEAT * 2)) % 2 === 0;
  const tv = temp ?? tempAt(t);
  const tempStr = tv >= 999 ? "ERR.OVER" : `${tv.toFixed(1)}℃`;
  const C = 34;
  const I = 40;
  const corner = (x: number, y: number, sx: number, sy: number, n: string) => {
    const [dx, dy] = j(n, 120);
    return (
      <path
        key={n}
        d={`M${x + dx} ${y + dy + sy * C} L${x + dx} ${y + dy} L${x + dx + sx * C} ${y + dy}`}
        stroke={ui}
        strokeWidth={2}
        fill="none"
      />
    );
  };
  const [rx, ry] = j("rec", 200);
  const [tx, ty] = j("temp", 260);
  const [cx, cy] = j("cnt", 200);
  const [sx, sy] = j("sec", 200);
  return (
    <g opacity={opacity} fontFamily={MONO}>
      {!gone("corners") && (
        <>
          {corner(I, I, 1, 1, "c1")}
          {corner(1920 - I, I, -1, 1, "c2")}
          {corner(I, 1080 - I, 1, -1, "c3")}
          {corner(1920 - I, 1080 - I, -1, -1, "c4")}
        </>
      )}
      {!gone("rec") && (
        <g transform={`translate(${rx},${ry})`}>
          <circle cx={76} cy={78} r={9} fill={RED} opacity={recOn ? (blink ? 1 : 0.35) : 0.12} />
          <text x={96} y={87} fontSize={24} fill={WHITE} letterSpacing={0}>
            REC
          </text>
          <text x={162} y={87} fontSize={24} fill={ui} opacity={0.85}>
            {tc(t)}
          </text>
        </g>
      )}
      {!gone("temp") && (
        <g transform={`translate(${tx},${ty})`}>
          <text x={1844} y={87} fontSize={24} fill={ui} textAnchor="end">
            {`CORE TEMP  ${tempStr}`}
          </text>
          <rect x={1604} y={98} width={240} height={3} fill={ui} opacity={0.25} />
          <rect x={1604} y={98} width={240 * clamp((tv - 30) / 220)} height={3} fill={ui} />
        </g>
      )}
      {!gone("count") && (
        <g transform={`translate(${cx},${cy})`}>
          <text x={76} y={1012} fontSize={24} fill={ui}>
            {`LOG.${String(rec).padStart(4, "0")} / 0126`}
          </text>
          <rect x={76} y={1022} width={250} height={2} fill={ui} opacity={0.25} />
          <rect x={76} y={1022} width={250 * (rec / 126)} height={2} fill={ui} />
        </g>
      )}
      {!gone("sec") && (
        <g transform={`translate(${sx},${sy})`}>
          <text x={1844} y={1012} fontSize={24} fill={ui} textAnchor="end">
            {`SEC.${sec}  ${label}`}
          </text>
          <text x={1844} y={1042} fontSize={16} fontFamily={PIX8} fill={ui} textAnchor="end" opacity={0.6}>
            ♩=184.6  4/4
          </text>
        </g>
      )}
    </g>
  );
};

// Width of a string in em for the monospaced pixel font (CJK full-width, latin half).
export const emw = (s: string) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2000 ? 1 : 0.5), 0);

// ---------- LOG ----------
// Shows lines[0..n) where n grows by one per 1/div beat from t0; keeps the last `max`.
export const Log: React.FC<{
  t: number;
  t0: number;
  lines: string[];
  x: number;
  y: number;
  ui: string;
  max?: number;
  div?: number;
  size?: number;
  num0?: number;
  plate?: string;
  w?: number;
  garble?: number;
  opacity?: number;
}> = ({ t, t0, lines, x, y, ui, max = 14, div = 1, size = 24, num0 = 1, plate, w = 520, garble = 0, opacity = 1 }) => {
  if (t < t0) return null;
  const n = Math.min(lines.length, steps(t, t0, div) + 1);
  const first = Math.max(0, n - max);
  const lh = size * 1.6;
  const shown = lines.slice(first, n);
  const cursorOn = Math.floor(t / (BEAT / 2)) % 2 === 0;
  const g = (s: string, i: number) => {
    if (garble <= 0) return s;
    const k = Math.floor(t * 12);
    return [...s]
      .map((ch, ci) => (rnd(`gb${i}:${ci}:${k}`) < garble ? "▓▒░#%&$@¥0"[Math.floor(rnd(`gc${i}:${ci}:${k}`) * 10)] : ch))
      .join("");
  };
  return (
    <g fontFamily={MONO} fontSize={size} opacity={opacity}>
      {plate && <rect x={x - 20} y={y - size - 14} width={w} height={shown.length * lh + 22} fill={plate} opacity={0.82} />}
      {shown.map((s, i) => (
        <g key={first + i}>
          <text x={x} y={y + i * lh} fill={ui} opacity={0.45}>
            {String(num0 + first + i).padStart(4, "0")}
          </text>
          <text x={x + size * 3.4} y={y + i * lh} fill={ui} opacity={i === shown.length - 1 ? 1 : 0.82} style={{ whiteSpace: "pre" }}>
            {g(s, first + i)}
          </text>
        </g>
      ))}
      {cursorOn && (
        <rect
          x={x + size * 3.4 + emw(shown[shown.length - 1] ?? "") * size + 4}
          y={y + (shown.length - 1) * lh - size * 0.85}
          width={size * 0.5}
          height={size}
          fill={ui}
        />
      )}
    </g>
  );
};

// ---------- brackets ----------
// 「 at (x,y) top-left corner, 」 at (x,y) bottom-right corner. Drawn as strokes.
export const Br: React.FC<{ x: number; y: number; s: number; close?: boolean; color: string; w?: number; opacity?: number }> = ({
  x,
  y,
  s,
  close,
  color,
  w,
  opacity = 1,
}) => {
  const sw = w ?? Math.max(3, s * 0.09);
  const d = close ? `M${x} ${y - s} L${x} ${y} L${x - s * 0.55} ${y}` : `M${x} ${y + s} L${x} ${y} L${x + s * 0.55} ${y}`;
  return <path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="square" opacity={opacity} />;
};

// ---------- crosshair / target ----------
export const Target: React.FC<{ x: number; y: number; r: number; color: string; label?: string; sub?: string; lock?: number; opacity?: number }> = ({
  x,
  y,
  r,
  color,
  label,
  sub,
  lock = 1,
  opacity = 1,
}) => {
  const rr = r * (1 + (1 - lock) * 1.5);
  const tick = r * 0.45;
  return (
    <g stroke={color} fill="none" strokeWidth={2} opacity={opacity}>
      <path d={`M${x - rr} ${y - rr + tick} V${y - rr} H${x - rr + tick}`} />
      <path d={`M${x + rr - tick} ${y - rr} H${x + rr} V${y - rr + tick}`} />
      <path d={`M${x - rr} ${y + rr - tick} V${y + rr} H${x - rr + tick}`} />
      <path d={`M${x + rr - tick} ${y + rr} H${x + rr} V${y + rr - tick}`} />
      <line x1={x - 8} y1={y} x2={x + 8} y2={y} />
      <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
      {label && (
        <text x={x + rr + 12} y={y - rr + 16} fill={color} stroke="none" fontFamily={MONO} fontSize={24}>
          {label}
        </text>
      )}
      {sub && (
        <text x={x + rr + 12} y={y - rr + 38} fill={color} stroke="none" fontFamily={PIX8} fontSize={16} opacity={0.7}>
          {sub}
        </text>
      )}
    </g>
  );
};

// ---------- black star ----------
// A black disk with a hot rim, thin spikes and a dashed orbit. Rotation steps on the beat.
export const BlackStar: React.FC<{ x: number; y: number; r: number; rim: string; t: number; spikes?: number; opacity?: number }> = ({
  x,
  y,
  r,
  rim,
  t,
  spikes = 12,
  opacity = 1,
}) => {
  const rotStep = Math.floor((t / BEAT) * 2) * 7.5;
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r * 1.18} fill="none" stroke={rim} strokeWidth={Math.max(1, r * 0.012)} strokeDasharray={`${r * 0.05} ${r * 0.08}`} transform={`rotate(${rotStep} ${x} ${y})`} />
      {Array.from({ length: spikes }, (_, i) => {
        const a = ((i / spikes) * 360 + rotStep) * (Math.PI / 180);
        const l = r * (i % 2 ? 1.9 : 2.6);
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * r * 1.02}
            y1={y + Math.sin(a) * r * 1.02}
            x2={x + Math.cos(a) * l}
            y2={y + Math.sin(a) * l}
            stroke={rim}
            strokeWidth={Math.max(1, r * 0.012)}
          />
        );
      })}
      <circle cx={x} cy={y} r={r * 1.04} fill={rim} opacity={0.9} style={{ filter: `blur(${Math.max(2, r * 0.05)}px)` }} />
      <circle cx={x} cy={y} r={r} fill="#000" />
    </g>
  );
};

// ---------- waveform ----------
// Horizontal waveform between x0..x1 at y. amp in px, `sharp` 0 (sine) .. 1 (spiky).
export const Wave: React.FC<{ x0: number; x1: number; y: number; amp: number; t: number; color: string; sharp?: number; seed?: string; width?: number; n?: number; opacity?: number }> = ({
  x0,
  x1,
  y,
  amp,
  t,
  color,
  sharp = 0.3,
  seed = "wv",
  width = 2,
  n = 160,
  opacity = 1,
}) => {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const env = Math.sin(Math.PI * u) ** 0.6;
    const base = Math.sin(u * 40 + t * 18) * 0.5 + Math.sin(u * 97 - t * 31) * 0.3;
    const sp = noise(u * 60 + t * 24, seed) * (i % 2 ? 1 : -1);
    const v = (base * (1 - sharp) + sp * sharp * 1.6) * env * amp;
    pts.push(`${(x0 + (x1 - x0) * u).toFixed(1)},${(y + v).toFixed(1)}`);
  }
  return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="bevel" opacity={opacity} />;
};

// ---------- price tag ----------
export const Tag: React.FC<{ x: number; y: number; text: string; color: string; ink?: string; rot?: number; s?: number }> = ({
  x,
  y,
  text,
  color,
  ink = "#000",
  rot = 0,
  s = 1,
}) => {
  const w = (34 + text.length * 15) * s;
  const h = 40 * s;
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <line x1={0} y1={-60 * s} x2={0} y2={0} stroke={color} strokeWidth={1.5} />
      <path d={`M${-h * 0.5} ${0} L${0} ${-h * 0.0} L${w} 0 L${w} ${h} L0 ${h} L${-h * 0.5} ${h / 2} Z`} transform={`translate(0,${-h / 2})`} fill={color} />
      <circle cx={-h * 0.18} cy={0} r={4 * s} fill={ink} />
      <text x={10 * s} y={8 * s} fontFamily={MONO} fontSize={24 * Math.max(1, Math.round(s))} fill={ink}>
        {text}
      </text>
    </g>
  );
};

// ---------- lyrics (HTML, so vertical CJK typesetting works) ----------
// Number of characters revealed: quantized to 1/4 beat, spread over `span` of the line.
export const revealN = (t: number, start: number, end: number, len: number, span = 0.7) => {
  if (t < start) return 0;
  const tq = quant(t, 4);
  const p = clamp((Math.max(tq, start) - start) / Math.max(0.05, (end - start) * span));
  return Math.max(1, Math.min(len, Math.ceil(p * len + 1e-6)));
};

export type LyricStyle = {
  size: number;
  color?: string;
  weight?: number;
  font?: string;
  spacing?: number; // letter-spacing in em
  vertical?: boolean;
  shadow?: string;
};

// Typed lyric at (x,y) = top-left (horizontal) or top-right (vertical).
export const Lyric: React.FC<
  LyricStyle & {
    text: string;
    t: number;
    start: number;
    end: number;
    x: number;
    y: number;
    span?: number;
    instant?: boolean;
    cursor?: boolean;
    hi?: Record<number, string>; // char index -> color
    jitter?: number; // per-char displacement px (chaos invading)
    seed?: string;
    opacity?: number;
    anchor?: "start" | "middle" | "end";
  }
> = ({
  text,
  t,
  start,
  end,
  x,
  y,
  size,
  color = WHITE,
  weight = 500,
  font = MINCHO,
  spacing = 0.08,
  vertical,
  span = 0.7,
  instant,
  cursor = true,
  hi,
  jitter = 0,
  seed = "ly",
  opacity = 1,
  shadow,
  anchor = "start",
}) => {
  const chars = [...text];
  const n = instant ? chars.length : revealN(t, start, end, chars.length, span);
  const typing = n < chars.length && cursor;
  const k = Math.floor(t * 10);
  const tx = anchor === "middle" ? "translate(-50%,0)" : anchor === "end" ? "translate(-100%,0)" : "";
  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? undefined : x,
        right: vertical ? 1920 - x : undefined,
        top: y,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: `${spacing}em`,
        color,
        writingMode: vertical ? "vertical-rl" : undefined,
        whiteSpace: "pre",
        opacity,
        textShadow: shadow,
        transform: tx,
      }}
    >
      {chars.map((ch, i) => {
        const vis = i < n;
        const jx = jitter ? (rnd(`${seed}x${i}:${k}`) * 2 - 1) * jitter : 0;
        const jy = jitter ? (rnd(`${seed}y${i}:${k}`) * 2 - 1) * jitter : 0;
        const span = (
          <span
            key={i}
            style={{
              visibility: vis ? "visible" : "hidden",
              color: hi?.[i] ?? undefined,
              display: "inline-block",
              transform: jitter ? `translate(${jx}px, ${jy}px)` : undefined,
            }}
          >
            {ch}
          </span>
        );
        // the typing cursor sits right after the last visible character
        return i === n && typing ? (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                position: "absolute",
                width: vertical ? "0.9em" : "0.5em",
                height: vertical ? "0.5em" : "0.9em",
                background: color,
                opacity: Math.floor(t / (BEAT / 2)) % 2 ? 0.2 : 0.9,
                transform: vertical ? "translate(0.05em, 0.15em)" : "translate(0.1em, 0.15em)",
              }}
            />
            {span}
          </React.Fragment>
        ) : (
          span
        );
      })}
    </div>
  );
};

// Convenience: lyric line by index.
export const lineText = (i: number) => LINES[i].text;

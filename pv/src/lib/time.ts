import { random } from "remotion";
import features from "../../public/features.json";
import lyricsJson from "../../public/lyrics.json";
import ustJson from "../../public/ust_timing.json";

// All scene code works in absolute song seconds. Narrator-layer motion is quantized
// to the beat grid below; world-layer motion uses free noise.

export const FPS = 30;
export const DURATION = features.duration;
export const BEATS: number[] = features.beats;
export const BEAT = 60 / 184.6;
export const BAR = BEAT * 4;

// Fractional beat index at time t (extrapolated outside the tracked range).
export const beatPos = (t: number) => {
  const n = BEATS.length;
  if (t <= BEATS[0]) return (t - BEATS[0]) / BEAT;
  if (t >= BEATS[n - 1]) return n - 1 + (t - BEATS[n - 1]) / BEAT;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (BEATS[m] <= t) lo = m;
    else hi = m;
  }
  return lo + (t - BEATS[lo]) / (BEATS[hi] - BEATS[lo]);
};

export const beatTime = (b: number) => {
  const n = BEATS.length;
  if (b <= 0) return BEATS[0] + b * BEAT;
  if (b >= n - 1) return BEATS[n - 1] + (b - (n - 1)) * BEAT;
  const i = Math.floor(b);
  return BEATS[i] + (b - i) * (BEATS[i + 1] - BEATS[i]);
};

// Time snapped down to the last 1/div beat.
export const quant = (t: number, div = 1) => beatTime(Math.floor(beatPos(t) * div + 1e-4) / div);

// Number of 1/div-beat steps elapsed since t0 (t0 itself counts as step 0).
export const steps = (t: number, t0: number, div = 1) =>
  Math.floor((beatPos(t) - beatPos(t0)) * div + 0.02);

// 1 on each 1/div beat, decaying over `decay` seconds.
export const pulse = (t: number, div = 1, decay = 0.16) => {
  const p = beatPos(t) * div;
  const dt = ((p - Math.floor(p)) * BEAT) / div;
  return Math.max(0, 1 - dt / decay) ** 2;
};

// Decaying pulse after an arbitrary event time.
export const after = (t: number, t0: number, decay = 0.2) =>
  t < t0 ? 0 : Math.max(0, 1 - (t - t0) / decay) ** 2;

type FeatureName = "rms" | "low" | "high" | "vocal" | "onset";
export const feat = (name: FeatureName, t: number) => {
  const arr = features[name] as number[];
  const i = Math.min(arr.length - 1, Math.max(0, Math.floor(t * FPS)));
  return arr[i];
};
// Smoothed feature: mean over the last `win` seconds.
export const featS = (name: FeatureName, t: number, win = 0.2) => {
  const arr = features[name] as number[];
  const i1 = Math.min(arr.length - 1, Math.max(0, Math.floor(t * FPS)));
  const i0 = Math.max(0, i1 - Math.round(win * FPS));
  let s = 0;
  for (let i = i0; i <= i1; i++) s += arr[i];
  return s / (i1 - i0 + 1);
};

export const HITS = features.hits as [number, number][];

// ---- lyrics ----
// start/end: line slots from lyrics.json (cuts and scene motion key off these).
// ls/le/chars: sung timing from the UTAU score (analysis/ust_align.py) that drives
// what text is on screen: each character appears at its own sung onset.
export type Line = { i: number; start: number; end: number; text: string; ls: number; le: number; chars: number[] };
// Lines whose stored end runs through an instrumental get their sung end here.
const SUNG_END: Record<number, number> = { 65: 87.54, 90: 131.5, 125: 228.55 };
const RAW = lyricsJson.lines as { i: number; start: number; end: number; text: string }[];
const UST = ustJson.lines as { i: number; start: number; chars: number[] }[];
export const LINES: Line[] = RAW.map((l, k) => {
  const end = SUNG_END[l.i] ?? l.end;
  const nx = RAW[k + 1];
  // a line that ran up to the next slot now runs up to the next sung onset
  const le = nx && Math.abs(end - nx.start) < 1e-3 ? UST[k + 1].start : end;
  return { i: l.i, start: l.start, end, text: l.text, ls: UST[k].start, le, chars: UST[k].chars };
});
export const L = (i: number) => LINES[i];
export const lineAt = (t: number) => LINES.find((l) => t >= l.start && t < l.end);
// Line whose text is on screen at t (sung timing).
export const lyricAt = (t: number) => LINES.find((l) => t >= l.ls && t < l.le);
// Characters of line li visible at t. Falls back to an even reveal when the text
// was overridden and no longer matches the score.
export const sungN = (t: number, li: number, len: number, span = 0.6) => {
  const l = LINES[li];
  if (!l || t < l.ls) return 0;
  if (len !== l.chars.length) return Math.max(1, Math.min(len, Math.ceil(((t - l.ls) / Math.max(0.05, (l.le - l.ls) * span)) * len)));
  let n = 0;
  while (n < len && l.chars[n] <= t + 1e-4) n++;
  return Math.max(1, n);
};
// Record number shown in the HUD: 1-based, last started line.
export const recordNo = (t: number) => {
  let n = 0;
  for (const l of LINES) if (t >= l.start) n = l.i + 1;
  return n;
};

// ---- sections ----
// Energy bursts land one beat before the first lyric of C / E / H; sections switch on the burst.
export const BURST_C = 66.2;
export const BURST_E = 110.167;
export const BURST_H = 186.2;

export const SEC = {
  A: [0, 21.965],
  B: [21.965, BURST_C],
  C: [BURST_C, 87.54],
  D: [87.54, BURST_E],
  E: [BURST_E, 131.5],
  F1: [131.5, 142.7],
  F2: [142.7, 165.557],
  G: [165.557, BURST_H],
  H: [BURST_H, 207.526],
  I: [207.526, 228.55],
  J: [228.55, 241.2],
} as const;
export type SecName = keyof typeof SEC;
export const SEC_LABEL: Record<SecName, string> = {
  A: "MONOLOGUE",
  B: "RUN",
  C: "BURST",
  D: "CHANT",
  E: "RUN/SELF",
  F1: "SILENCE",
  F2: "ALARM",
  G: "MONOLOGUE/HEAT",
  H: "BURST/HOT",
  I: "RUN/MELTDOWN",
  J: "EOF",
};
export const secAt = (t: number): SecName =>
  (Object.keys(SEC) as SecName[]).find((k) => t >= SEC[k][0] && t < SEC[k][1]) ?? "J";

// ---- noise / easing ----
export const rnd = (seed: string | number) => random(seed);
export const rndr = (seed: string | number, a: number, b: number) => a + (b - a) * random(seed);
const smooth = (x: number) => x * x * (3 - 2 * x);
// 1D value noise in -1..1
export const noise = (x: number, seed: string | number = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`${seed}:${i}`) * 2 - 1;
  const b = random(`${seed}:${i + 1}`) * 2 - 1;
  return a + (b - a) * smooth(f);
};
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOut = (x: number) => 1 - (1 - clamp(x)) ** 3;
export const easeIn = (x: number) => clamp(x) ** 3;
export const easeInOut = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
};
// Narrator motion: value steps toward target only on beat ticks.
export const stepEase = (t: number, t0: number, t1: number, div = 2) => {
  const total = Math.max(1, Math.round((beatPos(t1) - beatPos(t0)) * div));
  return clamp(steps(t, t0, div) / total);
};

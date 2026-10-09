import React from "react";
import { heatAt } from "../lib/heat";
import { beatPos, beatTime, FPS, LINES, lyricAt, rnd } from "../lib/time";
import { buildCuts, Cut, cutAt, CutPlayer, Render, Spec, Tier, TRANSITIONS } from "./engine";
import { makeFillers } from "./filler";
import { ChaosLyric } from "./lyrics";

// Section runner shared by the fast (T1) and burst (T2) sections:
// cut list + overlays + chaotic lyrics + key-point flashes + signal kick.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };

export type Flash = { t: number; frames: number; kind: "white" | "invert" };

export type RunDef = {
  name: string;
  start: number;
  end: number;
  tier: Tier;
  pool: string[]; // assets for fragments
  specs: Spec[];
  repOf?: (li: number) => number;
  rep?: (li: number) => boolean; // lines whose lyric layout re-rolls per cut
  overlay?: (t: number, c: Cut | undefined) => React.ReactNode; // between shots and lyrics
  over?: (t: number, c: Cut | undefined) => React.ReactNode; // above lyrics
  flashes?: Flash[];
  kick?: (t: number) => number; // extra signal kick
  lyric?: (li: number) => { allow?: number[]; ghosts?: number; scale?: number; hide?: boolean; text?: string } | undefined;
  lyricFrom?: number; // first line index shown
  hideLyric?: (t: number) => boolean;
  fillW?: Parameters<typeof makeFillers>[1]; // override whole-slot filler weights
};

export const makeRun = (d: RunDef) => {
  // whole-slot fillers carry content; abstract fields are reserved for 1–2 frame inserts
  const FILL = makeFillers(d.pool, { noise: 0, flat: 0, stripes: 0, scan: 0, black: 0, blocks: 1, ...d.fillW }, false);
  const INS = makeFillers(d.pool, { term: 2, bars: 1, frag: 4, raw: 2, noise: 2, flat: 2, stripes: 2, scan: 1, blocks: 1, black: 2 });
  const cuts = buildCuts(d.name, d.end, d.specs, d.tier, FILL, d.repOf, INS);
  const holdBeats = d.tier === 1 ? 1 : 2;

  const flashAt = (t: number) => d.flashes?.find((f) => t >= f.t && t < f.t + f.frames / FPS);

  const kick = (t: number) => {
    if (t < d.start || t >= d.end) return 0;
    const c = cutAt(cuts, t);
    let k = 0;
    if (c) {
      const trans = TRANSITIONS.includes(c.move) && t - c.s < 4 / FPS;
      k = c.kind === "ins" ? 0.5 : trans ? 0.12 : t - c.s < 1 / FPS && rnd(`kk${d.name}${c.k}`) < 0.4 ? 0.25 : 0;
    }
    if (flashAt(t)) k = Math.max(k, 0.6);
    return Math.max(k, d.kick ? d.kick(t) : 0);
  };

  const Scene: React.FC<{ t: number }> = ({ t }) => {
    const c = cutAt(cuts, t);
    const heat = heatAt(t);
    const l = lyricAt(t);
    const lo = l ? d.lyric?.(l.i) : undefined;
    const showLy =
      l && l.i >= (d.lyricFrom ?? 0) && !lo?.hide && !(d.hideLyric && d.hideLyric(t)) && !(c && c.kind === "ins" && rnd(`hl${d.name}${c.k}`) < 0.5);
    let lk = { key: "", since: 1 };
    if (l) {
      if (c && d.rep && d.rep(l.i)) lk = { key: `${d.name}c${c.k}`, since: t - Math.max(c.s, l.ls) };
      else {
        const b = Math.floor(beatPos(t) / holdBeats) * holdBeats;
        lk = { key: `${d.name}b${b}`, since: t - Math.max(beatTime(b), l.ls) };
      }
    }
    const fl = flashAt(t);
    return (
      <div style={abs}>
        <div style={{ ...abs, filter: fl?.kind === "invert" ? "invert(1)" : undefined }}>
          <CutPlayer t={t} cuts={cuts} />
          {d.overlay?.(t, c)}
          {showLy && l && (
            <ChaosLyric
              t={t}
              li={l.i}
              layoutKey={lk.key}
              since={lk.since}
              heat={heat}
              ghosts={lo?.ghosts ?? 2}
              allow={lo?.allow}
              scale={lo?.scale ?? (d.tier === 2 ? 1.15 : 1)}
              text={lo?.text}
            />
          )}
          {d.over?.(t, c)}
        </div>
        {fl?.kind === "white" && <div style={{ ...abs, background: "#fff" }} />}
      </div>
    );
  };

  return { Scene, kick, cuts, start: d.start, end: d.end };
};

export const L = (i: number) => LINES[i];

import React from "react";
import { heatAt, paletteAt, WHITE } from "../lib/heat";
import { BEAT, BURST_H, clamp, easeInOut, feat, LINES, prog, rnd, SEC } from "../lib/time";
import { Haze } from "../fx/fx";
import { Glow } from "../lib/world";
import { Log, Sys, Target, Wave } from "../sys/sys";
import { Manuscript } from "../scenes/common";
import { Particles } from "./art";
import { Ctx, Render } from "./engine";
import { full, place, PixText, stack, svg, tone, ui } from "./shots";
import { SlowPlayer, timeline } from "./slow";

// A 記録開始 / G 独白・世界升温 (T3). Same shot structure; in G the world burns while
// the narrator layer (log, manuscript lyrics, HUD) stays exactly as cold as in A.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const L = (i: number) => LINES[i];
const B8 = BEAT * 8;

export const A_LOG5 = [
  "boot ADACHI_REI ............ ok",
  "mount /dev/voice ........... ok",
  "sensor check ...... 3 dead px",
  'load "熱異常"',
  "  いよわ feat. 足立レイ",
  "rec start",
  "",
  "let dead = vars.filter(v => !v.alive)",
  "for (const v of dead) repeat(v)",
  "heat = 36.5",
  "",
  "send(log, to: ???)",
  "  -> no route to host",
  "  -> no route to host",
  "  -> timeout",
  "record(monologue)",
  'write("あわれな独り言")',
];
const G_LOG5 = [
  "rec resume",
  "sensor check .... 41 dead px",
  "",
  "let dead = vars.filter(v => !v.alive)",
  "for (const v of dead) repeat(v)",
  "heat = 180.0",
  "heat += count * 0.1",
  "",
  "send(log, to: ???)",
  "  -> no route to host",
  "  -> timeout",
  "record(monologue)",
  'write("あわれな独り言")',
];

// ---------- shared shots (heat comes from the song curve, so G renders them hot) ----------
const slow = (z0: number, push: number) => ({ z: [z0, z0] as [number, number], px: [0, 0] as [number, number], py: [0, 0] as [number, number], drift: push });

// viewfinder opening: the world seen through a horizontal slit that widens
const slit = (r: Render, t0: number, dur: number): Render => (c) => {
  const q = easeInOut(clamp((c.t - t0) / dur));
  const ins = (1 - q) * 540 * 0.94;
  return (
    <div style={{ ...abs, background: "#000" }}>
      <div style={{ ...abs, clipPath: `inset(${ins}px 0 ${ins}px 0)` }}>{r(c)}</div>
    </div>
  );
};
const ruins = full("BG01", { ...slow(1.08, 0.012), py: [0.3, 0.3] });
const FX = 1240;
const FY = 905;
const distant = (hot: boolean): Render => (c) => {
  const heat = heatAt(c.t);
  const lock = clamp((c.t - c.s - 0.6) / 1.2);
  return (
    <div style={abs}>
      {full(hot ? "BG07" : "BG01b", slow(1.05, 0.01))(c)}
      {/* feet planted on the open ground below the horizon, with a contact shadow */}
      <svg width={1920} height={1080} style={abs}>
        <ellipse cx={FX} cy={FY} rx={62} ry={9} fill="#000" opacity={0.5} style={{ filter: "blur(4px)" }} />
      </svg>
      {place("CH01", { h: 260, cx: FX, cy: FY - 128, bg: "transparent", drift: 0 })(c)}
      <svg width={1920} height={1080} style={abs}>
        {lock > 0 && <Target x={FX} y={FY - 130} r={90} lock={lock} color={ui(heat)} label="UNIT 00 / ADACHI REI" sub={`DIST ${(1.62 - lock * 0.4).toFixed(2)}km`} />}
      </svg>
    </div>
  );
};
const profile = (bgId: string): Render => place("CH02", { h: 1250, cx: 1150, cy: 700, bg: full(bgId, slow(1.15, 0.01)), drift: 0.015 });
const hands: Render = place("CH-H1", { w: 1500, cx: 960, cy: 560, bg: (c: Ctx) => <div style={{ ...abs, background: tone(heatAt(c.t), 0) }} />, drift: 0.02 });
const towers = full("BG11", { ...slow(1.12, 0.0), px: [-0.6, -0.6], drift: 0.01 });
const crt = full("OBJ16", slow(1.05, 0.03));
const kneel: Render = place("CH05", { h: 620, cx: 700, cy: 720, bg: full("BG07", slow(1.1, 0.01)), drift: 0.01 });
const fireStreet = full("BG07h", slow(1.1, 0.02));

// monitor wall: earlier shots shrink into a grid, plus readouts; slow pull-back, glitches at the end
const wall = (cells: Render[], t0: number, t1: number): Render => (c) => {
  const heat = heatAt(c.t);
  const P = paletteAt(heat);
  const pull = easeInOut(prog(c.t, t0, t0 + B8));
  const S = 1.9 - 0.9 * pull;
  const chaos = prog(c.t, t1 - BEAT * 4, t1);
  const cw = 560;
  const ch = 315;
  const g = 24;
  const x0 = 960 - (cw * 3 + g * 2) / 2;
  const y0 = 540 - (ch * 3 + g * 2) / 2;
  const k = Math.floor(c.t * 15);
  return (
    <div style={{ ...abs, background: "#000", overflow: "hidden" }}>
      <div style={{ ...abs, transform: `scale(${S})`, transformOrigin: "50% 50%" }}>
        {cells.map((r, i) => {
          const cx = x0 + (i % 3) * (cw + g);
          const cy = y0 + Math.floor(i / 3) * (ch + g);
          const jx = chaos > 0 && rnd(`wj${i}${k}`) < chaos ? (rnd(`wx${i}${k}`) - 0.5) * 120 * chaos : 0;
          const jy = chaos > 0 && rnd(`wk${i}${k}`) < chaos * 0.5 ? (rnd(`wy${i}${k}`) - 0.5) * 60 * chaos : 0;
          return (
            <div key={i} style={{ position: "absolute", left: cx + jx, top: cy + jy, width: cw, height: ch, overflow: "hidden", outline: `2px solid ${P.ui}` }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${cw / 1920})`, transformOrigin: "0 0" }}>
                {r({ ...c, seed: `${c.seed}w${i}` })}
              </div>
              <div style={{ position: "absolute", left: 8, top: 4, fontFamily: "FusionPixel8", fontSize: 16, color: P.ui }}>{`CAM.${String(i).padStart(2, "0")}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
const waveCell: Render = (c) => (
  <div style={{ ...abs, background: "#000" }}>
    {svg((cc) => <Wave x0={100} x1={1820} y={540} amp={80 + 300 * feat("vocal", cc.t)} t={cc.t} color={ui(heatAt(cc.t))} sharp={0.4} width={6} />)(c)}
  </div>
);
const tempCell = (txt: string): Render => (c) => (
  <div style={{ ...abs, background: "#000" }}>
    <PixText x={960} y={360} size={288} color={ui(heatAt(c.t))} anchor="middle" lines={[txt]} />
  </div>
);

// ---------- A ----------
const A_SHOTS = timeline(SEC.A[1], [
  [0, () => <div style={{ ...abs, background: "#000" }} />, "cut"],
  [0.333, slit(ruins, 0.333, B8), "cut"],
  [L(1).start, distant(false), "signal", 0.5],
  [L(1).start + B8, profile("BG01b"), "dissolve", 0.8],
  [L(2).start, hands, "cut"],
  [L(2).start + B8, towers, "signal", 0.5],
  [L(2).start + B8 + BEAT * 4, crt, "dissolve", 0.4],
  [L(3).start, wall([ruins, distant(false), profile("BG01b"), hands, waveCell, towers, crt, tempCell("36.5"), ruins], L(3).start, SEC.A[1]), "cut"],
]);

const Narrator: React.FC<{ t: number; idx: number[]; log: string[]; t0: number; cold?: boolean; logOff?: boolean }> = ({ t, idx, log, t0, cold, logOff }) => {
  const P = paletteAt(cold ? 0.04 : heatAt(t));
  return (
    <>
      {!logOff && (
        <Sys>
          <Log t={t} t0={t0} lines={log} x={120} y={190} ui={P.ui} plate={P.plate} max={12} div={0.5} size={24} w={520} />
        </Sys>
      )}
      <Manuscript t={t} idx={idx} right={1810} top={150} size={52} gap={92} shadow="0 0 12px rgba(0,0,0,0.9)" />
    </>
  );
};

export const SceneA5: React.FC<{ t: number }> = ({ t }) => {
  const cursor = t < 0.333;
  const onWall = t >= L(3).start;
  return (
    <div style={abs}>
      <SlowPlayer t={t} shots={A_SHOTS} />
      {cursor ? (
        <Sys>{Math.floor(t * 6) % 2 === 0 && <rect x={120} y={170} width={12} height={24} fill={WHITE} />}</Sys>
      ) : (
        <Narrator t={t} idx={[0, 1, 2, 3]} log={A_LOG5} t0={0.333} logOff={onWall} />
      )}
    </div>
  );
};

// ---------- G: the same structure, burning ----------
const G0 = SEC.G[0];
const embers: Render = svg((c) => <Particles seed="emb" t={c.t} color="#FFB060" n={120 + Math.floor(prog(c.t, G0, BURST_H) * 220)} speed={-180} />);
const G_SHOTS = timeline(BURST_H, [
  [G0, stack(ruins, embers), "black", 0.5],
  [L(91).start + B8, kneel, "dissolve", 0.8],
  [L(92).start, distant(true), "signal", 0.5],
  [L(92).start + B8, profile("BG07h"), "dissolve", 0.8],
  [L(93).start, stack(hands, embers), "cut"],
  [L(93).start + B8, stack(towers, embers), "signal", 0.5],
  [L(93).start + B8 + BEAT * 4, crt, "dissolve", 0.4],
  [L(94).start, wall([fireStreet, kneel, profile("BG07h"), hands, waveCell, towers, crt, tempCell("220"), stack(ruins, embers)], L(94).start, BURST_H), "cut"],
]);

export const SceneG5: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, G0, BURST_H);
  const heat = heatAt(t);
  return (
    <div style={abs}>
      <Haze t={t} amount={0.1 + p * 0.9}>
        <SlowPlayer t={t} shots={G_SHOTS} />
      </Haze>
      <Glow heat={Math.max(heat, 0.66 + p * 0.1)} cx={0.55} cy={0.6} strength={p * 0.5} />
      <Narrator t={t} idx={[91, 92, 93, 94]} log={G_LOG5} t0={G0} cold logOff={t >= L(94).start} />
    </div>
  );
};

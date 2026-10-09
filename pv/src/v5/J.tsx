import React from "react";
import { heatAt, WHITE } from "../lib/heat";
import { easeInOut, noise, prog, rnd, rndr, SEC } from "../lib/time";
import { Bg, Char, Pic, World } from "../lib/world";
import { Log, Sys } from "../sys/sys";
import { Render } from "./engine";
import { SlowPlayer, timeline } from "./slow";

// J 後奏 3:49–4:01 (T3): the white-out recedes onto snow; keepsakes in the foreground,
// the log closes, REC dies. Shots: wide → low keepsakes → wide pull-out → black.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const J0 = SEC.J[0];
const END = 239.16;
export const J_LOG5 = ["」", "rec stop", "", '"熱異常"  いよわ feat. 足立レイ', "fan-made PV  2026", "visuals   Claude Opus 5.5", "guidance  Ud0n", "", "EOF"];

const Snow: React.FC<{ t: number; n?: number; big?: boolean }> = ({ t, n = 90, big }) => {
  const d = t - J0;
  return (
    <Sys>
      {Array.from({ length: n }, (_, i) => {
        const sp = rndr(`sn${i}`, 30, 90) * (big ? 1.8 : 1);
        const y = ((d * sp + rnd(`sy${i}`) * 1100) % 1100) - 20;
        const x = rnd(`sx${i}`) * 1920 + noise(d * 0.4 + i, `sw${i}`) * 40;
        return <circle key={i} cx={x} cy={y} r={(1 + (i % 3)) * (big ? 2.5 : 1)} fill="#fff" opacity={big ? 0.5 : 0.7} />;
      })}
    </Sys>
  );
};

const wide = (zoom0: number, rate: number, figure: number): Render => (c) => {
  const heat = heatAt(c.t);
  const z = zoom0 + rate * (c.t - c.s);
  return (
    <div style={abs}>
      <World heat={heat} pre="brightness(1.15)">
        <Bg id="BG10" zoom={z} py={0.5} />
      </World>
      <Char heat={heat}>
        <Pic id="CH01" cx={1330} cy={545} h={figure} />
      </Char>
      <Snow t={c.t} />
    </div>
  );
};
const keepsakes: Render = (c) => {
  const heat = heatAt(c.t);
  const lt = c.t - c.s;
  return (
    <div style={abs}>
      <div style={{ ...abs, filter: "blur(6px)" }}>
        <World heat={heat} pre="brightness(1.1)">
          <Bg id="BG10" zoom={1.6} py={0.9} />
        </World>
      </div>
      <Char heat={heat}>
        <div style={{ ...abs, transform: `translateX(${-lt * 14}px)` }}>
          <Pic id="OBJ14" cx={760} cy={760} w={1250} rot={-10} />
          <Pic id="OBJ15" cx={1380} cy={880} w={760} rot={-8} />
        </div>
      </Char>
      <Snow t={c.t} n={40} big />
    </div>
  );
};

const SHOTS = timeline(SEC.J[1], [
  [J0, wide(1.14, -0.006, 92), "cut"],
  [232.3, keepsakes, "dissolve", 1.2],
  [235.6, wide(1.35, -0.06, 120), "dissolve", 1.2],
]);

export const SceneJ5: React.FC<{ t: number }> = ({ t }) => {
  const white = 1 - easeInOut(prog(t, J0, J0 + 3.5));
  const fadeOut = easeInOut(prog(t, END - 1.2, END));
  return (
    <div style={{ ...abs, background: "#000" }}>
      <div style={{ ...abs, opacity: 1 - fadeOut }}>
        <SlowPlayer t={t} shots={SHOTS} />
        <Sys>
          <Log t={t} t0={J0 + 2.2} lines={J_LOG5} x={120} y={200} ui={WHITE} div={0.5} max={10} size={24} num0={126} />
        </Sys>
      </div>
      {white > 0.001 && <div style={{ ...abs, background: "#fff", opacity: white }} />}
    </div>
  );
};

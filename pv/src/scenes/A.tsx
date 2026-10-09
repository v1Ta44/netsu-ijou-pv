import React from "react";
import { heatAt, MINCHO, MONO, PIX8, WHITE } from "../lib/heat";
import { after, BEAT, clamp, easeInOut, feat, featS, L, prog, pulse, rnd, stepEase, steps } from "../lib/time";
import { Bg, Char, Pic, Tile, World } from "../lib/world";
import { Black, Shake, Slices } from "../fx/fx";
import { Br, Log, Sys, Target, Wave } from "../sys/sys";
import { Manuscript, pal, Shots } from "./common";

export const A_LOG = [
  "boot ADACHI_REI ............ ok",
  "mount /dev/voice ........... ok",
  "sensor check ...... 3 dead px",
  'load "熱異常"',
  "  いよわ feat. 足立レイ",
  "rec start",
  "",
  "let dead = vars.filter(v => !v.alive)",
  "for (const v of dead) {",
  "  repeat(v)",
  "  count += 1",
  "}",
  "heat = 36.5",
  "heat += count * 0.1",
  "",
  "send(log, to: ???)",
  "  -> no route to host",
  "  -> no route to host",
  "  -> timeout",
  "record(monologue)",
  'write("あわれな独り言")',
  "  ...",
  "  ...",
  "flush()",
];

const L0 = L(0);
const L1 = L(1);
const L2 = L(2);
const L3 = L(3);

// Monitor wall cells (4x3) for the pull-back in line 0004.
const WALL = { x: 110, y: 250, cw: 300, ch: 176, g: 16 };
const cell = (c: number, r: number) => ({ cx: WALL.x + c * (WALL.cw + WALL.g) + WALL.cw / 2, cy: WALL.y + r * (WALL.ch + WALL.g) + WALL.ch / 2 });

export const SceneA: React.FC<{ t: number }> = ({ t }) => {
  const heat = heatAt(t);
  const P = pal(heat);
  const ui = P.ui;

  return (
    <>
      <Black />
      <Shots
        t={t}
        list={[
          // cursor in the dark
          {
            s: 0,
            e: L0.start,
            r: () => (
              <Sys>
                <rect x={110} y={520} width={22} height={40} fill={WHITE} />
              </Sys>
            ),
          },
          // 0001: a flat line opens into a slit onto the ruins
          {
            s: L0.start,
            e: L1.start,
            r: (t) => {
              const open = easeInOut(prog(t, 1.0, 3.8));
              const hh = 1 + open * 400; // half height of the slit
              const slam = after(t, L0.start, 0.6);
              return (
                <>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 540 - hh, height: hh * 2, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: -(540 - hh), width: 1920, height: 1080 }}>
                      <World heat={heat}>
                        <Bg id="BG01" zoom={1.12 - 0.04 * prog(t, 0, 22)} py={0.3} />
                      </World>
                    </div>
                  </div>
                  <Sys>
                    <Wave x0={0} x1={1920} y={540 - hh} amp={hh < 4 ? 6 * feat("vocal", t) : 0} t={t} color={ui} width={1.5} />
                    <Wave x0={0} x1={1920} y={540 + hh} amp={hh < 4 ? 6 * feat("vocal", t) : 0} t={t} color={ui} width={1.5} seed="w2" />
                    {slam > 0 && <Br x={200} y={200} s={520 * (1 + slam * 0.06)} w={18} color={WHITE} opacity={Math.min(1, slam * 1.6)} />}
                  </Sys>
                </>
              );
            },
          },
          // 0002: full frame, the unit on the horizon, locked
          {
            s: L1.start,
            e: L2.start,
            r: (t) => {
              const lock = stepEase(t, L1.start + BEAT * 2, L1.start + BEAT * 8, 2);
              const shown = steps(t, L1.start, 1) >= 2;
              const ghost = clamp((t - (L1.start + 3.1)) / 0.3);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG01" zoom={1.12 - 0.04 * prog(t, 0, 22)} py={0.3} />
                  </World>
                  {ghost > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 120,
                        top: 40,
                        fontFamily: MINCHO,
                        fontWeight: 900,
                        fontSize: 980,
                        lineHeight: 1,
                        color: "transparent",
                        WebkitTextStroke: `2px #FFB020`,
                        opacity: 0.22 * ghost * (0.85 + 0.15 * pulse(t, 1)),
                      }}
                    >
                      熱
                    </div>
                  )}
                  <Char heat={heat}>
                    <Pic id="CH01" cx={1470} cy={688} h={250} />
                  </Char>
                  <Sys>
                    {shown && <Target x={1470} y={640} r={80} lock={lock} color={ui} label="UNIT 00 / ADACHI REI" sub={`DIST ${(1.62 - lock * 0.4).toFixed(2)}km`} />}
                  </Sys>
                </>
              );
            },
          },
          // 0003: hands on the recorder, a line drawn out of the button
          {
            s: L2.start,
            e: L3.start,
            r: (t) => {
              const press = pulse(t, 0.25, 0.12);
              const len = stepEase(t, L2.start, L2.start + BEAT * 6, 2);
              const v = featS("vocal", t, 0.15);
              return (
                <>
                  <World heat={heat}>
                    <Bg id="BG01" zoom={1.6} px={-0.6} py={0.9} opacity={0.22} />
                  </World>
                  <Char heat={heat}>
                    <div style={{ position: "absolute", inset: 0, transform: `translateY(${press * 5}px)` }}>
                      <Pic id="CH-H1" cx={660} cy={590} w={1150} />
                    </div>
                  </Char>
                  <Sys>
                    <circle cx={735} cy={355} r={6 + 10 * press} fill="none" stroke={ui} strokeWidth={2} />
                    <Wave x0={740} x1={740 + len * 1000} y={355} amp={10 + v * 60} t={t} color={ui} width={2} sharp={0.5} />
                    <Log
                      t={t}
                      t0={L2.start + BEAT * 4}
                      lines={["send(log)", "  to 0.0.0.0 ........ timeout", "  to ::1 ............ refused", "  to ??? ............ no route", "  to (anyone) ....... timeout", "retry in ∞"]}
                      x={1060}
                      y={480}
                      ui={ui}
                      div={0.5}
                      size={20}
                      num0={15}
                    />
                  </Sys>
                </>
              );
            },
          },
          // 0004: pull back into a monitor wall; last bar the wall starts to slip
          {
            s: L3.start,
            e: L3.end,
            r: (t) => {
              const zoomStep = stepEase(t, L3.start, L3.start + BEAT * 8, 1);
              const S = 4.3 - 3.3 * easeInOut(zoomStep);
              const chaos = prog(t, L3.end - BEAT * 4, L3.end);
              const focus = cell(1, 1);
              const cells: React.ReactNode[] = [];
              const kind = ["bg", "log", "ch", "wave", "bgL", "hands", "num", "bgR", "wave2", "bgS", "ch2", "log2"];
              for (let r = 0; r < 3; r++)
                for (let c = 0; c < 4; c++) {
                  const k = kind[r * 4 + c];
                  const { cx, cy } = cell(c, r);
                  const jx = chaos > 0 ? (rnd(`wj${c}${r}${Math.floor(t * 8)}`) * 2 - 1) * 40 * chaos : 0;
                  const jy = chaos > 0 ? (rnd(`wk${c}${r}${Math.floor(t * 8)}`) * 2 - 1) * 26 * chaos : 0;
                  const x = cx + jx;
                  const y = cy + jy;
                  const box = (child: React.ReactNode) => (
                    <div key={k} style={{ position: "absolute", left: x - WALL.cw / 2, top: y - WALL.ch / 2, width: WALL.cw, height: WALL.ch, outline: `1px solid ${ui}`, overflow: "hidden", background: "#000" }}>
                      {child}
                    </div>
                  );
                  if (k === "hands")
                    cells.push(
                      box(
                        <Char heat={heat}>
                          <Pic id="CH-H1" cx={WALL.cw / 2} cy={WALL.ch / 2 + 20} w={WALL.cw * 1.05} />
                        </Char>,
                      ),
                    );
                  else if (k.startsWith("bg"))
                    cells.push(
                      <World key={k} heat={heat}>
                        <Tile id={k === "bgS" ? "BG01b" : "BG01"} cx={x} cy={y} w={WALL.cw} h={WALL.ch} shadow={0} border={ui} u={k === "bgL" ? 0.2 : k === "bgR" ? 0.85 : 0.6} v={0.75} z={k === "bg" ? 1.4 : 2.2} />
                      </World>,
                    );
                  else if (k.startsWith("ch"))
                    cells.push(
                      box(
                        <Char heat={heat}>
                          <Pic id="CH01" cx={WALL.cw / 2} cy={WALL.ch * (k === "ch" ? 0.9 : 1.6)} h={WALL.ch * (k === "ch" ? 1.6 : 3.2)} />
                        </Char>,
                      ),
                    );
                  else
                    cells.push(
                      box(
                        <svg width={WALL.cw} height={WALL.ch}>
                          {k.startsWith("wave") ? (
                            <Wave x0={10} x1={WALL.cw - 10} y={WALL.ch / 2} amp={20 + 60 * feat("vocal", t)} t={t + (k === "wave2" ? 3 : 0)} color={ui} sharp={0.4} />
                          ) : k === "num" ? (
                            <>
                              <text x={20} y={70} fontFamily={MONO} fontSize={48} fill={ui}>
                                36.5℃
                              </text>
                              <text x={20} y={110} fontFamily={PIX8} fontSize={16} fill={ui} opacity={0.6}>
                                CORE / NOMINAL
                              </text>
                            </>
                          ) : (
                            <Log t={t} t0={k === "log" ? 0.333 : 6} lines={A_LOG} x={18} y={32} ui={ui} max={7} size={12} div={0.5} />
                          )}
                        </svg>,
                      ),
                    );
                }
              const ox = 960 - focus.cx * S;
              const oy = 540 - focus.cy * S;
              return (
                <Slices t={t} amount={chaos * 0.6} seed="a4">
                  <Shake t={t} amp={chaos * 10} seed="a4s">
                    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${ox}px, ${oy}px) scale(${S})` }}>
                      {cells}
                    </div>
                  </Shake>
                </Slices>
              );
            },
          },
        ]}
      />
      {/* LOG column, left (0001–0002) */}
      {t < L2.start && t >= L0.start && (
        <Sys>
          <Log t={t} t0={L0.start} lines={A_LOG.slice(0, 14)} x={120} y={190} ui={ui} plate={t > 2 ? P.plate : undefined} max={12} div={0.5} size={24} w={500} />
        </Sys>
      )}
      {/* manuscript lyric, right */}
      {t >= L0.start && (
        <Manuscript
          t={t}
          idx={[0, 1, 2, 3]}
          right={1810}
          top={150}
          size={52}
          gap={92}
          hi={{ 1: { 8: "#FFB020" } }}
          shadow="0 0 12px rgba(0,0,0,0.9)"
        />
      )}
    </>
  );
};


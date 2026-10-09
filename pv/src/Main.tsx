import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { distortAt, SensorNoise, Signal } from "./fx/signal";
import { charHeatAt, heatAt, paletteAt } from "./lib/heat";
import { BEAT, prog, recordNo, secAt, SEC_LABEL, SecName } from "./lib/time";
import { Hud, Sys } from "./sys/sys";
import { SceneA5, SceneG5 } from "./v5/AG";
import { B } from "./v5/B";
import { C } from "./v5/C";
import { F2, SceneD5, SceneF15, SceneF25 } from "./v5/DF";
import { E } from "./v5/E";
import { H } from "./v5/H";
import { I } from "./v5/I";
import { SceneJ5 } from "./v5/J";

// v5: sprint / burst sections (and F2) run on the cut engine; slow sections on the slow player.
const RUNS = { B, C, E, F2, H, I };
const SCENES: Partial<Record<SecName, React.FC<{ t: number }>>> = {
  A: SceneA5,
  B: B.Scene,
  C: C.Scene,
  D: SceneD5,
  E: E.Scene,
  F1: SceneF15,
  F2: SceneF25,
  G: SceneG5,
  H: H.Scene,
  I: I.Scene,
  J: SceneJ5,
};

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Frame t={frame / fps} audio />;
};

// Probe: renders an arbitrary list of song times, one per frame (for contact sheets).
export const Probe: React.FC<{ times: number[] }> = ({ times }) => {
  const frame = useCurrentFrame();
  return <Frame t={times[Math.min(frame, times.length - 1)]} />;
};

export const Frame: React.FC<{ t: number; audio?: boolean }> = ({ t, audio }) => {
  const sec = secAt(t);
  const Scene = SCENES[sec];
  const d = distortAt(t);
  const run = RUNS[sec as keyof typeof RUNS];
  // cut kicks are softer while the world is still cold
  const kick = (run ? run.kick(t) : 0) * (0.7 + 0.3 * Math.min(1, heatAt(t) / 0.5));
  // HUD belongs to the narrator: it follows her (cold in G) heat.
  const P = paletteAt(charHeatAt(t));
  const recOn = !(t >= 87.54 && t < 110.0) && !(t >= 237.2);
  const brk = sec === "I" ? 0.08 + 0.6 * prog(t, 207.5, 228.5) : sec === "F1" ? 0.3 : 0;
  // J: the HUD drains away; REC blinks three times with the last log line, then dies.
  const hide = sec === "J" ? (t > 233 ? (["corners", "temp", "count", "sec"] as const) : (["temp", "sec"] as const)) : [];
  const recBlink = t >= 235.2 && t < 237.2 ? Math.floor((t - 235.2) / (BEAT * 2)) % 2 === 0 : true;
  const showHud = t >= 0.333 && t < 239.16;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {audio && <Audio src={staticFile("netsu_ijou.mp4")} />}
      <Signal t={t} d={d} kick={kick}>
        {Scene ? <Scene t={t} /> : null}
        {showHud && (
          <Sys>
            <Hud t={t} ui={P.ui} rec={recordNo(t)} sec={sec} label={SEC_LABEL[sec]} recOn={recOn && recBlink} brk={brk} hide={[...hide]} />
          </Sys>
        )}
      </Signal>
      <SensorNoise t={t} d={d} kick={kick} />
    </AbsoluteFill>
  );
};

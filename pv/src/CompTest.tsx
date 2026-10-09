import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { gradeAt, Graded, LightSilhouette, plateColor, uiColor, WhiteHeat } from "./grade";
import analysis from "../public/analysis.json";

// Compositing test: neutral generated assets + SVG system layer + heat-driven grade.
// Heat ramps 0 → 1 over the composition so one render shows all grades.

const beats = analysis.beats as number[];

const LOG_LINES = [
  "0001 | var heat = 36.5",
  "0002 | count(dead_vars)",
  "0003 | send_to = null",
  "0004 | record(monologue)",
  "0005 | var hope = undefined",
  "0006 | delete(memory[7])",
  "0007 | delete(memory[8])",
  "0008 | ERR: core temp rising",
];

const LYRIC_FONT = "'Noto Serif JP', 'Yu Mincho', serif";
const MONO = "Consolas, monospace";

export const CompTest: React.FC<{ heat?: number }> = ({ heat: heatProp }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const heat = heatProp ?? frame / Math.max(1, durationInFrames - 1);
  const grade = gradeAt(heat);
  const ui = uiColor(grade);
  const plate = plateColor(grade);
  const lastBeat = beats.filter((b) => b <= t).pop() ?? 0;
  const pulse = Math.max(0, 1 - (t - lastBeat) / 0.15);
  const temp = (36.5 + heat * 900).toFixed(1);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* world: background + objects */}
      <Graded id={`w${frame}`} grade={grade} layer="world">
        <Img src={staticFile("test/BG01.png")} style={{ position: "absolute", width: 1920, height: 1080 }} />
      </Graded>

      {/* moon: light silhouette, not a solid object */}
      <WhiteHeat heat={heat} />
      <LightSilhouette src={staticFile("test/OBJ03.png")} grade={grade} heat={heat} style={{ left: 1440, top: 140, width: 229, height: 300 }} />

      {/* character: graded separately so she stays the brightest element */}
      <Graded id={`c${frame}`} grade={grade} layer="char" heat={heat}>
        <Img src={staticFile("test/CH01.png")} style={{ position: "absolute", left: 980, top: 300, height: 760 }} />
      </Graded>
      {/* light wrap: the white heat spills over her */}
      <WhiteHeat heat={heat} strength={0.35} />

      {/* system layer (SVG) */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={i * 160} y1={0} x2={i * 160} y2={1080} stroke={ui} strokeOpacity={0.1} strokeWidth={1} />
        ))}
        {/* LOG column */}
        <rect x={80} y={120} width={520} height={360} fill={plate} fillOpacity={0.78} />
        {LOG_LINES.map((l, i) => (
          <text key={i} x={100} y={160 + i * 40} fontFamily={MONO} fontSize={22} fill={ui} fillOpacity={0.9}>
            {l}
          </text>
        ))}
        {/* lyric: fixed near-white on a dark plate */}
        <rect x={90} y={572} width={720} height={96} fill={plate} fillOpacity={0.72} />
        <text x={120} y={642} fontFamily={LYRIC_FONT} fontSize={64} fill="#F4F1EC">
          「数え事が孕んだ熱」
        </text>
        {/* REC */}
        <rect x={76} y={46} width={112} height={48} fill={plate} fillOpacity={0.72} />
        <circle cx={100} cy={70} r={12} fill="#ff1744" opacity={0.4 + pulse * 0.6} />
        <text x={124} y={79} fontFamily={MONO} fontSize={26} fill="#F4F1EC">REC</text>
        {/* TEMP on its own plate */}
        <rect x={1500} y={36} width={360} height={84} fill={plate} fillOpacity={0.72} />
        <text x={1840} y={80} textAnchor="end" fontFamily={MONO} fontSize={34} fill={ui}>
          TEMP {temp}℃
        </text>
        <rect x={1540} y={100} width={300} height={6} fill={ui} fillOpacity={0.25} />
        <rect x={1540} y={100} width={300 * heat} height={6} fill={ui} />
        {/* crosshair on character */}
        <g stroke={ui} strokeWidth={2} fill="none" opacity={0.85}>
          <circle cx={1150} cy={380} r={70} />
          <line x1={1050} y1={380} x2={1250} y2={380} />
          <line x1={1150} y1={280} x2={1150} y2={480} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

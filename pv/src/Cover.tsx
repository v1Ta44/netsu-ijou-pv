import React from "react";
import { AbsoluteFill } from "remotion";
import { SensorNoise } from "./fx/signal";
import { RGBSplit } from "./fx/fx";
import { MINCHO, paletteAt, PIX, WHITE } from "./lib/heat";
import { rnd } from "./lib/time";
import { Bg, Char } from "./lib/world";
import { Hud, Sys } from "./sys/sys";

// Release cover / thumbnail (1920x1080 still). Built from the PV's own layers so it
// reads as a frame of the film: graded art, HUD, glitched Mincho title, sensor noise.

const abs: React.CSSProperties = { position: "absolute", inset: 0 };

// Title with deterministic horizontal tear slices + chroma split.
const Title: React.FC<{
  x: number;
  y: number;
  size: number;
  text?: string;
  color?: string;
  tears?: { y0: number; y1: number; dx: number }[]; // fractions of the glyph height
  chroma?: number;
  vertical?: boolean;
}> = ({ x, y, size, text = "熱異常", color = WHITE, tears = [], chroma = 6, vertical }) => {
  const glyph = (dx: number, clip?: string) => (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y,
        fontFamily: MINCHO,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: vertical ? 0 : size * 0.02,
        color,
        whiteSpace: "nowrap",
        writingMode: vertical ? "vertical-rl" : undefined,
        clipPath: clip,
        textShadow: "0 0 24px rgba(0,0,0,0.45)",
      }}
    >
      {text}
    </div>
  );
  // slice the glyph into horizontal bands; torn bands are shifted sideways
  const sorted = [...tears].sort((a, b) => a.y0 - b.y0);
  const bands: { y0: number; y1: number; dx: number }[] = [];
  let yc = 0;
  for (const b of sorted) {
    if (b.y0 > yc) bands.push({ y0: yc, y1: b.y0, dx: 0 });
    bands.push(b);
    yc = b.y1;
  }
  if (yc < 1) bands.push({ y0: yc, y1: 1, dx: 0 });
  // overscan the outer bands so ascenders/descenders aren't clipped by the line box
  const top = (v: number) => (v <= 0 ? -20 : v * 100);
  const bot = (v: number) => (v >= 1 ? -20 : (1 - v) * 100);
  return (
    <div style={abs}>
      <RGBSplit d={chroma}>
        {bands.map((b, i) => (
          <React.Fragment key={i}>{glyph(b.dx, `inset(${top(b.y0)}% -20% ${bot(b.y1)}% -20%)`)}</React.Fragment>
        ))}
      </RGBSplit>
    </div>
  );
};

// Thin full-width interference bands drawn over everything.
const Bands: React.FC<{ seed: string; n: number; opacity?: number }> = ({ seed, n, opacity = 1 }) => (
  <Sys>
    {Array.from({ length: n }, (_, i) => {
      const y = rnd(`${seed}y${i}`) * 1080;
      const h = 2 + rnd(`${seed}h${i}`) ** 2 * 26;
      return (
        <g key={i} opacity={opacity}>
          <rect x={0} y={y} width={1920} height={h} fill="#fff" opacity={0.05 + rnd(`${seed}o${i}`) * 0.08} />
          <rect x={0} y={y} width={1920} height={1.5} fill="#fff" opacity={0.3} />
        </g>
      );
    })}
  </Sys>
);

const Credit: React.FC<{ x: number; y: number; ui: string; anchor?: "start" | "end" }> = ({ x, y, ui, anchor = "start" }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: anchor === "end" ? "translateX(-100%)" : undefined,
      textAlign: anchor === "end" ? "right" : "left",
      fontFamily: PIX,
      color: WHITE,
      whiteSpace: "pre",
    }}
  >
    <div style={{ fontSize: 60, lineHeight: 1.2 }}>いよわ feat. 足立レイ</div>
    <div style={{ fontSize: 36, lineHeight: 1.6, color: ui }}>{"fan-made PV  //  LOG.0126"}</div>
  </div>
);

const Hud0: React.FC<{ ui: string; temp: number; sec: string; label: string }> = ({ ui, temp, sec, label }) => (
  <Sys>
    <Hud t={210.9} ui={ui} rec={126} sec={sec} label={label} temp={temp} />
  </Sys>
);

// The overheated eye fills the right; title stacked on a dark plate on the left.
const Eye: React.FC = () => {
  const heat = 0.74;
  const P = paletteAt(heat);
  return (
    <div style={{ ...abs, background: "#000" }}>
      <Char heat={heat}>
        <Bg id="CH-E2" zoom={1.18} px={-0.9} py={0.1} style={{ transform: "translateX(380px)" }} />
      </Char>
      <div
        style={{
          ...abs,
          background: `linear-gradient(90deg, ${P.plate} 0%, ${P.plate} 30%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0) 72%)`,
        }}
      />
      <Title
        x={104}
        y={250}
        size={300}
        tears={[
          { y0: 0.18, y1: 0.24, dx: 38 },
          { y0: 0.52, y1: 0.6, dx: -26 },
          { y0: 0.78, y1: 0.8, dx: 64 },
        ]}
      />
      <Credit x={112} y={640} ui={P.ui} />
      <Bands seed="eye" n={7} />
      {/* keep the HUD readable over the bright skin tones */}
      <div style={{ ...abs, background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 86%, rgba(0,0,0,0.6) 100%)" }} />
      <Hud0 ui={WHITE} temp={999.9} sec="I" label="OVERHEAT" />
    </div>
  );
};

export const Cover: React.FC = () => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <Eye />
    <SensorNoise t={212.3} d={0.32} />
  </AbsoluteFill>
);

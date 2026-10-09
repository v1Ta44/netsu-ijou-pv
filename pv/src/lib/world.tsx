import React, { useId } from "react";
import { Img, staticFile } from "remotion";
import { Graded, LightSilhouette, WhiteHeat } from "../grade";
import { paletteAt } from "./heat";
import { SIZES } from "./sizes";

// World / character placement. Positions are frame pixels (1920x1080), center-based.

export const src = (id: string) => staticFile(`c/${id}.png`);
const sid = () => useId().replace(/[^a-zA-Z0-9]/g, "");

// Graded world layer (backgrounds, objects).
// `pre`: CSS filter applied before grading (e.g. "brightness(1.5)" to lift a mid-gray asset).
export const World: React.FC<{ heat: number; children: React.ReactNode; style?: React.CSSProperties; pre?: string }> = ({
  heat,
  children,
  style,
  pre,
}) => {
  const id = `w${sid()}`;
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <Graded id={id} grade={paletteAt(heat).g} layer="world">
        {pre ? <div style={{ position: "absolute", inset: 0, filter: pre }}>{children}</div> : children}
      </Graded>
    </div>
  );
};

// Graded character layer: she stays the brightest thing on screen.
export const Char: React.FC<{ heat: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  heat,
  children,
  style,
}) => {
  const id = `c${sid()}`;
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <Graded id={id} grade={paletteAt(heat).g} layer="char" heat={heat}>
        {children}
      </Graded>
    </div>
  );
};

export const Glow: React.FC<{ heat: number; cx?: number; cy?: number; strength?: number }> = (p) => (
  <WhiteHeat heat={p.heat} cx={p.cx} cy={p.cy} strength={p.strength} />
);

type PicProps = {
  id: string;
  cx: number;
  cy: number;
  w?: number; // width in px (or use h)
  h?: number;
  rot?: number;
  flipX?: boolean; // never for Rei: her side ponytail is asymmetric
  opacity?: number;
  style?: React.CSSProperties;
};

export const picSize = (id: string, w?: number, h?: number): [number, number] => {
  const [iw, ih] = SIZES[id];
  if (w != null) return [w, (w * ih) / iw];
  if (h != null) return [(h * iw) / ih, h];
  return [iw, ih];
};

export const Pic: React.FC<PicProps> = ({ id, cx, cy, w, h, rot = 0, flipX, opacity = 1, style }) => {
  const [pw, ph] = picSize(id, w, h);
  return (
    <Img
      src={src(id)}
      style={{
        position: "absolute",
        left: cx - pw / 2,
        top: cy - ph / 2,
        width: pw,
        height: ph,
        opacity,
        transform: `rotate(${rot}deg)${flipX ? " scaleX(-1)" : ""}`,
        ...style,
      }}
    />
  );
};

// Full-frame background with zoom and pan (pan in -1..1 of the available overscan).
export const Bg: React.FC<{
  id: string;
  zoom?: number;
  px?: number;
  py?: number;
  rot?: number;
  flipX?: boolean;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ id, zoom = 1, px = 0, py = 0, rot = 0, flipX, opacity = 1, style }) => {
  const [iw, ih] = SIZES[id];
  const cover = Math.max(1920 / iw, 1080 / ih) * zoom;
  const w = iw * cover;
  const h = ih * cover;
  const ox = ((w - 1920) / 2) * px;
  const oy = ((h - 1080) / 2) * py;
  return (
    <Img
      src={src(id)}
      style={{
        position: "absolute",
        left: (1920 - w) / 2 - ox,
        top: (1080 - h) / 2 - oy,
        width: w,
        height: h,
        opacity,
        transform: `rotate(${rot}deg)${flipX ? " scaleX(-1)" : ""}`,
        ...style,
      }}
    />
  );
};

// Collage cut: a hard-edged rectangle showing a region of an asset.
// u/v: crop center in the asset (0..1), z: zoom relative to the tile filling the asset width.
export const Tile: React.FC<{
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot?: number;
  u?: number;
  v?: number;
  z?: number;
  shadow?: number;
  border?: string;
  bg?: string;
  opacity?: number;
  flipX?: boolean;
}> = ({ id, cx, cy, w, h, rot = 0, u = 0.5, v = 0.5, z = 1, shadow = 14, border, bg = "#000", opacity = 1, flipX }) => {
  const [iw, ih] = SIZES[id];
  const s = Math.max(w / iw, h / ih) * z;
  const dw = iw * s;
  const dh = ih * s;
  const left = Math.min(0, Math.max(w - dw, w / 2 - u * dw));
  const top = Math.min(0, Math.max(h - dh, h / 2 - v * dh));
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        overflow: "hidden",
        transform: `rotate(${rot}deg)`,
        boxShadow: shadow ? `${shadow}px ${shadow}px 0 rgba(0,0,0,0.75)` : undefined,
        outline: border ? `2px solid ${border}` : undefined,
        background: bg,
        opacity,
      }}
    >
      <Img
        src={src(id)}
        style={{
          position: "absolute",
          left,
          top,
          width: dw,
          height: dh,
          transform: flipX ? "scaleX(-1)" : undefined,
        }}
      />
    </div>
  );
};

// Giant glyph as a window: the asset is visible only through the letterform.
export const GlyphWindow: React.FC<{
  text: string;
  id: string;
  x: number;
  y: number;
  size: number;
  font: string;
  weight?: number;
  bgPos?: string;
  bgSize?: string;
  vertical?: boolean;
  letterSpacing?: number;
}> = ({ text, id, x, y, size, font, weight = 900, bgPos = "center", bgSize = "cover", vertical, letterSpacing = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      fontFamily: font,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1,
      letterSpacing,
      whiteSpace: "nowrap",
      writingMode: vertical ? "vertical-rl" : undefined,
      backgroundImage: `url(${src(id)})`,
      backgroundSize: bgSize,
      backgroundPosition: bgPos,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    }}
  >
    {text}
  </div>
);

// Light source silhouette (moon, sun) wrapper using the grade.
export const Light: React.FC<{ id: string; heat: number; cx: number; cy: number; w: number; glow?: number; opacity?: number }> = ({
  id,
  heat,
  cx,
  cy,
  w,
  glow = 1,
  opacity = 1,
}) => {
  const [pw, ph] = picSize(id, w);
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <LightSilhouette
        src={src(id)}
        grade={paletteAt(heat).g}
        heat={heat}
        glow={glow}
        style={{ left: cx - pw / 2, top: cy - ph / 2, width: pw, height: ph }}
      />
    </div>
  );
};

// Solid silhouette of an asset's alpha (e.g. the kusarigama as a pure black shape).
export const Silhouette: React.FC<{ id: string; cx: number; cy: number; w: number; rot?: number; color: string; flipX?: boolean; opacity?: number }> = ({
  id,
  cx,
  cy,
  w,
  rot = 0,
  color,
  flipX,
  opacity = 1,
}) => {
  const [pw, ph] = picSize(id, w);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - pw / 2,
        top: cy - ph / 2,
        width: pw,
        height: ph,
        backgroundColor: color,
        opacity,
        WebkitMaskImage: `url(${src(id)})`,
        WebkitMaskSize: "100% 100%",
        transform: `rotate(${rot}deg)${flipX ? " scaleX(-1)" : ""}`,
      }}
    />
  );
};

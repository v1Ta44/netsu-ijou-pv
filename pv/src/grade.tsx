import React from "react";

// Post-process tone grading (plan B). Generated assets stay neutral; all darkening,
// contrast and saturation happen here, driven by a single `heat` value (0..1).
//
// World layer (backgrounds, objects): luminance → levels (gamma) → gradient map,
// then a multiply-blend with the source so a little of the original hue survives.
// Character layer (足立レイ): graded separately and gently, whites stay the
// brightest thing on screen so she always separates from the world.

type RGB = [number, number, number];

export type Grade = {
  stops: RGB[]; // gradient map colors at positions STOP_POS
  gamma: number; // levels: >1 crushes toward black, <1 lifts toward white
  keep: number; // 0..1, share of original hue kept via multiply blend
  charAmp: RGB; // character tint: pure white maps to this
  charGamma: number; // character contrast; >1 deepens lines/shadows, keeps whites
  charLift: RGB; // character black level (0..1 per channel); tinted toward the scene in hot grades
  ui: RGB; // SVG system layer accent
  light: RGB; // light sources (moon / sun / fire) drawn as luminous silhouettes
  plate: RGB; // backing plate behind text / UI, darkest tone of the grade
};

const STOP_POS = [0, 0.04, 0.45, 0.8, 1];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

export const GRADES: Record<"cold" | "warm" | "hot" | "overheat", Grade> = {
  cold: {
    stops: ["#010204", "#0B1422", "#1C3048", "#3F5E7E", "#A8BED2"].map(hex),
    gamma: 2.0,
    keep: 0.3,
    charAmp: [0.8, 0.86, 0.96],
    charGamma: 1.2,
    charLift: [0.09, 0.1, 0.12],
    ui: hex("#E8ECEF"),
    light: hex("#DCE8F5"),
    plate: hex("#05090F"),
  },
  warm: {
    stops: ["#030100", "#1E0A02", "#5A1C04", "#C2410C", "#FFB020"].map(hex),
    gamma: 2.1,
    keep: 0.25,
    charAmp: [0.96, 0.86, 0.74],
    charGamma: 1.2,
    charLift: [0.12, 0.09, 0.07],
    ui: hex("#FFC94A"),
    light: hex("#FFE2A8"),
    plate: hex("#0C0401"),
  },
  hot: {
    stops: ["#040000", "#240202", "#6A0606", "#C4160A", "#FF5A1F"].map(hex),
    gamma: 2.2,
    keep: 0.2,
    charAmp: [1.0, 0.8, 0.72],
    charGamma: 1.25,
    charLift: [0.14, 0.07, 0.06],
    ui: hex("#FF7A45"),
    light: hex("#FFC08A"),
    plate: hex("#120101"),
  },
  // overheat: white-hot highlights, saturated vermilion mid-tones, dark red linework
  overheat: {
    stops: ["#1A0000", "#4A0201", "#A80C06", "#FF3A16", "#FFF4EA"].map(hex),
    gamma: 0.65,
    keep: 0.08,
    charAmp: [1.0, 0.8, 0.74],
    charGamma: 0.9,
    charLift: [0.36, 0.07, 0.04],
    ui: hex("#FFF3E6"),
    light: hex("#FFFFFF"),
    plate: hex("#2A0000"),
  },
};

const HEAT_STOPS: [number, Grade][] = [
  [0, GRADES.cold],
  [0.33, GRADES.warm],
  [0.66, GRADES.hot],
  [1, GRADES.overheat],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number) => [0, 1, 2].map((i) => lerp(a[i], b[i], t)) as RGB;

export const mixGrade = (a: Grade, b: Grade, t: number): Grade => ({
  stops: a.stops.map((c, i) => lerpRGB(c, b.stops[i], t)),
  gamma: lerp(a.gamma, b.gamma, t),
  keep: lerp(a.keep, b.keep, t),
  charAmp: lerpRGB(a.charAmp, b.charAmp, t),
  charGamma: lerp(a.charGamma, b.charGamma, t),
  charLift: lerpRGB(a.charLift, b.charLift, t),
  ui: lerpRGB(a.ui, b.ui, t),
  light: lerpRGB(a.light, b.light, t),
  plate: lerpRGB(a.plate, b.plate, t),
});

export const gradeAt = (heat: number): Grade => {
  const h = Math.min(1, Math.max(0, heat));
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [h0, g0] = HEAT_STOPS[i - 1];
    const [h1, g1] = HEAT_STOPS[i];
    if (h <= h1) return mixGrade(g0, g1, (h - h0) / (h1 - h0));
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
};

const css = (c: RGB) => `rgb(${c.map(Math.round).join(",")})`;
export const uiColor = (g: Grade) => css(g.ui);
export const plateColor = (g: Grade) => css(g.plate);

const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const LIGHT_CAP = 0.85; // light sources stay below the character's white
// In overheat the cap is lifted: lights dissolve into the glare instead of turning gray.
export const overheatAmount = (heat: number) => Math.min(1, Math.max(0, (heat - 0.66) / 0.34));
export const lightColor = (g: Grade, heat = 0) => {
  const charWhite = luma(g.charAmp.map((v) => v * 255) as RGB);
  const capped = Math.min(1, (charWhite * LIGHT_CAP) / Math.max(1, luma(g.light)));
  const k = lerp(capped, 1, overheatAmount(heat));
  return css(g.light.map((v) => v * k) as RGB);
};

// Sample the gradient map with levels baked in, as feFuncX tableValues per channel.
const TABLE_SIZE = 32;
const gradientTables = (g: Grade): [string, string, string] => {
  const ch: number[][] = [[], [], []];
  for (let i = 0; i < TABLE_SIZE; i++) {
    const l = Math.pow(i / (TABLE_SIZE - 1), g.gamma);
    let k = 1;
    while (k < STOP_POS.length - 1 && l > STOP_POS[k]) k++;
    const t = (l - STOP_POS[k - 1]) / (STOP_POS[k] - STOP_POS[k - 1]);
    const c = lerpRGB(g.stops[k - 1], g.stops[k], Math.min(1, Math.max(0, t)));
    c.forEach((v, j) => ch[j].push(v / 255));
  }
  return ch.map((v) => v.map((x) => x.toFixed(4)).join(" ")) as [string, string, string];
};

// Character blacks (tights, collar, headset) are lifted above the world's crushed darks
// via `charLift`, so she never melts into dark ground. In overheat the lift turns dark red.

const LUMA = "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0";

// Wraps children in a graded layer. `id` must be unique within the frame.
export const Graded: React.FC<{
  id: string;
  grade: Grade;
  layer: "world" | "char";
  heat?: number; // char layer: enables the overheat rim light
  children: React.ReactNode;
}> = ({ id, grade, layer, heat = 0, children }) => {
  let filter: React.ReactNode;
  if (layer === "world") {
    const [r, g, b] = gradientTables(grade);
    filter = (
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values={LUMA} result="luma" />
        <feComponentTransfer in="luma" result="mapped">
          <feFuncR type="table" tableValues={r} />
          <feFuncG type="table" tableValues={g} />
          <feFuncB type="table" tableValues={b} />
        </feComponentTransfer>
        {/* mapped * (1 - keep + keep * source): darkens with source, keeps a trace of its hue */}
        <feComposite in="mapped" in2="SourceGraphic" operator="arithmetic" k1={grade.keep} k2={1 - grade.keep} k3={0} k4={0} />
      </filter>
    );
  } else {
    filter = (
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="1.1" />
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude={grade.charAmp[0] - grade.charLift[0]} exponent={grade.charGamma} offset={grade.charLift[0]} />
          <feFuncG type="gamma" amplitude={grade.charAmp[1] - grade.charLift[1]} exponent={grade.charGamma} offset={grade.charLift[1]} />
          <feFuncB type="gamma" amplitude={grade.charAmp[2] - grade.charLift[2]} exponent={grade.charGamma} offset={grade.charLift[2]} />
        </feComponentTransfer>
      </filter>
    );
  }
  const rim = layer === "char" ? overheatAmount(heat) : 0;
  const rimFilter =
    rim > 0
      ? ` drop-shadow(0 0 ${3 + 3 * rim}px rgba(255,236,224,${0.9 * rim})) drop-shadow(0 0 ${14 * rim}px rgba(255,70,30,${0.7 * rim}))`
      : "";
  return (
    <div style={{ position: "absolute", inset: 0, filter: `url(#${id})${rimFilter}` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        {filter}
      </svg>
      {children}
    </div>
  );
};

// Light source as a luminous silhouette: only the asset's alpha shape is used,
// filled with the grade's light color plus a soft glow. Not world-graded.
export const LightSilhouette: React.FC<{
  src: string;
  grade: Grade;
  heat: number;
  style: React.CSSProperties; // position + width/height
  glow?: number;
}> = ({ src, grade, heat, style, glow = 1 }) => {
  const c = lightColor(grade, heat);
  const oh = overheatAmount(heat);
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        opacity: 1 - 0.4 * oh, // half-dissolved in the overheat glare
        filter: `drop-shadow(0 0 ${6 * glow}px ${c}) drop-shadow(0 0 ${18 * glow}px ${c})`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: c,
          WebkitMaskImage: `url(${src})`,
          WebkitMaskSize: "100% 100%",
          maskImage: `url(${src})`,
          maskSize: "100% 100%",
        }}
      />
    </div>
  );
};

// Overheat only: a white-hot radial bloom screened over the world layer,
// centered near the horizon, fading in from heat 0.66 → 1.
// Render once under the character, and once over it with `strength` ≈ 0.35 as light wrap.
export const WhiteHeat: React.FC<{ heat: number; cx?: number; cy?: number; strength?: number }> = ({
  heat,
  cx = 0.62,
  cy = 0.66,
  strength = 1,
}) => {
  const a = overheatAmount(heat) * strength;
  if (a <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        opacity: a,
        background: `radial-gradient(ellipse 55% 60% at ${cx * 100}% ${cy * 100}%,
          rgba(255,250,244,1) 0%, rgba(255,214,190,0.9) 22%, rgba(255,90,40,0.55) 48%, rgba(120,8,0,0) 78%)`,
      }}
    />
  );
};

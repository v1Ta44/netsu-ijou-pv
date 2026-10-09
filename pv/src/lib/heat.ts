import { gradeAt, Grade, plateColor, uiColor } from "../grade";
import { clamp } from "./time";
import { PIX, PIX8 } from "./fonts";

// Song-wide heat curve (world layer). Pairs [time, heat]; equal times make hard cuts.
const KEYS: [number, number][] = [
  [0, 0],
  [21.96, 0],
  [21.965, 0.08],
  [43.0, 0.22],
  [44.23, 0.26],
  [53.4, 0.3],
  [60.0, 0.36],
  [66.19, 0.36],
  [66.2, 0.37],
  [87.54, 0.45],
  [87.55, 0.1],
  [110.16, 0.14],
  [110.167, 0.3],
  [131.5, 0.55],
  [142.7, 0.33],
  [163.0, 0.62],
  [165.556, 0.62],
  [165.557, 0.4],
  [186.19, 0.66],
  [186.2, 0.8],
  [207.52, 0.86],
  [207.526, 0.88],
  [210.76, 0.9],
  [210.77, 1.0],
  [228.55, 1.0],
  [234.0, 0.0],
  [242, 0],
];

export const heatAt = (t: number) => {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, h1] = KEYS[i];
    if (t <= t1) {
      const [t0, h0] = KEYS[i - 1];
      return t1 === t0 ? h1 : h0 + ((h1 - h0) * (t - t0)) / (t1 - t0);
    }
  }
  return KEYS[KEYS.length - 1][1];
};

// Narrator heat: she stays cold in G while the world burns.
export const charHeatAt = (t: number) => (t >= 165.557 && t < 186.2 ? 0.04 : heatAt(t));

export type Palette = { g: Grade; ui: string; plate: string; heat: number };
export const paletteAt = (heat: number): Palette => {
  const g = gradeAt(clamp(heat));
  return { g, ui: uiColor(g), plate: plateColor(g), heat };
};

export const WHITE = "#F4F1EC";
export const RED = "#FF2A3D";
export const ORANGE = "#F26B1D";
export const BLUE = "#6EC3FF";
export const INK = "#050506";

export const MINCHO = "'Noto Serif JP', 'BIZ UDMincho', 'Yu Mincho', serif";
export const MONO = PIX;
export { PIX, PIX8 };
export const GOTHIC = "'BIZ UDGothic', 'Noto Sans JP', sans-serif";

// 12-column grid, 96px margins, 24px gutters.
export const COL = (1920 - 96 * 2 - 24 * 11) / 12;
export const colX = (i: number) => 96 + i * (COL + 24);
export const colW = (n: number) => n * COL + (n - 1) * 24;

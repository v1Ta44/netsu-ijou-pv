import { continueRender, delayRender, staticFile } from "remotion";

// Pixel fonts for the system layer. Sizes must be integer multiples of the bitmap size
// (12px font → 24 / 36 / 48 …, 8px font → 16 / 24 …) or the pixels blur.
const FACES: [string, string][] = [
  ["FusionPixel12", "fonts/FusionPixel12.woff2"],
  ["FusionPixel8", "fonts/FusionPixel8.woff2"],
];

if (typeof document !== "undefined") {
  const handle = delayRender("pixel fonts", { timeoutInMilliseconds: 120000, retries: 2 });
  Promise.all(
    FACES.map(([name, file]) => {
      const f = new FontFace(name, `url(${staticFile(file)})`);
      document.fonts.add(f);
      return f.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}

export const PIX = "'FusionPixel12', 'BIZ UDGothic', monospace";
export const PIX8 = "'FusionPixel8', 'FusionPixel12', monospace";

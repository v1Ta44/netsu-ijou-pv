import React from "react";
import { Img, staticFile } from "remotion";
import { heatAt } from "../lib/heat";
import { SIZES } from "../lib/sizes";
import { FPS, LINES, rnd } from "../lib/time";
import { src } from "../lib/world";
import { Ctx, Render } from "./engine";
import { crop, isChar, PixText, plate, tone, ui } from "./shots";

// Filler frames: no meaning, only load. Three families:
//   TERM — terminal / system garbage in the pixel font
//   FRAG — fragments of existing components, abused
//   ABS  — abstract fields

const abs: React.CSSProperties = { position: "absolute", inset: 0 };
const R = (c: Ctx, k: string) => rnd(`${c.seed}${k}`);
const RI = (c: Ctx, k: string, n: number) => Math.floor(R(c, k) * n);
const hex = (n: number, w: number) => n.toString(16).toUpperCase().padStart(w, "0");
const frameNo = (t: number) => Math.floor(t * FPS);

// ---------- TERM ----------
const hexdump = (c: Ctx, rows: number) => {
  const base = RI(c, "hb", 0xfffff) & 0xffff0;
  return Array.from({ length: rows }, (_, i) => {
    const bytes = Array.from({ length: 16 }, (_, b) => hex(Math.floor(rnd(`${c.seed}h${frameNo(c.t)}:${i}:${b}`) * 256), 2));
    const asc = bytes.map((h) => {
      const v = parseInt(h, 16);
      return v > 32 && v < 127 ? String.fromCharCode(v) : ".";
    });
    return `${hex(base + i * 16, 8)}  ${bytes.slice(0, 8).join(" ")}  ${bytes.slice(8).join(" ")}  |${asc.join("")}|`;
  });
};

const PANIC = [
  "KERNEL PANIC - not syncing: thermal runaway",
  "CPU: 0 PID: 0126 Comm: rei_rec Tainted: G  D",
  "Call Trace:",
  " <IRQ> heat_irq+0x3f/0x90",
  "  count_vars+0x1a2/0x210 [narrator]",
  "  record_line+0x88/0x140 [narrator]",
  "  ? dead_var_loop+0x0/0x60",
  " </IRQ>",
  "RIP: 0010:sense_core+0x22/0x40",
  "Code: 0f 0b 48 8b 05 ?? ?? ?? ?? <0f> 0b",
  "---[ end trace 00000000deadbeef ]---",
];
const PS = ["PID   STAT  %CPU  TEMP   COMMAND", "0001  R     99.9  ---    rec", "0002  D      0.0  ---    send --to ???", "0003  Z      0.0  ---    <defunct> hope", "0004  S     12.4  ---    count_vars", "0005  R     88.1  ---    listen", "0006  T      0.0  ---    dream", "0007  D     ----  ---    heart"];
const SENSOR = ["SENSOR  STATUS", "CAM.0   OK", "CAM.1   ---", "MIC.0   CLIP", "THERM   OVER", "GYRO    DRIFT", "RAD     ####", "MEM     ECC FAIL"];

const termScreen = (c: Ctx, heat: number) => {
  const fg = ui(heat);
  const bg = plate(heat);
  const invert = R(c, "inv") < 0.12;
  const [F, B] = invert ? [bg, fg] : [fg, bg];
  const kind = RI(c, "tk", 9);
  const ln = LINES[c.li]?.text ?? "";
  let body: React.ReactNode;
  switch (kind) {
    case 0:
      body = <PixText x={60} y={60} size={24} color={F} lines={hexdump(c, 30)} lh={1.4} />;
      break;
    case 1:
      body = <PixText x={60} y={80} size={36} color={F} lines={PANIC.slice(0, 4 + RI(c, "pl", 8))} lh={1.3} />;
      break;
    case 2:
      body = (
        <>
          <PixText x={60} y={70} size={36} color={F} lines={PS} lh={1.5} />
          <PixText x={1860} y={940} size={24} color={F} anchor="end" lines={[`load avg: ${(R(c, "la") * 99).toFixed(2)}`]} />
        </>
      );
      break;
    case 3: {
      const word = ["NO SIGNAL", "SIGNAL LOST", "ERR", "NULL", "0x00", "DEAD", "LOST", "?", "■■■"][RI(c, "nw", 9)];
      body = <PixText x={960} y={540 - 72} size={144} color={F} anchor="middle" lines={[word]} />;
      break;
    }
    case 4: {
      // progress bars that never finish
      const rows = 6 + RI(c, "pr", 6);
      body = (
        <>
          {Array.from({ length: rows }, (_, i) => {
            const p = R(c, `pp${i}`);
            const n = 40;
            const full = Math.floor(p * n);
            return (
              <PixText key={i} x={80} y={90 + i * 72} size={36} color={F} lines={[`${["SEND", "SAVE", "SYNC", "HEAL", "COOL", "FORGET"][i % 6]} [${"█".repeat(full)}${"░".repeat(n - full)}] ${(p * 100).toFixed(0)}%`]} />
            );
          })}
        </>
      );
      break;
    }
    case 5:
      body = <PixText x={80} y={80} size={48} color={F} lines={SENSOR} lh={1.35} />;
      break;
    case 6: {
      // the current lyric as a corrupted log line, repeated
      const rows = 18;
      body = (
        <PixText
          x={60}
          y={40}
          size={48}
          color={F}
          lh={1.12}
          lines={Array.from({ length: rows }, (_, i) =>
            [...`${hex(i * 37 + RI(c, "lo", 999), 4)} ${ln}`].map((ch, ci) => (rnd(`${c.seed}g${i}:${ci}`) < 0.18 ? "▓▒░#%&$@"[ci % 8] : ch)).join(""),
          )}
        />
      );
      break;
    }
    case 7: {
      // coordinate stream
      const rows = 26;
      body = (
        <PixText
          x={60}
          y={40}
          size={24}
          color={F}
          lh={1.5}
          lines={Array.from({ length: rows }, (_, i) => {
            const a = (k: string) => (rnd(`${c.seed}${k}${i}`) * 360 - 180).toFixed(4);
            return `TRK ${hex(i, 3)}  LAT ${a("a")}  LON ${a("b")}  ALT ${(rnd(`${c.seed}c${i}`) * 9000).toFixed(1)}m  ${rnd(`${c.seed}d${i}`) < 0.2 ? "LOST" : "OK"}`;
          })}
        />
      );
      break;
    }
    default:
      body = <PixText x={60} y={60} size={24} color={F} lines={hexdump(c, 30)} lh={1.4} />;
  }
  return (
    <div style={{ ...abs, background: B, overflow: "hidden" }}>
      {body}
    </div>
  );
};

export const TERM: Render = (c) => termScreen(c, heatAt(c.t));

// SMPTE-ish color bars, desaturated toward the grade.
export const BARS: Render = (c) => {
  const heat = heatAt(c.t);
  const cols = ["#C0C0C0", "#C0C000", "#00C0C0", "#00C000", "#C000C0", "#C00000", "#0000C0"];
  return (
    <div style={{ ...abs, background: "#000" }}>
      {cols.map((col, i) => (
        <div key={i} style={{ position: "absolute", left: (i * 1920) / 7, width: 1920 / 7 + 1, top: 0, height: 720, background: col }} />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <div key={`b${i}`} style={{ position: "absolute", left: (i * 1920) / 7, width: 1920 / 7 + 1, top: 720, height: 100, background: i % 2 ? "#111" : cols[6 - i] }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, bottom: 0, background: "linear-gradient(90deg,#000,#fff)" }} />
      <div style={{ ...abs, background: tone(heat, 3), mixBlendMode: "color", opacity: 0.6 }} />
      <PixText x={960} y={360 - 36} size={72} color="#000" anchor="middle" lines={[R(c, "bt") < 0.5 ? "NO SIGNAL" : "CH 00"]} bg="#fff" />
    </div>
  );
};

// ---------- FRAG ----------
const MODS = [
  "invert(1)",
  "grayscale(1) contrast(9)",
  "grayscale(1) contrast(9) invert(1)",
  "contrast(3) saturate(4)",
  "hue-rotate(160deg) saturate(3)",
  "brightness(2.2) contrast(2)",
  "",
];
// `wild` allows the off-palette hue mods; keep those for 1–2 frame inserts.
export const fragOf = (pool: string[], wild = true): Render => (c) => {
  const id = pool[RI(c, "fid", pool.length)];
  const mods = wild ? MODS : MODS.filter((m) => !m.includes("hue") && !m.includes("saturate"));
  const mod = mods[RI(c, "fm", mods.length)];
  // fragments never become a full-screen highlight
  const r = crop(id, { z: [2.5, 7], u: [0.2, 0.8], v: [0.2, 0.8] });
  return <div style={{ ...abs, filter: `${mod} brightness(0.82)` }}>{r(c)}</div>;
};

// Raw, ungraded component flash (a "wrong channel" frame).
export const rawOf = (pool: string[]): Render => (c) => {
  const id = pool[RI(c, "rid", pool.length)];
  const [iw, ih] = SIZES[id];
  const z = 1 + R(c, "rz") * 2;
  const s = Math.max(1920 / iw, 1080 / ih) * z;
  return (
    <div style={{ ...abs, background: isChar(id) ? "#0F0F0F" : "#000" }}>
      <Img
        src={src(id)}
        style={{ position: "absolute", left: 960 - R(c, "ru") * iw * s, top: 540 - R(c, "rv") * ih * s, width: iw * s, height: ih * s, filter: "grayscale(1) contrast(1.6)" }}
      />
    </div>
  );
};

// ---------- ABS ----------
export const NOISE: Render = (c) => {
  const f = frameNo(c.t);
  const scale = [1, 2, 4, 8][RI(c, "ns", 4)];
  return (
    <div
      style={{
        ...abs,
        backgroundColor: "#000",
        backgroundImage: `url(${staticFile(`fx/grain${f % 6}.png`)})`,
        backgroundSize: `${512 * scale}px ${512 * scale}px`,
        backgroundPosition: `${RI(c, "nx", 512)}px ${RI(c, "ny", 512)}px`,
        imageRendering: "pixelated",
        filter: `contrast(${3 + scale}) grayscale(1) brightness(0.55)`,
      }}
    />
  );
};
export const FLAT: Render = (c) => {
  const heat = heatAt(c.t);
  const i = [0, 1, 2, 3, 2, 0][RI(c, "fc", 6)];
  return <div style={{ ...abs, background: i === 0 ? "#000" : tone(heat, i) }} />;
};
export const STRIPES: Render = (c) => {
  const heat = heatAt(c.t);
  const n = 3 + RI(c, "sn", 24);
  const horiz = R(c, "sh") < 0.5;
  return (
    <div style={{ ...abs, background: "#000" }}>
      {Array.from({ length: n }, (_, i) => {
        const col = tone(heat, RI(c, `sc${i}`, 5));
        const a = (i / n) * (horiz ? 1080 : 1920);
        const w = (horiz ? 1080 : 1920) / n + 1;
        return <div key={i} style={horiz ? { position: "absolute", left: 0, right: 0, top: a, height: w, background: col } : { position: "absolute", top: 0, bottom: 0, left: a, width: w, background: col }} />;
      })}
    </div>
  );
};
export const SCAN: Render = (c) => {
  const heat = heatAt(c.t);
  const p = 2 + RI(c, "sp", 10);
  return (
    <div
      style={{
        ...abs,
        background: `repeating-linear-gradient(0deg, ${tone(heat, 3)} 0px, ${tone(heat, 3)} ${p}px, #000 ${p}px, #000 ${p * 2 + RI(c, "sq", 6)}px)`,
      }}
    />
  );
};
export const BLOCKS: Render = (c) => {
  const heat = heatAt(c.t);
  const cols = 8 + RI(c, "bc", 24);
  const rows = Math.round((cols * 9) / 16);
  const cw = 1920 / cols;
  const ch = 1080 / rows;
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const v = rnd(`${c.seed}bk${x}:${y}`);
      if (v < 0.55) continue;
      cells.push(<rect key={`${x}:${y}`} x={x * cw} y={y * ch} width={cw + 0.5} height={ch + 0.5} fill={tone(heat, 1 + Math.floor(v * 4) % 4)} />);
    }
  return (
    <svg width={1920} height={1080} style={{ ...abs, background: "#000" }}>
      {cells}
    </svg>
  );
};
export const BLACK: Render = () => <div style={{ ...abs, background: "#000" }} />;

// Weighted filler pool for a section.
export const makeFillers = (pool: string[], w: Partial<Record<"term" | "bars" | "frag" | "raw" | "noise" | "flat" | "stripes" | "scan" | "blocks" | "black", number>> = {}, wild = true): Render[] => {
  const W = { term: 4, bars: 1, frag: 6, raw: 3, noise: 2, flat: 2, stripes: 1, scan: 1, blocks: 1, black: 1, ...w };
  const frag = fragOf(pool, wild);
  const raw = rawOf(pool);
  const table: [Render, number][] = [
    [TERM, W.term],
    [BARS, W.bars],
    [frag, W.frag],
    [raw, W.raw],
    [NOISE, W.noise],
    [FLAT, W.flat],
    [STRIPES, W.stripes],
    [SCAN, W.scan],
    [BLOCKS, W.blocks],
    [BLACK, W.black],
  ];
  return table.flatMap(([r, n]) => Array.from({ length: n }, () => r));
};

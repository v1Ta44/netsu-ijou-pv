import React, { useId } from "react";
import { staticFile } from "remotion";
import { noise, rnd, FPS } from "../lib/time";

const sid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
const abs: React.CSSProperties = { position: "absolute", inset: 0 };

// Free (unquantized) shake for the world layer.
export const Shake: React.FC<{ t: number; amp: number; freq?: number; seed?: string; rot?: number; children: React.ReactNode }> = ({
  t,
  amp,
  freq = 9,
  seed = "sh",
  rot = 0,
  children,
}) => {
  const x = noise(t * freq, `${seed}x`) * amp;
  const y = noise(t * freq, `${seed}y`) * amp;
  const r = noise(t * freq * 0.7, `${seed}r`) * rot;
  return <div style={{ ...abs, transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }}>{children}</div>;
};

// Horizontal slice displacement. `amount` 0..1, re-rolled every `rate` seconds.
export const Slices: React.FC<{ t: number; amount: number; n?: number; seed?: string; rate?: number; maxShift?: number; children: React.ReactNode }> = ({
  t,
  amount,
  n = 9,
  seed = "sl",
  rate = 1 / 15,
  maxShift = 220,
  children,
}) => {
  if (amount <= 0.001) return <>{children}</>;
  const k = Math.floor(t / rate);
  // random cut positions
  const cuts = Array.from({ length: n - 1 }, (_, i) => rnd(`${seed}c${k}:${i}`) * 1080).sort((a, b) => a - b);
  const edges = [0, ...cuts, 1080];
  return (
    <div style={abs}>
      {edges.slice(0, -1).map((y0, i) => {
        const y1 = edges[i + 1];
        const on = rnd(`${seed}o${k}:${i}`) < 0.35 + amount * 0.5;
        const dx = on ? (rnd(`${seed}d${k}:${i}`) * 2 - 1) * maxShift * amount : 0;
        return (
          <div key={i} style={{ ...abs, clipPath: `inset(${y0}px 0 ${1080 - y1}px 0)`, transform: `translateX(${dx}px)` }}>
            {children}
          </div>
        );
      })}
    </div>
  );
};

// RGB channel split via one SVG filter.
export const RGBSplit: React.FC<{ d: number; dy?: number; children: React.ReactNode }> = ({ d, dy = 0, children }) => {
  const id = `rgb${sid()}`;
  if (Math.abs(d) < 0.5 && Math.abs(dy) < 0.5) return <>{children}</>;
  return (
    <div style={{ ...abs, filter: `url(#${id})` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx={-d} dy={-dy} result="o1" />
          <feColorMatrix in="o1" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
          <feOffset in="SourceGraphic" dx={d} dy={dy} result="o3" />
          <feColorMatrix in="o3" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      {children}
    </div>
  );
};

export const Invert: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) =>
  on ? <div style={{ ...abs, filter: "invert(1)" }}>{children}</div> : <>{children}</>;

// Heat haze: turbulence displacement that scrolls upward.
export const Haze: React.FC<{ t: number; amount: number; children: React.ReactNode }> = ({ t, amount, children }) => {
  const id = `hz${sid()}`;
  if (amount <= 0.01) return <>{children}</>;
  return (
    <div style={{ ...abs, filter: `url(#${id})` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.03" numOctaves={2} seed={3} result="n0" />
          <feOffset in="n0" dx={0} dy={-((t * 120) % 1080)} result="n1" />
          <feOffset in="n0" dx={0} dy={1080 - ((t * 120) % 1080)} result="n2" />
          <feMerge result="n">
            <feMergeNode in="n1" />
            <feMergeNode in="n2" />
          </feMerge>
          <feDisplacementMap in="SourceGraphic" in2="n" scale={amount * 60} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {children}
    </div>
  );
};

// Global finishing: grain + scanlines + vignette.
export const Finish: React.FC<{ t: number; grain?: number; scan?: number; vignette?: number }> = ({
  t,
  grain = 0.1,
  scan = 0.08,
  vignette = 0.55,
}) => {
  const f = Math.floor(t * FPS);
  const tile = f % 6;
  const ox = Math.floor(rnd(`gx${f}`) * 512);
  const oy = Math.floor(rnd(`gy${f}`) * 512);
  return (
    <>
      <div
        style={{
          ...abs,
          backgroundImage: `url(${staticFile(`fx/grain${tile}.png`)})`,
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: "overlay",
          opacity: grain,
        }}
      />
      <div
        style={{
          ...abs,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 3px)",
          opacity: scan,
        }}
      />
      <div
        style={{
          ...abs,
          background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
    </>
  );
};

export const Flash: React.FC<{ a: number; color?: string; blend?: React.CSSProperties["mixBlendMode"] }> = ({ a, color = "#fff", blend }) =>
  a > 0.001 ? <div style={{ ...abs, background: color, opacity: Math.min(1, a), mixBlendMode: blend }} /> : null;

export const Black: React.FC<{ a?: number }> = ({ a = 1 }) => <div style={{ ...abs, background: "#000", opacity: a }} />;

export const Layer: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode }> = ({ style, children }) => (
  <div style={{ ...abs, ...style }}>{children}</div>
);


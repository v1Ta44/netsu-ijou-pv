import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import analysis from "../public/analysis.json";
import lyrics from "../public/lyrics.json";

// Alignment preview: current lyric, beat/bar counters, scrolling timeline of
// beats, section boundaries, beat energy and lyric blocks. Used to check sync.

type Line = { i: number; start: number; end: number; beat: number; text: string; zh: string };
const lines = lyrics.lines as Line[];
const beats = analysis.beats as number[];
const downbeats = analysis.downbeats as number[];
const sections = analysis.sectionBoundaries as number[];
const energy = analysis.beatEnergy as number[];
const maxEnergy = Math.max(...energy);

const WINDOW = 8; // seconds visible on the timeline
const PX_PER_SEC = 1920 / WINDOW;
const NOW_X = 1920 * 0.3;

const lastIndexLE = (arr: number[], t: number) => {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
};

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
};

export const AlignPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const beatIdx = lastIndexLE(beats, t);
  const barIdx = lastIndexLE(downbeats, t);
  const sectionIdx = lastIndexLE(sections, t);
  const lineIdx = lines.findIndex((l) => l.start <= t && t < l.end);
  const line = lineIdx >= 0 ? lines[lineIdx] : null;
  const next = lines.find((l) => l.start > t);

  const beatFlash = beatIdx >= 0 ? Math.max(0, 1 - (t - beats[beatIdx]) / 0.12) : 0;
  const lineAge = line ? t - line.start : 99;
  const lineFlash = Math.max(0, 1 - lineAge / 0.2);

  const x = (time: number) => NOW_X + (time - t) * PX_PER_SEC;
  const visible = (time: number) => time > t - NOW_X / PX_PER_SEC - 0.5 && time < t + WINDOW;

  return (
    <AbsoluteFill style={{ background: "#05070A", color: "#E8EEF2", fontFamily: "Consolas, monospace" }}>
      <Audio src={staticFile("netsu_ijou.mp4")} />

      {/* header: time / beat / bar / section */}
      <div style={{ position: "absolute", top: 36, left: 48, fontSize: 30, color: "#3CFF9E", lineHeight: 1.5 }}>
        <div>T {fmt(t)} · frame {frame}</div>
        <div>BEAT {beatIdx + 1}/{beats.length} · BAR {barIdx + 1} · SECTION {sectionIdx + 1} @ {sections[sectionIdx]?.toFixed(1)}s</div>
        <div>LINE {line ? `${line.i + 1}/${lines.length} · start ${line.start.toFixed(2)}s · beat#${line.beat + 1}` : "—"}</div>
      </div>

      {/* beat indicator */}
      <div style={{
        position: "absolute", top: 48, right: 64, width: 80, height: 80, borderRadius: 40,
        background: "#3CFF9E", opacity: 0.15 + beatFlash * 0.85,
      }} />

      {/* current lyric */}
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 88, fontFamily: "'Noto Sans JP', 'Yu Gothic', sans-serif", color: lineFlash > 0 ? "#FFB020" : "#FFFFFF" }}>
          {line?.text ?? ""}
        </div>
        <div style={{ fontSize: 40, marginTop: 20, color: "#8A9BA8", fontFamily: "'Microsoft YaHei', sans-serif" }}>
          {line?.zh ?? ""}
        </div>
        <div style={{ fontSize: 28, marginTop: 40, color: "#55626C" }}>
          next {next ? `${next.text}  (+${(next.start - t).toFixed(2)}s)` : "—"}
        </div>
      </div>

      {/* timeline */}
      <div style={{ position: "absolute", left: 0, top: 700, width: 1920, height: 340, overflow: "hidden" }}>
        {/* beat energy bars */}
        {beats.map((b, i) => visible(b) && (
          <div key={`e${i}`} style={{
            position: "absolute", left: x(b), bottom: 200, width: PX_PER_SEC * 0.3,
            height: (energy[i] / maxEnergy) * 120, background: "#1E3A2E",
          }} />
        ))}
        {/* beat ticks */}
        {beats.map((b, i) => visible(b) && (
          <div key={`b${i}`} style={{ position: "absolute", left: x(b), top: 0, width: 1, height: 140, background: "#2A3640" }} />
        ))}
        {/* bar lines */}
        {downbeats.map((b, i) => visible(b) && (
          <div key={`d${i}`} style={{ position: "absolute", left: x(b), top: 0, width: 2, height: 160, background: "#3CFF9E", opacity: 0.6 }}>
            <div style={{ position: "absolute", top: 162, left: 4, fontSize: 16, color: "#3CFF9E" }}>{i + 1}</div>
          </div>
        ))}
        {/* section boundaries */}
        {sections.map((s, i) => visible(s) && (
          <div key={`s${i}`} style={{ position: "absolute", left: x(s), top: 0, width: 4, height: 340, background: "#FF4A1C" }}>
            <div style={{ position: "absolute", top: 4, left: 8, fontSize: 20, color: "#FF4A1C" }}>S{i + 1}</div>
          </div>
        ))}
        {/* lyric blocks */}
        {lines.map((l) => (visible(l.start) || visible(l.end)) && (
          <div key={`l${l.i}`} style={{
            position: "absolute", left: x(l.start), top: 200, height: 70,
            width: Math.max(2, (l.end - l.start) * PX_PER_SEC - 3),
            background: l === line ? "#FFB020" : "#24303A", color: l === line ? "#05070A" : "#C8D2DA",
            fontSize: 22, padding: "6px 8px", boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap",
            borderLeft: "3px solid #FFB020", fontFamily: "'Noto Sans JP', 'Yu Gothic', sans-serif",
          }}>{l.text}</div>
        ))}
        {/* playhead */}
        <div style={{ position: "absolute", left: NOW_X, top: 0, width: 3, height: 340, background: "#FFFFFF" }} />
      </div>
    </AbsoluteFill>
  );
};

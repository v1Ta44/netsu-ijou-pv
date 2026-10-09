"""Audio analysis for the 熱異常 PV.

Outputs data/analysis.json with tempo, beats, downbeats (assumed 4/4),
per-beat RMS energy, onsets and coarse section boundaries.
"""
import json
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "netsu_ijou.wav"
OUT = ROOT / "data" / "analysis.json"
SR = 44100
HOP = 512


def main():
    y, sr = librosa.load(AUDIO, sr=SR, mono=True)
    duration = len(y) / sr

    y_harm, y_perc = librosa.effects.hpss(y)
    tempo, beat_frames = librosa.beat.beat_track(y=y_perc, sr=sr, hop_length=HOP)
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)

    onset_env = librosa.onset.onset_strength(y=y_perc, sr=sr, hop_length=HOP)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=HOP, units="time")

    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=HOP)
    # energy per beat interval, normalized 0-1
    edges = np.append(beats, duration)
    beat_energy = [float(rms[(rms_t >= a) & (rms_t < b)].mean()) for a, b in zip(edges[:-1], edges[1:])]
    e = np.array(beat_energy)
    beat_energy = ((e - e.min()) / (e.max() - e.min() + 1e-9)).round(3).tolist()

    # downbeat phase: pick offset whose beats carry the most low-frequency onset strength
    low = librosa.onset.onset_strength(y=y_perc, sr=sr, hop_length=HOP, fmax=200)
    phase_score = [low[beat_frames[p::4]].mean() for p in range(4)]
    phase = int(np.argmax(phase_score))
    downbeats = beats[phase::4]

    # coarse sections: agglomerative clustering on beat-synced chroma + mfcc
    chroma = librosa.feature.chroma_cqt(y=y_harm, sr=sr, hop_length=HOP)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=HOP, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(chroma), librosa.util.normalize(mfcc)])
    feat_sync = librosa.util.sync(feat, beat_frames)
    bounds = librosa.segment.agglomerative(feat_sync, k=16)
    bound_times = sorted(set([0.0] + [float(beats[min(b, len(beats) - 1)]) for b in bounds if b > 0]))

    data = {
        "audio": "assets/audio/netsu_ijou.wav",
        "duration": round(duration, 3),
        "tempo": round(float(np.atleast_1d(tempo)[0]), 2),
        "beats": np.round(beats, 3).tolist(),
        "downbeatPhase": phase,
        "downbeats": np.round(downbeats, 3).tolist(),
        "beatEnergy": beat_energy,
        "onsets": np.round(onsets, 3).tolist(),
        "sectionBoundaries": [round(t, 3) for t in bound_times],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"duration {data['duration']}s tempo {data['tempo']} beats {len(beats)} "
          f"downbeat phase {phase} onsets {len(onsets)}")
    print("sections:", [f"{t:.1f}" for t in data["sectionBoundaries"]])


if __name__ == "__main__":
    main()

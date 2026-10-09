"""Per-frame audio features for the PV (30 fps) + smoothed beat grid.

Outputs pv/public/features.json:
  beats      tracked beats, de-jittered with a local linear fit (±8 beats)
  rms/low/high/vocal/onset   per video frame, normalized 0..1 (p99)
  hits       strong low-band onsets (kick/impact) in seconds, with strength
"""
import json
from pathlib import Path

import librosa
import numpy as np
from scipy.signal import find_peaks

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "netsu_ijou.wav"
ANALYSIS = ROOT / "data" / "analysis.json"
OUT = ROOT / "pv" / "public" / "features.json"
FPS = 30
SR = 44100
HOP = SR // FPS // 2  # two analysis frames per video frame


def norm(x):
    p = np.percentile(x, 99)
    return np.clip(x / (p + 1e-9), 0, 1)


def per_frame(x, n):
    # average analysis frames into video frames
    x = x[: n * 2].reshape(-1, 2).mean(axis=1) if len(x) >= n * 2 else np.pad(x, (0, n * 2 - len(x)))[: n * 2].reshape(-1, 2).mean(axis=1)
    return x


def main():
    y, sr = librosa.load(AUDIO, sr=SR, mono=True)
    dur = len(y) / sr
    n = int(np.ceil(dur * FPS))
    harm, perc = librosa.effects.hpss(y)

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    Sp = np.abs(librosa.stft(perc, n_fft=2048, hop_length=HOP))
    Sh = np.abs(librosa.stft(harm, n_fft=2048, hop_length=HOP))
    f = librosa.fft_frequencies(sr=sr, n_fft=2048)

    rms = per_frame(np.sqrt((S ** 2).mean(axis=0)), n)
    low = per_frame(Sp[f < 150].mean(axis=0), n)
    high = per_frame(Sp[f > 4000].mean(axis=0), n)
    vocal = per_frame(Sh[(f > 300) & (f < 3000)].mean(axis=0), n)
    onset = per_frame(librosa.onset.onset_strength(S=librosa.amplitude_to_db(Sp, ref=np.max), sr=sr), n)

    low_on = librosa.onset.onset_strength(S=librosa.amplitude_to_db(Sp[f < 200], ref=np.max), sr=sr)
    low_on = low_on / (np.percentile(low_on, 99.5) + 1e-9)
    t_on = librosa.frames_to_time(np.arange(len(low_on)), sr=sr, hop_length=HOP)
    pk, props = find_peaks(low_on, height=0.45, distance=int(0.12 * sr / HOP))
    hits = [[round(float(t_on[i]), 3), round(float(min(1, low_on[i])), 3)] for i in pk]

    beats = np.array(json.loads(ANALYSIS.read_text(encoding="utf-8"))["beats"])
    k = np.arange(len(beats))
    smooth = beats.copy()
    for i in range(len(beats)):
        a, b = max(0, i - 8), min(len(beats), i + 9)
        p = np.polyfit(k[a:b], beats[a:b], 1)
        smooth[i] = np.polyval(p, i)

    r = lambda x: np.round(x, 3).tolist()
    data = {
        "fps": FPS,
        "duration": round(dur, 3),
        "beats": r(smooth),
        "rms": r(norm(rms)),
        "low": r(norm(low)),
        "high": r(norm(high)),
        "vocal": r(norm(vocal)),
        "onset": r(norm(onset)),
        "hits": hits,
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"frames {n} hits {len(hits)} beats {len(smooth)} jitter removed std {np.std(beats - smooth):.3f}")


if __name__ == "__main__":
    main()

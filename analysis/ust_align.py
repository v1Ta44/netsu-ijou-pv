"""Per-character lyric timing from the UTAU score (assets/ref/Main.ust).

The UST is a constant-tempo per-syllable score, so it gives the sung onset of every
mora. Each lyric character is expanded to its kana reading (kanji via READ below),
the reading is aligned to the sung kana with a small edit-distance DP, and each
character gets the onset of its first sung mora.
Output pv/public/ust_timing.json: lines[i] = { start, end, chars: [onset per char] }
Run: python analysis/ust_align.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UST = ROOT / "assets" / "ref" / "Main.ust"
LYRICS = ROOT / "pv" / "public" / "lyrics.json"
OUT = ROOT / "pv" / "public" / "ust_timing.json"
OFFSET = 0.01  # UST t=0 → audio seconds (fitted against the onset envelope at 183 BPM)

# kanji run → per-character readings ("|" splits characters)
READ = dict(
    x.split("=")
    for x in """死=し 変数=へん|すう 繰=く 返=かえ 数=かぞ 事=ごと 孕=はら 熱=ねつ 送=おく 独=ひと 言=ごと 記=しる
電撃=でん|げき 見紛=み|まご 恐怖=きょう|ふ 血管=けっ|かん 中=なか 混=ま 微粒子=び|りゅう|し 濃=こ 煙=けむり 向=む
黒=くろ 鎖鎌=くさり|がま 消去=しょう|きょ 無=な 潰=つぶ 喉=のど 叫=さけ 音=おと 既=すで 列=れつ 成=な
安楽椅子=あん|らく|い|す 上=うえ 腐=くさ 三日月=み|か|づき 笑=わら 来=き 大声=おお|ごえ 泣=な 後=あと 救=すく
旗=はた 火=ひ 放=はな 人々=ひと|びと 甘=あま 棺桶=かん|おけ 籠=こも 骸骨=がい|こつ 囁=ささや
未来永劫誰=み|らい|えい|ごう|だれ 理想郷=り|そう|きょう 口=くち 揃=そろ 大人=おと|な 乗=の 舟=ふね 爆=は 星=ほし
彼=かれ 見=み 哭=な 閃光=せん|こう 目=め 刺=さ 別=わ 鐘=かね 鳴=な 神=かみ 歴史=れき|し 結=むす 答=こた 砂=すな
味=あじ 誰=だれ 澄=す 瞳=ひとみ 色=いろ 問=と 拾=ひろ 悲=かな 流=なが 落=お 塩=しお 祈=いの 苦=くる 同情=どう|じょう
憐=あわ 値=ね 今=いま 背=せ 鮮明=せん|めい 聞=き 悲鳴=ひ|めい 幸福=こう|ふく 手放=て|ばな 美学=び|がく 諭=さと 魚=さかな
自意識=じ|い|しき 海=うみ 泳=およ 垂=た 血=ち 匂=にお 立=た 私=わたし 細胞=さい|ぼう 戻=もど 世迷言=よ|まい|ごと
燕=つばめ 描=えが 軌跡=き|せき 灰色=はい|いろ 雲=くも 編=あ 名誉=めい|よ 明日=あ|す 乞=こ 希望=き|ぼう 手=て 汚=よご
取=と 合=あ 愛=あい 叶=かな 夢=ゆめ 殺=ころ 思考=し|こう 果=は 中枢=ちゅう|すう 熱異常=ねつ|い|じょう 起=お 現実=げん|じつ
耐=た""".split()
)
EQ = {"は": "わ", "へ": "え", "を": "お", "づ": "ず", "ぢ": "じ"}
SOFT = set("うおいー")  # written long vowels often not a separate sung note
EXTRA = set("っうんあいえおー")  # sung kana that may have no written counterpart


def read_ust(path):
    raw = path.read_bytes().decode("cp932")
    notes, cur, tempo = [], None, None
    for line in raw.splitlines():
        if re.match(r"\[#\d+\]", line):
            cur = {}
            notes.append(cur)
        elif cur is not None and "=" in line:
            k, v = line.split("=", 1)
            cur[k] = v
    t, kana = 0.0, []
    for n in notes:
        tempo = float(n.get("Tempo", tempo))
        d = int(n["Length"]) / 480 * 60 / tempo
        lyr = n["Lyric"].strip()
        if lyr not in ("R", "r", ""):
            for ch in lyr:
                kana.append((hira(ch), t + OFFSET, t + d + OFFSET))
        t += d
    return kana


def hira(ch):
    o = ord(ch)
    return chr(o - 0x60) if 0x30A1 <= o <= 0x30F6 else ch


def is_kana(ch):
    return 0x3041 <= ord(hira(ch)) <= 0x3096 or ch == "ー"


def expand(text):
    """→ list of (kana, char index); unsung chars produce nothing."""
    units, i = [], 0
    while i < len(text):
        m = re.match(r"[一-鿿々]+", text[i:])
        if m:
            run = m.group()
            parts = READ[run].split("|")
            assert len(parts) == len(run), run
            for k, p in enumerate(parts):
                units += [(c, i + k) for c in p]
            i += len(run)
        else:
            if is_kana(text[i]):
                units.append((hira(text[i]), i))
            i += 1
    return units


def same(a, b):
    return a == b or EQ.get(a, a) == EQ.get(b, b)


def align(units, kana):
    """DP: units (written reading) vs kana window (sung). Returns sung index per unit (or None) and kana consumed."""
    U, K = len(units), len(kana)
    INF = 1e9
    cost = [[INF] * (K + 1) for _ in range(U + 1)]
    back = [[None] * (K + 1) for _ in range(U + 1)]
    for j in range(K + 1):
        cost[0][j] = 0.25 * j  # leftover kana of the previous line
        back[0][j] = (0, j - 1, "lead") if j else None
    for i in range(U + 1):
        for j in range(K + 1):
            c = cost[i][j]
            if c >= INF:
                continue
            steps = []
            if i < U and j < K:
                steps.append((i + 1, j + 1, 0.0 if same(units[i][0], kana[j][0]) else 1.5, "m"))
            if i < U:
                steps.append((i + 1, j, 0.3 if units[i][0] in SOFT else 1.2, "d"))
            if j < K and i > 0:
                steps.append((i, j + 1, 0.4 if kana[j][0] in EXTRA else 1.0, "x"))
            for ni, nj, w, op in steps:
                if c + w < cost[ni][nj]:
                    cost[ni][nj] = c + w
                    back[ni][nj] = (i, j, op)
    jb = min(range(K + 1), key=lambda j: cost[U][j] + 0.0)
    # prefer stopping right after the last matched unit (trailing extras go to the next line)
    i, j = U, jb
    while j > 0 and back[i][j] and back[i][j][2] == "x":
        i, j = back[i][j][0], back[i][j][1]
    end_j = j
    hit = [None] * U
    while i > 0:
        pi, pj, op = back[i][j]
        if op == "m":
            hit[pi] = pj
        i, j = pi, pj
    return hit, end_j, cost[U][jb]


def main():
    kana = read_ust(UST)
    lines = json.loads(LYRICS.read_text(encoding="utf-8"))["lines"]
    res, j = [], 0
    for idx, ln in enumerate(lines):
        text = ln["text"]
        units = expand(text)
        nxt = lines[idx + 1]["start"] if idx + 1 < len(lines) else 1e9
        hi = j
        while hi < len(kana) and kana[hi][1] < nxt + 1.2:
            hi += 1
        win = kana[j:hi]
        hit, ej, c = align(units, win)
        chars = [None] * len(text)
        for (_, ci), h in zip(units, hit):
            if h is not None and chars[ci] is None:
                chars[ci] = win[h][1]
        # unsung / unmatched chars borrow the neighbour's onset
        last = None
        for k in range(len(text)):
            if chars[k] is None:
                chars[k] = last
            last = chars[k]
        nx = None
        for k in range(len(text) - 1, -1, -1):
            if chars[k] is None:
                chars[k] = nx
            nx = chars[k]
        for k in range(1, len(text)):
            chars[k] = max(chars[k], chars[k - 1])
        sung = [h for h in hit if h is not None]
        res.append({
            "i": ln["i"],
            "start": round(chars[0], 3),
            "end": round(win[sung[-1]][2], 3),
            "chars": [round(x, 3) for x in chars],
            "cost": round(c, 2),
        })
        j += ej
    OUT.write_text(json.dumps({"source": "assets/ref/Main.ust", "offset": OFFSET, "lines": res}, ensure_ascii=False), encoding="utf-8")
    for r, ln in zip(res, lines):
        flag = " <<" if r["cost"] > 2 or abs(r["start"] - ln["start"]) > 0.15 else ""
        print(f'{r["i"]:3d} {ln["start"]:8.3f}->{r["start"]:8.3f} end {r["end"]:8.3f} c={r["cost"]:.2f} {ln["text"]}{flag}')


if __name__ == "__main__":
    main()

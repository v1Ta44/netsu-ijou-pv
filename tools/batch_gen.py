"""Batch-generate all PV components (characters, objects, backgrounds).

- All images: img2img with the style reference, model gpt-image-2.5-sunburst.
- Characters additionally get the official design + the locked look as references.
- No tone words in prompts (plan B: tone is applied in Remotion).
- Resumable: items whose raw output already exists are skipped.

Usage: python tools/batch_gen.py [--only ID,ID] [--workers 4]
Outputs:
  assets/gen/batch_v1/raw/<ID>.png   raw generation (extra variants as <ID>-2.png ...)
  assets/components/<ID>.png         post-processed (alpha cleaned / reproportioned / cropped)
"""
import argparse
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = Path.home() / ".claude/skills/image-gen/scripts/generate.py"
RAW = ROOT / "assets/gen/batch_v1/raw"
OUT = ROOT / "assets/components"
PROMPTS = ROOT / "assets/gen/batch_v1/prompts"
MODEL = "gpt-image-2.5-sunburst"

STYLE_REF = "assets/ref/style_ref_rei.png"
CHAR_REFS_FRONT = ["assets/ref/rei_front.png", "assets/gen/char_final/REI_front.png"]
CHAR_REFS_BACK = ["assets/ref/rei_back.png", "assets/gen/char_final/REI_back.png"]
ROBOT_REF = "assets/ref/rei/ref_12.png"  # photo of the real robot's leg (mechanical structure)

STYLE = (
    "Copy the drawing style of the first reference image exactly: hand-drawn anime look, dark slightly wobbly "
    "uneven lines, simple flat coloring in large flat areas with almost no shading, a little rough and unpolished "
    "like an indie animator's drawing. Plain everyday colors at normal brightness. "
    "No film grain, no noise, no chromatic aberration, no text, no letters, no watermark, no UI, no symbols."
)

CHAR_LOCK = (
    "Reference images: the FIRST image is a drawing-style reference ONLY. The other images show this exact character "
    "(official design and her approved look); copy her design and face from them, but not their rendering or pose. "
    + STYLE
    + " Do not copy the first image's composition, framing, voice recorder or gradient background.\n"
    "Character: Adachi Rei, an android girl. Orange shoulder-length choppy hair with ONE side ponytail tied with a long "
    "white ribbon, on HER OWN LEFT side exactly as in the reference images (do not mirror the design); orange hair "
    "clip; black headset headband with a small round lamp on top and a black antenna fin; orange eyes. Oversized "
    "white jacket with thin circuit-line patterns, wide orange cuff bands, small '00' tag on the left chest, hood on "
    "the back; black high-neck top; orange belt with silver buckle and small black pouches; gray plaid pleated skirt; "
    "black tights with circuit patterns and an orange band at the shin; orange-and-white sneakers; white gloves; a few "
    "data cables hanging from under the jacket.\n"
    "Face and feel exactly like the approved look: beautiful, composed, cool and slightly heroic, not cute: almond "
    "eyes with a calm steady gaze, thin straight brows, defined jaw, neutral mouth, no blush. Slender, about 6 heads "
    "tall. Understated, not glamorous, not exaggerated."
)

WORLD_LOCK = (
    "Use the reference image ONLY as a drawing-style reference. "
    + STYLE
    + " Do NOT copy anything else from the reference: no girl, no person, no hair, no voice recorder, no gradient sky.\n"
    "Everything is drawn as a real thing: no faces or eyes on objects, no anthropomorphism, nothing cute or cartoonish."
)

ISO = " Single isolated subject, transparent background, no ground, no shadow, no backdrop."
EMPTY = " Empty scene, no people, no characters."

# id, kind(char|world), size, transparent, extra refs, post(full|crop|none), subject
ITEMS = [
    # ---- characters ----
    ("CH01", "char", "1024x1536", True, [], "full",
     "Full body, side view standing still on flat ground, looking toward the far horizon, arms hanging relaxed."),
    ("CH02", "char", "1024x1536", True, [], "crop",
     "Half body from the waist up, side profile looking straight ahead, calm, shoulders relaxed."),
    ("CH03", "char", "1024x1536", True, CHAR_REFS_BACK, "full",
     "Full body seen directly from behind, standing still, head slightly lowered, arms hanging relaxed, the jacket "
     "hood visible on her back."),
    ("CH04", "char", "1024x1536", True, [], "crop",
     "Upper body from the chest up, clean side profile, head slightly bowed, a clear readable silhouette."),
    ("CH05", "char", "1536x1024", True, [], "crop",
     "Full body, side view, kneeling and sitting back on her heels on the ground, hands resting on her knees, head "
     "slightly bowed, still and quiet. Modest pose."),
    ("CH-E1", "char", "1920x1080", False, [], "none",
     "Extreme close-up of her eyes filling the whole frame: from her bangs to the bridge of her nose, both orange "
     "eyes open with a calm steady stare straight at the viewer. Wide horizontal framing, face fills the frame."),
    ("CH-F1", "char", "1024x1024", True, [], "crop",
     "Close-up of her head and neck in side profile, eyes half closed, lips slightly parted as if singing softly."),
    ("CH-N1", "char", "1920x1080", False, [], "none",
     "Extreme close-up of the side of her neck and jaw filling the frame: the black high collar pulled down a little, "
     "revealing a thin mechanical panel seam line running across the pale skin of her neck. Wide horizontal framing."),
    ("CH-H1", "char", "1536x1024", True, [], "crop",
     "Top-down close-up of her two white-gloved hands holding a small old portable cassette voice recorder, one "
     "finger pressing the record button. The orange cuff bands of her jacket at the wrists. Only hands and recorder."),
    ("CH-H2a", "char", "1536x1024", True, [], "crop",
     "Close-up of her two white-gloved hands cupped together palms up, as if holding water. The orange cuff bands "
     "at the wrists. Only the hands and forearms."),
    ("CH-H2b", "char", "1536x1024", True, [], "crop",
     "Close-up of her two white-gloved hands cupped together palms up. The white gloves are stained with soot and "
     "grime. The orange cuff bands at the wrists. Only the hands and forearms."),
    ("CH-H3", "char", "1536x1024", True, [ROBOT_REF], "crop",
     "Close-up side view of her bare right hand and forearm reaching toward the right edge of the frame, glove "
     "removed, revealing a mechanical hand: smooth pale skin-tone shell segments with black servo joints at the "
     "knuckles and wrist (use the last reference photo only for the mechanical structure, not its rendering). The "
     "jacket sleeve with the orange cuff band at the elbow. Only the hand and forearm."),
    # ---- objects ----
    ("OBJ01", "world", "1024x1024", True, [], "crop",
     "A kusarigama: a black iron sickle with a short wooden handle, attached to a long iron chain ending in a heavy "
     "iron weight, the chain lying in loose curves." + ISO),
    ("OBJ02", "world", "1024x1024", True, [], "crop",
     "An old wooden rocking armchair with worn upholstered seat, three-quarter view, empty." + ISO),
    ("OBJ04", "world", "1024x1536", True, [], "crop",
     "A tattered plain white flag on a wooden pole, the cloth burning, flames drawn as flat shapes, no smoke." + ISO),
    ("OBJ05", "world", "1024x1536", False, [], "none",
     "Top-down view of an open old wooden coffin filling the frame, a skeleton lying inside, clutching a collection of "
     "small treasures to its chest: old coins, a pocket watch, small glass bottles, faded photographs; its skull "
     "tilted down against them."),
    ("OBJ06", "world", "1536x1024", True, [], "crop",
     "A large old wooden ship, side view, simple cabin on deck, built like an ark, empty deck." + ISO),
    ("OBJ07", "world", "1536x1024", True, [], "crop",
     "A crowd of about twelve adults in long coats seen from behind, standing close together and looking up at the "
     "sky, no faces visible." + ISO),
    ("OBJ08", "world", "1024x1536", True, [], "crop",
     "An old stone bell tower leaning to one side, cracked walls, a bronze bell visible in the open belfry." + ISO),
    ("OBJ09", "world", "1536x1024", True, [], "crop",
     "An oarfish, a long ribbon-like deep-sea fish with a red dorsal fin, side view, natural fish anatomy." + ISO),
    ("OBJ10a", "world", "1024x1024", True, [], "crop",
     "A single barn swallow in flight, gliding with wings fully spread, seen from below at an angle." + ISO),
    ("OBJ10b", "world", "1024x1024", True, [], "crop",
     "A single barn swallow in flight with wings raised high mid-flap, side view." + ISO),
    ("OBJ10c", "world", "1024x1024", True, [], "crop",
     "A single barn swallow diving with wings swept back, side view." + ISO),
    ("OBJ11", "world", "1024x1024", True, [], "crop",
     "A military medal hanging from a woven striped ribbon, slightly worn." + ISO),
    ("OBJ12", "world", "1024x1024", True, [], "crop",
     "Head and shoulders of an adult person in side profile facing left, short dark hair, plain coat collar, calm "
     "clear eyes, quiet expression." + ISO),
    ("OBJ13", "world", "1536x1024", True, [], "crop",
     "Close-up side view of a bare adult human hand and forearm reaching toward the left edge of the frame, fingers "
     "slightly open, plain coat sleeve." + ISO),
    ("OBJ14", "world", "1024x1024", True, [], "crop",
     "An old portable cassette voice recorder, worn and dusty, lying on its back, seen from a low angle." + ISO),
    ("OBJ15", "world", "1024x1024", True, [], "crop",
     "A single small white flower with a thin stem and two leaves, lying on its side." + ISO),
    # ---- backgrounds ----
    ("BG01b", "world", "1920x1080", False, [], "none",
     "A vast ruined city plain, low horizon at two thirds down, collapsed gray concrete buildings clustered on the "
     "right half, open flat ground on the left, plain flat light sky." + EMPTY),
    ("BG02", "world", "1920x1080", False, [], "none",
     "Thick billowing smoke filling the entire frame, large overlapping smoke clouds drawn as flat gray shapes with "
     "simple outlines." + EMPTY),
    ("BG03", "world", "1920x1080", False, [], "none",
     "Interior of a ruined room, cracked walls, a large broken window opening on the right showing the plain sky "
     "outside, debris on the floor, the center of the room empty." + EMPTY),
    ("BG04", "world", "2560x1440", False, [], "none",
     "A calm open sea at sunset, the sun low on a straight horizon, gentle flat waves, wide open sky." + EMPTY),
    ("BG05", "world", "1920x1080", False, [], "none",
     "A vast desert with gentle dunes, the horizon very low near the bottom of the frame, a huge empty plain sky."
     + EMPTY),
    ("BG06a", "world", "1920x1080", False, [], "none",
     "Underwater view of the open deep sea, a few floating particles drawn as small dots, a rocky seabed silhouette "
     "along the bottom." + EMPTY),
    ("BG06b", "world", "1920x1080", False, [], "none",
     "A completely still water surface stretching to a low horizon, mirror-like reflection of a plain sky, no waves."
     + EMPTY),
    ("BG07", "world", "2560x1440", False, [], "none",
     "A ruined city street in the rain, collapsed buildings on both sides, broken pavement with puddles, rain drawn "
     "as simple thin straight lines." + EMPTY),
    ("BG08", "world", "1920x1080", False, [], "none",
     "A calm sea at dawn, the sun just rising on the horizon, small flat waves, wide sky with a few flat clouds."
     + EMPTY),
    ("BG09", "world", "1920x1080", False, [], "none",
     "Massive gray storm clouds rolling in across the sky over a low flat landscape, the clouds drawn as large flat "
     "layered shapes." + EMPTY),
    ("BG10", "world", "1920x1080", False, [], "none",
     "A vast empty snowfield under an overcast sky, low horizon, a few distant ruins half buried in snow." + EMPTY),
    # ---- v5 additions (full-frame, no keying) ----
    ("CH-M1", "char", "1920x1080", False, [], "none",
     "Extreme close-up of the lower half of her face filling the frame: mouth wide open in a raw scream, tense jaw, "
     "strands of orange hair at the edge, side-lit. Wide horizontal framing, no eyes visible."),
    ("CH-E2", "char", "1920x1080", False, [], "none",
     "Extreme close-up of ONE of her orange eyes filling the whole frame: detailed iris and pupil, lashes, a faint "
     "reflection of a grid of tiny square pixels on the iris. Wide horizontal framing."),
    ("OBJ16", "world", "1920x1080", False, [], "none",
     "An old broken CRT television monitor standing on rubble, front view filling most of the frame, the glass screen "
     "cracked, the screen filled with white static speckles drawn as flat dots." + EMPTY),
    ("OBJ17", "world", "1920x1080", False, [], "none",
     "Close-up of a tangle of torn electrical cables and wires spilling across the frame, cut copper ends exposed, "
     "broken plastic connectors." + EMPTY),
    ("OBJ18", "world", "1920x1080", False, [], "none",
     "Top-down close-up of a half-burnt old group photograph of a family of five lying on gray ashes, the faces "
     "scratched out with rough lines, the burnt edges curling and charred." + EMPTY),
    ("OBJ19", "world", "1920x1080", False, [], "none",
     "Close-up of large broken glass shards scattered on dark ground, sharp jagged edges, a few reflections drawn as "
     "flat white shapes." + EMPTY),
    ("OBJ20", "world", "1920x1080", False, [], "none",
     "A tall figure in a long dark hooded cloak standing at the far end of a ruined street, holding a kusarigama, the "
     "chain hanging down to the ground. The figure is a solid black silhouette with no face visible."),
    ("BG11", "world", "1920x1080", False, [], "none",
     "Tilted high-voltage transmission towers with snapped power lines hanging down, over a flat empty wasteland, "
     "plain overcast sky, low angle." + EMPTY),
    ("BG12", "world", "1920x1080", False, [], "none",
     "A sagging chain-link fence across a wasteland, a rusted triangular radiation hazard sign hanging crooked on it "
     "showing only the trefoil pictogram, no text." + EMPTY),
    ("BG13", "world", "1920x1080", False, [], "none",
     "A long straight ruined concrete corridor receding to a dark vanishing point at the exact center, broken ceiling "
     "lights, debris on the floor, symmetrical one-point perspective." + EMPTY),
    ("BG14", "world", "1920x1080", False, [], "none",
     "Low-angle view from below of a crowd of adults in long coats standing close together, all looking up at the "
     "sky, their faces in shadow with no features drawn, plain sky above."),
    ("BG15", "world", "1920x1080", False, [], "none",
     "Close-up of white salt crystals forming a cracked crystalline crust on the ground, filling the whole frame."
     + EMPTY),
]

# second phase: edits of a phase-one output (id, base id, size, subject)
EDITS = [
    ("BG07h", "BG07", "2560x1440",
     "Keep this exact scene, composition and drawing style. Change only: the rain has stopped, the puddles are gone, "
     "and fires are burning inside several of the ruined buildings, flames drawn as flat shapes. Plain everyday "
     "colors at normal brightness. No people, no text."),
]


def build_prompt(kind, subject):
    lock = CHAR_LOCK if kind == "char" else WORLD_LOCK
    return f"{lock}\n\nNew image: {subject}"


def raw_files(i):
    return sorted(RAW.glob(f"{i}.png")) + sorted(RAW.glob(f"{i}-*.png"))


def run_gen(i, prompt, size, transparent, images):
    if raw_files(i):
        return i, "skip"
    PROMPTS.mkdir(parents=True, exist_ok=True)
    pf = PROMPTS / f"{i}.txt"
    pf.write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--prompt-file", str(pf), "--model", MODEL, "--size", size,
           "--out-dir", str(RAW), "--name", i]
    for im in images:
        cmd += ["--image", str(ROOT / im)]
    if transparent:
        cmd.append("--transparent")
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT)
        if r.returncode == 0 and raw_files(i):
            return i, "ok"
    return i, f"FAIL: {r.stderr.strip()[-400:]}"


def post(i, mode):
    files = raw_files(i)
    if not files:
        return
    src = files[0]
    dst = OUT / f"{i}.png"
    OUT.mkdir(parents=True, exist_ok=True)
    py = sys.executable
    if mode == "none":
        shutil.copy(src, dst)
        return
    if mode == "full":
        r = subprocess.run([py, str(ROOT / "tools/reproportion.py"), str(src), str(dst), "--heads", "6.0", "--k", "0.86"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ROOT)
        print(f"  reproportion {i}: {(r.stdout or r.stderr).strip().splitlines()[-1] if (r.stdout or r.stderr) else ''}")
        if r.returncode != 0:
            shutil.copy(src, dst)
        src = dst
    subprocess.run([py, str(ROOT / "tools/prep_asset.py"), str(src), str(dst)], cwd=ROOT)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", default="")
    p.add_argument("--workers", type=int, default=4)
    a = p.parse_args()
    only = set(filter(None, a.only.split(",")))
    items = [it for it in ITEMS if not only or it[0] in only]
    edits = [e for e in EDITS if not only or e[0] in only]

    jobs = []
    with ThreadPoolExecutor(a.workers) as ex:
        for i, kind, size, tr, extra, mode, subj in items:
            refs = [STYLE_REF] + (CHAR_REFS_FRONT + extra if kind == "char" else extra)
            jobs.append(ex.submit(run_gen, i, build_prompt(kind, subj), size, tr, refs))
        for f in as_completed(jobs):
            i, st = f.result()
            print(f"[gen] {i}: {st}", flush=True)

    for i, base, size, subj in edits:
        b = raw_files(base)
        if not b:
            print(f"[edit] {i}: base {base} missing")
            continue
        i2, st = run_gen(i, subj, size, False, [str(b[0].relative_to(ROOT))])
        print(f"[edit] {i2}: {st}", flush=True)

    for i, kind, size, tr, extra, mode, subj in items:
        post(i, mode)
    for i, *_ in edits:
        post(i, "none")
    print("done", flush=True)


if __name__ == "__main__":
    main()

"""Ultimate-cutscene frame helper (art/ult-XX.webp, 1376x768 WebP q75).

  python tools/ult_frames.py gif [out.gif]
      GIF preview using the timing in ULT_SEQ / ULT_END_MS read from index.html.

  python tools/ult_frames.py insert AFTER img [img ...] [AFTER img ...]
      Insert new images (any size/format) after existing frame number AFTER (1-based,
      numbers refer to the CURRENT frames). Converts each to 1376x768 WebP (cover-crop),
      renumbers art/ult-*.webp, and prints the old->new frame map so ULT_SEQ can be updated.
      e.g.  insert 1 aura.png  5 zoomout.png  6 sprint.png
"""
import re, sys, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'art'
W, H = 1376, 768


def frames():
    fs = [f for f in ART.glob('ult-*.webp') if f.stem[4:].isdigit()]
    return sorted(fs, key=lambda f: int(f.stem[4:]))


def to_frame(src, dst):
    im = Image.open(src).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    im.crop((l, t, l + W, t + H)).save(dst, 'WEBP', quality=75, method=6)


def insert(args):
    plan, after = {}, None
    for a in args:
        if a.isdigit():
            after = int(a)
        else:
            if after is None:
                sys.exit('give a frame number before each image')
            plan.setdefault(after, []).append(Path(a))
    old = frames()
    tmp = ART / '_ult_tmp'
    tmp.mkdir(exist_ok=True)
    order, n = [], 0   # (source, is_new)
    for i in range(len(old) + 1):
        if i:
            order.append((old[i - 1], False))
        order += [(p, True) for p in plan.get(i, [])]
    mapping = []
    for k, (src, new) in enumerate(order, 1):
        dst = tmp / f'ult-{k:02d}.webp'
        if new:
            to_frame(src, dst); mapping.append(f'  new {src.name} -> {k:02d}')
        else:
            shutil.copy2(src, dst)
            o = int(src.stem[4:])
            if o != k: mapping.append(f'  {o:02d} -> {k:02d}')
    for f in old: f.unlink()
    for f in tmp.iterdir(): shutil.move(str(f), ART / f.name)
    tmp.rmdir()
    print(f'{len(old)} -> {len(order)} frames'); print('\n'.join(mapping))


def gif(out):
    src = (ROOT / 'index.html').read_text(encoding='utf-8')
    seq = [(int(a), int(f)) for a, f in re.findall(r"\{\s*at:\s*(\d+),\s*f:\s*(\d+)", src.split('const ULT_SEQ')[1].split('];')[0])]
    end = int(re.search(r'ULT_END_MS\s*=\s*(\d+)', src).group(1))
    fs = frames()
    ims, durs = [], []
    for i, (at, f) in enumerate(seq):
        nxt = seq[i + 1][0] if i + 1 < len(seq) else end
        ims.append(Image.open(fs[f]).convert('RGB').resize((688, 384), Image.LANCZOS))
        durs.append(max(20, nxt - at))
    durs[-1] += 600   # hold the last frame before looping
    ims[0].save(out, save_all=True, append_images=ims[1:], duration=durs, loop=0)
    print(f'{out}: {len(ims)} steps, {end} ms, frames on disk {len(fs)}')


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    if sys.argv[1] == 'gif': gif(sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'ult-preview.gif'))
    elif sys.argv[1] == 'insert': insert(sys.argv[2:])
    else: sys.exit(__doc__)

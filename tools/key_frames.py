"""Split AI Studio green-screen sprite sheets into transparent Airin frames.

Usage: python tools/key_frames.py <out_dir> <sheet1.png> <sheet2.png> <sheet3.png>

Each sheet holds 18 poses, 6 per row in 3 rows, named by SHEETS below (sheet 1 = first
list, sheet 2 = second list, ...). Poses don't have to sit inside equal cells (slashes may
stick out): rows and poses are found from the gaps of green between them. Each pose is
anchored at its grid-cell centre (x) and its row's baseline (lowest foot in the row, y).
All sheets are drawn at the same scale, so one factor (sheet 1's standing pose -> STAND_H px,
Airin's size on the 640x360 stage, so the game draws frames 1:1) scales them all, then every
frame goes on one shared canvas so they keep their relative positions. Names of None are
not written. Sheet 3 is one side-view ready stance repeated; its first cell becomes the
idle, and idle-1..3 are made from it by lowering the upper body (and the sword, picked by
colour) 0/1/2 px while the legs stay put - a breathing loop with no AI jitter.
Prints AIRIN_FIT for index.html.
"""
import sys, os
from PIL import Image
import numpy as np

SHEETS = [
    ['stance', None, 'attack-1', 'attack-2', 'attack-3', 'block-1',
     'block-2', 'hurt-1', 'hurt-2', 'hurt-3', 'charge-1', 'charge-2',
     'ult-1', 'ult-2', 'ult-3', 'win-1', 'win-2', 'win-3'],
    [None, 'idle-4', 'attack-1b', 'attack-2b', 'attack-4', 'block-0',
     'block-3', 'hurt-0', 'hurt-4', 'charge-3', 'charge-4', 'ult-0',
     'ult-1b', 'ult-2b', 'ult-4', 'win-0', 'win-2b', 'win-4'],
    [None, 'attack-0', 'attack-1c', 'attack-2c', 'attack-3b', 'ult-0b',
     'block-0b', 'block-1b', 'block-2b', 'block-2c', 'block-3b', 'block-4',
     'hurt-1b', 'hurt-2b', 'hurt-2c', 'hurt-3b', 'hurt-5', 'ult-2c'],
    [None, 'charge-0', 'charge-1b', 'charge-2b', 'charge-3b', 'charge-5',
     'charge-6', 'ult-3b', 'win-0b', 'win-1b', 'win-3b', 'win-5',
     'idle-5', 'idle-6', 'idle-7', 'idle-8', 'idle-9', 'idle-10'],
]
COLS, ROWS, STAND_H = 6, 3, 118


def key(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)                  # how much greener than the other channels
    alpha = np.clip(1 - (green - 40) / 70, 0, 1)  # >110 = background, <40 = solid
    alpha[(g > 200) & (r < 90) & (b < 90)] = 0
    g2 = np.where(green > 0, np.maximum(r, b), g)  # despill
    alpha[alpha < .08] = 0
    return np.dstack([r, g2, b, alpha * 255]).astype(np.uint8)


def runs(occ, min_gap):
    """[start, end) runs of True, joining runs separated by fewer than min_gap False."""
    out, i, n = [], 0, len(occ)
    while i < n:
        if not occ[i]:
            i += 1; continue
        j = i
        while j < n and occ[j]: j += 1
        if out and i - out[-1][1] < min_gap: out[-1][1] = j
        else: out.append([i, j])
        i = j
    return out


def split(occ, count, min_gap):
    """Split a 1-D occupancy into `count` runs: drop specks, merge the closest pairs."""
    rs = [r for r in runs(occ, min_gap) if r[1] - r[0] > 6]
    while len(rs) > count:
        k = min(range(len(rs) - 1), key=lambda k: rs[k + 1][0] - rs[k][1])
        rs[k:k + 2] = [[rs[k][0], rs[k + 1][1]]]
    while len(rs) < count:   # two poses touch (e.g. swords): cut the widest run at a cell edge
        k = max(range(len(rs)), key=lambda k: rs[k][1] - rs[k][0])
        a, b = rs[k]; cw = len(occ) / count
        cut = int(round(round((a + b) / 2 / cw) * cw))
        if not a < cut < b: break
        rs[k:k + 1] = [[a, cut], [cut, b]]
    if len(rs) != count:
        sys.exit('found %d groups, expected %d' % (len(rs), count))
    return rs


def label(mask):
    """4-connected component labels of a 2-D bool array (0 = background)."""
    lab = np.zeros(mask.shape, np.int32); h, w = mask.shape; n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; stack.append((yy, xx))
    return lab, n


def owners(band, cols, B=4):
    """Per-pixel pose index for a row band. Connected pieces stay whole: a piece that is the
    biggest one inside a column run is that pose's body; any other piece goes to the run that
    holds most of it. So a sword poking past the cut stays with the hand that holds it."""
    h, w = band.shape
    small = band[:h // B * B, :w // B * B].reshape(h // B, B, w // B, B).any((1, 3))
    lab, n = label(small)
    run_of_x = np.full(small.shape[1], -1, int)
    for k, (c0, c1) in enumerate(cols): run_of_x[c0 // B:(c1 + B - 1) // B] = k
    count = np.zeros((n + 1, len(cols)), int)
    ys, xs = np.nonzero(lab)
    valid = run_of_x[xs] >= 0
    np.add.at(count, (lab[ys[valid], xs[valid]], run_of_x[xs[valid]]), 1)
    own = np.where(count.max(1) > 0, count.argmax(1), -1)
    for k in range(len(cols)): own[count[:, k].argmax()] = k   # the run's body
    full = np.full((h, w), -1)
    big = np.repeat(np.repeat(np.where(lab > 0, own[lab], -1), B, 0), B, 1)
    full[:big.shape[0], :big.shape[1]] = big
    return full


def poses(sheet_path):
    """[(rgba crop, anchor x, baseline y)] for the 18 poses of one sheet, unscaled."""
    px = key(Image.open(sheet_path))
    H, W = px.shape[:2]
    solid = px[..., 3] > 60
    cw = W / COLS
    out = []
    for r0, r1 in split(solid.any(1), ROWS, H // 100):
        band = solid[r0:r1]
        cols = split(band.any(0), COLS, W // 200)
        own = owners(band, cols)
        anyone = px[r0:r1, ..., 3] > 0
        masks = [(own == k) & anyone for k in range(COLS)]
        if any(not m.any() for m in masks):
            xs_grid = np.arange(W)[None, :]
            masks = [anyone & (xs_grid >= c0) & (xs_grid < c1) for c0, c1 in cols]
        base = r0 + max(np.nonzero(m.any(1))[0].max() for m in masks) + 1
        for k, m in enumerate(masks):
            ys, xs = np.nonzero(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            f = px[r0 + y0:r0 + y1, x0:x1].copy()
            f[..., 3] *= m[y0:y1, x0:x1]
            cell = int((cols[k][0] + cols[k][1]) / 2 // cw)
            out.append((f, (cell + .5) * cw - x0, base - r0 - y0))
    return out


def scale(f, ax, by, s):
    im = Image.fromarray(f, 'RGBA')
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return im, ax * s, by * s


def breathe(canvas, top, foot, d):
    """Lower everything above the hips (hand and hilt included) plus the whole blade by d px;
    the legs stay planted."""
    a = np.asarray(canvas).copy()
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    hip = int(top + (foot - top) * .62)
    blade = (b > 170) & (g > 140) & (b >= r) & (al > 0)          # glowing blade core
    for _ in range(3):                                             # + its dark outline
        blade = blade | np.roll(blade, 1, 0) | np.roll(blade, -1, 0) | np.roll(blade, 1, 1) | np.roll(blade, -1, 1)
    move = blade.copy(); move[:hip] = True
    move &= al > 0
    out = a.copy(); out[move] = 0
    src = a.copy(); src[~move] = 0
    sh = np.zeros_like(src); sh[d:] = src[:src.shape[0] - d] if d else src
    keep = sh[..., 3] > 0
    out[keep] = sh[keep]
    return Image.fromarray(out, 'RGBA')


def main(out_dir, *sheets):
    raw = []
    for names, path in zip(SHEETS, sheets):
        raw += [(n, p) for n, p in zip(names, poses(path))]
    s = STAND_H / raw[0][1][0].shape[0]
    frames = [(n, scale(*p, s)) for n, p in raw if n]
    L = max(ax for _, (_, ax, _) in frames); R = max(im.width - ax for _, (im, ax, _) in frames)
    U = max(by for _, (_, _, by) in frames); D = max(im.height - by for _, (im, _, by) in frames)
    cw, ch = int(np.ceil(L + R)), int(np.ceil(U + D)) + 2
    os.makedirs(out_dir, exist_ok=True)
    idle = None
    for n, (im, ax, by) in frames:
        canvas = Image.new('RGBA', (cw, ch))
        canvas.paste(im, (int(round(L - ax)), int(round(U - by))))
        if n == 'stance':
            idle = (U - by, im.height)
            for i in range(3):
                breathe(canvas, U - by, U, i).save(os.path.join(out_dir, 'airin-idle-%d.png' % (i + 1)), optimize=True)
            continue
        if n.startswith('stand'): continue
        canvas.save(os.path.join(out_dir, 'airin-%s.png' % n), optimize=True)
    print('%d frames, canvas %dx%d' % (len(frames) + 1, cw, ch))
    print('AIRIN_FIT = { cx: %.3f, foot: %.3f, head: %.3f, h: %d }' % (
        L / cw, U / ch, idle[0] / ch, round(U - idle[0])))


if __name__ == '__main__':
    main(*sys.argv[1:])

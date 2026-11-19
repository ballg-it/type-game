"""Split a keyed character lineup (transparent PNG) into one PNG per character.

python tools/split_lineup.py lineup.png outdir name1:cx1[:h] name2:cx2[:h] ... [--h 260] [--cut a:b:x,y;x,y ...]

Every connected blob of opaque pixels goes to the character whose centre x (pixels in the
lineup) is nearest to the blob's centre, so loose bits (sparks, floating glyphs) follow their
owner. Each character is cropped to its pixels and scaled to height --h (LANCZOS). Prints the
foot/centre fractions the game needs for placement.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

args = [a for a in sys.argv[1:]]
H = 260
CUTS = []   # --cut left:right:x,y;x,y;...  blobs owned by either side are split along this polyline
while '--cut' in args:
    i = args.index('--cut'); l, r, pts = args[i + 1].split(':', 2); del args[i:i + 2]
    CUTS.append((l, r, [tuple(map(float, q.split(','))) for q in pts.split(';')]))
if '--h' in args:
    i = args.index('--h'); H = int(args[i + 1]); del args[i:i + 2]
src, out, specs = args[0], args[1], args[2:]
names = [s.split(':')[0] for s in specs]
cxs = np.array([float(s.split(':')[1]) for s in specs])
hs = [int(s.split(':')[2]) if s.count(':') > 1 else H for s in specs]   # name:cx:height overrides --h

im = Image.open(src).convert('RGBA')
A = np.asarray(im)
S = 4                                   # label on a 1/4 grid: fast in pure Python, blobs still separate
small = A[::S, ::S, 3] > 24
h, w = small.shape
lab = np.full((h, w), -1, np.int32)
owner = {}
n = 0
for y in range(h):
    for x in range(w):
        if not small[y, x] or lab[y, x] >= 0: continue
        q = deque([(y, x)]); lab[y, x] = n; xs = []
        while q:
            cy, cx = q.popleft(); xs.append(cx)
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and lab[ny, nx] < 0:
                    lab[ny, nx] = n; q.append((ny, nx))
        mx = np.mean(xs) * S
        owner[n] = int(np.argmin(np.abs(cxs - mx)))
        if len(xs) > 2000: print('blob', n, 'size', len(xs), 'x', min(xs) * S, max(xs) * S, '->', names[owner[n]])
        n += 1

# per-pixel owner from the coarse labels (nearest grid cell)
full = np.kron(lab, np.ones((S, S), np.int32))[:A.shape[0], :A.shape[1]]
pad = np.full(A.shape[:2], -1, np.int32); pad[:full.shape[0], :full.shape[1]] = full
lut = np.array([owner[i] for i in range(n)] + [-1], np.int32)
own = lut[pad]                           # -1 maps to the last entry (-1)
YY, XX = np.mgrid[0:A.shape[0], 0:A.shape[1]]
for l, r, pts in CUTS:                   # touching characters: x left of the line -> l, else r
    li, ri = names.index(l), names.index(r)
    py, px = [p[1] for p in pts], [p[0] for p in pts]
    bx = np.interp(YY, py, px)
    m = (own == li) | (own == ri)
    own = np.where(m, np.where(XX < bx, li, ri), own)
for i, nm in enumerate(names):
    B = A.copy(); B[..., 3] = np.where(own == i, A[..., 3], 0)
    ys, xs = np.nonzero(B[..., 3] > 24)
    if not len(ys): print('empty', nm); continue
    x0, x1, y0, y1 = max(0, xs.min() - 6), xs.max() + 7, max(0, ys.min() - 6), ys.max() + 7
    C = Image.fromarray(B[y0:y1, x0:x1])
    k = hs[i] / C.height
    C = C.resize((max(1, round(C.width * k)), hs[i]), Image.LANCZOS)
    # foot = lowest solid row, cx = mean x of the bottom 15% (the feet / robe hem)
    a = np.asarray(C)[..., 3] > 60
    rows = np.nonzero(a.any(1))[0]; foot = rows.max() / C.height
    low = a[int(C.height * .8):]; cx = np.nonzero(low.any(0))[0].mean() / C.width
    head = rows.min() / C.height
    C.save(f'{out}/{nm}.png', optimize=True)
    print(f"{nm}: {C.width}x{C.height} cx={cx:.3f} foot={foot:.3f} head={head:.3f}")

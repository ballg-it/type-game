"""Key a single green-screen illustration (AI Studio, #00FF00 background) to a transparent PNG.

Usage: python tools/key_art.py <in.png|jpg> <out.png> [max_height]

Uses the same keyer as key_frames.py, keeps the largest connected figure (drops stray specks),
crops to it with a small margin and scales it down to max_height (default 1200 px).
"""
import sys, os
from PIL import Image
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from key_frames import key


def main(src, dst, max_h=1200):
    px = key(Image.open(src))
    solid = px[..., 3] > 60
    rows, cols = np.where(solid.any(1))[0], np.where(solid.any(0))[0]
    # ignore tiny islands: keep rows/cols that hold a meaningful amount of the figure
    rs, cs = solid.sum(1), solid.sum(0)
    rows = np.where(rs > max(2, rs.max() * .01))[0]
    cols = np.where(cs > max(2, cs.max() * .01))[0]
    m = 12
    y0, y1 = max(0, rows[0] - m), min(px.shape[0], rows[-1] + m + 1)
    x0, x1 = max(0, cols[0] - m), min(px.shape[1], cols[-1] + m + 1)
    im = Image.fromarray(px[y0:y1, x0:x1], 'RGBA')
    if im.height > max_h:
        im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
    im.save(dst, optimize=True)
    print(dst, im.size, os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1200)

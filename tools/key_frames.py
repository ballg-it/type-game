"""Split the AI Studio green-screen sprite sheet into transparent Airin frames.

Usage: python tools/key_frames.py <sheet.png> <out_dir>

The sheet is 6 columns x 3 rows of equal cells in this order:
idle-1 idle-2 attack-1 attack-2 attack-3 block-1 / block-2 hurt-1 hurt-2 hurt-3
charge-1 charge-2 / ult-1 ult-2 ult-3 win-1 win-2 win-3
Each cell is keyed (pure-green background -> transparent, green spill removed),
then every frame is cropped to the same union box so they keep their relative
positions (same baseline / centre as generated). Prints the idle fit numbers
used by AIRIN_FIT in index.html.
"""
import sys, os
from PIL import Image
import numpy as np

NAMES = ['idle-1', 'idle-2', 'attack-1', 'attack-2', 'attack-3', 'block-1',
         'block-2', 'hurt-1', 'hurt-2', 'hurt-3', 'charge-1', 'charge-2',
         'ult-1', 'ult-2', 'ult-3', 'win-1', 'win-2', 'win-3']


def key(cell):
    a = np.asarray(cell.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)                 # how much greener than the other channels
    alpha = np.clip(1 - (green - 40) / 70, 0, 1)  # >110 = background, <40 = solid
    alpha[(g > 200) & (r < 90) & (b < 90)] = 0
    # despill: pull green down to the other channels on kept pixels
    g2 = np.where(green > 0, np.maximum(r, b) + np.minimum(green, 0), g)
    out = np.dstack([r, g2, b, alpha * 255]).astype(np.uint8)
    # drop speckles: alpha below 8% -> 0
    out[..., 3][out[..., 3] < 20] = 0
    return Image.fromarray(out, 'RGBA')


def main(sheet_path, out_dir):
    sheet = Image.open(sheet_path)
    cw, ch = sheet.width // 6, sheet.height // 3
    frames = [key(sheet.crop(((i % 6) * cw, (i // 6) * ch, (i % 6 + 1) * cw, (i // 6 + 1) * ch)))
              for i in range(18)]
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for f in frames]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    pad = 4
    box = (max(0, x0 - pad), max(0, y0 - pad), min(cw, x1 + pad), min(ch, y1 + pad))
    os.makedirs(out_dir, exist_ok=True)
    for n, f, b in zip(NAMES, frames, boxes):
        f.crop(box).save(os.path.join(out_dir, 'airin-%s.png' % n), optimize=True)
        print(n, 'bbox', b)
    W, H = box[2] - box[0], box[3] - box[1]
    ib = boxes[0]
    print('crop', box, 'size', W, H)
    print('AIRIN_FIT idle: cx=%.3f foot=%.3f head=%.3f' % (
        ((ib[0] + ib[2]) / 2 - box[0]) / W, (ib[3] - box[1]) / H, (ib[1] - box[1]) / H))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

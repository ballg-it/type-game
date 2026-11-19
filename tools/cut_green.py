"""ตัดสไปรต์จากชีตพื้นเขียว (green screen) ออกเป็นท่าละไฟล์
ใช้: cut_green.py <ชีต> <โฟลเดอร์ออก> [สเกล] [จำนวนท่า]
- ลบพื้นเขียว + ลดสีเขียวที่ขอบ (despill) ไม่กินแสงฟ้าของดาบ (ฟ้ามี B สูงพอๆ กับ G)
- แยกตัวละครด้วยก้อนที่ต่อกัน (ขยายก่อนเพื่อรวมดาบ/ฝักที่แยกชิ้น) เรียงแถวบน→ล่าง ซ้าย→ขวา
- เขียน frames.json: ขนาด + จุดยึดเท้า (fx = กลางเท้า, fy = ล่างสุด)"""
import sys, json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, outd = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
im = np.asarray(Image.open(src).convert('RGB')).astype(np.int32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx = np.maximum(r, b)
# ความเป็นเขียว 0..1 → alpha
greenness = np.clip((g - mx - 40) / 80.0, 0, 1)
alpha = (1 - greenness)
alpha[(g > 120) & (g - mx > 110)] = 0
# despill: G ไม่เกิน max(R,B)+เล็กน้อย
g2 = np.minimum(g, mx + 12)
rgb = np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)
solid = alpha > .5
N = int(sys.argv[4]) if len(sys.argv) > 4 else 18   # จำนวนท่าในชีต
# แบ่งแถว: หาเส้นแนวนอนใกล้ 1/3, 2/3 ที่ตัดผ่านพิกเซลน้อยที่สุด แล้วตัดการเชื่อมต่อที่เส้นนั้น
ROWS = 3
H = im.shape[0]; rs = solid.sum(1)
cuts = [int(H * k / ROWS) - 40 + int(np.argmin(rs[int(H * k / ROWS) - 40:int(H * k / ROWS) + 40])) for k in range(1, ROWS)]
dil = ndimage.binary_dilation(solid, iterations=2)
for y in cuts: dil[y] = False
# ถ้าแถวไหนมีก้อนใหญ่ไม่ครบ N/ROWS (มีท่าติดกันด้วยดาบ) → ตัดก้อนกว้างสุดตรงเส้นตั้งที่บางที่สุด
bands = [0] + cuts + [H]
for ri in range(ROWS):
    for _ in range(6):
        sub = dil[bands[ri]:bands[ri + 1]]
        lb, nn = ndimage.label(sub)
        ar = ndimage.sum(np.ones_like(lb), lb, index=range(1, nn + 1))
        big = [i + 1 for i in range(nn) if ar[i] > 15000]
        if len(big) >= N // ROWS: break
        sls = ndimage.find_objects(lb)
        w = max(big, key=lambda i: sls[i - 1][1].stop - sls[i - 1][1].start)
        x0, x1 = sls[w - 1][1].start, sls[w - 1][1].stop
        cs = (lb == w).sum(0)[x0:x1]
        a_, b_ = int((x1 - x0) * .3), int((x1 - x0) * .7)
        xc = x0 + a_ + int(np.argmin(cs[a_:b_]))
        dil[bands[ri]:bands[ri + 1], xc] = False
        print('split row', ri, 'at x', xc)
lab, n = ndimage.label(dil)
areas = ndimage.sum(np.ones_like(lab), lab, index=range(1, n + 1))
objs = ndimage.find_objects(lab)
# ตัวหลัก = ก้อนใหญ่สุด N/ROWS ก้อนในแต่ละแถว (ไม่ใช้อันดับรวมทั้งชีต กันชิ้นดาบใหญ่ไปแย่งที่)
rowof = lambda i: sum((objs[i][0].start + objs[i][0].stop) / 2 > c for c in cuts)
seeds = []
for ri in range(ROWS):
    ids = [i for i in range(n) if rowof(i) == ri]
    seeds += [i + 1 for i in sorted(ids, key=lambda i: -areas[i])[:N // ROWS]]
owner = np.zeros(n + 1, int)
for s_ in seeds: owner[s_] = s_
def bdist(a, b_):
    (ay, ax), (by, bx) = a, b_
    dy = max(0, by.start - ay.stop, ay.start - by.stop); dx = max(0, bx.start - ax.stop, ax.start - bx.stop)
    return dy * dy + dx * dx
for i in range(1, n + 1):
    if owner[i] or areas[i - 1] < 30: continue   # ชิ้นเล็กมาก = เศษ ทิ้ง
    owner[i] = min(seeds, key=lambda s_: bdist(objs[i - 1], objs[s_ - 1]))
lab = owner[lab]
items = []
for s_ in seeds:
    ys, xs = np.where(lab == s_)
    items.append(((slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1)), s_))
def key(it):
    sl = it[0]; cy = (sl[0].start + sl[0].stop) / 2
    return (sum(cy > c for c in cuts), (sl[1].start + sl[1].stop) / 2)
items.sort(key=key)
os.makedirs(outd, exist_ok=True)
meta = []
for k, (sl, lid) in enumerate(items):
    m = (lab[sl] == lid) & (alpha[sl] > 0)
    a = (alpha[sl] * m * 255).astype(np.uint8)
    rgba = np.dstack([rgb[sl], a])
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getbbox(); img = img.crop(bb)
    if scale != 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    A = np.asarray(img)[..., 3] > 128
    ys = np.where(A.any(1))[0]; fy = int(ys[-1])
    # จุดกลางเท้า: ช่วง x ของพิกเซลทึบใน 6% ล่างสุด
    band = A[max(0, fy - int(img.height * .06)):fy + 1]
    xs = np.where(band.any(0))[0]
    fx = int((xs[0] + xs[-1]) / 2)
    name = f'pose{k:02d}.png'
    img.save(os.path.join(outd, name))
    meta.append({'file': name, 'w': img.width, 'h': img.height, 'fx': fx, 'fy': fy})
json.dump(meta, open(os.path.join(outd, 'frames.json'), 'w'), indent=1)
print(len(meta), 'frames, row cuts', cuts)
for m in meta: print(m)

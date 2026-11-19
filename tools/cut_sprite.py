import sys
from PIL import Image
import numpy as np
from collections import deque
# ใช้: cut_sprite.py <ภาพ> x0,y0,x1,y1 <ออก.png> <ตัวหาร> [slate|navy]
src, box, out, k = sys.argv[1], tuple(map(int, sys.argv[2].split(','))), sys.argv[3], float(sys.argv[4])
im = np.asarray(Image.open(src).convert('RGB')).astype(int)[box[1]:box[3], box[0]:box[2]]
H, W, _ = im.shape
MODE = sys.argv[5] if len(sys.argv) > 5 else 'slate'
bg = np.array([46, 64, 83])
# พื้นหลังของชีต: 'slate' = พื้นเทาฟ้า (ชีตเรย์), 'navy' = พื้นกรมท่าเข้ม+เส้นกริดฟ้า (ชีตไอริน)
def isbg(p):
    if MODE == 'navy':
        return p[0] <= 26 and 16 <= p[1] <= 60 and 46 <= p[2] <= 95 and p[2] - p[0] >= 40 and p[1] - p[0] >= 14
    d = p - bg
    return abs(d).max() < 26 and p[2] - p[0] > 22 and p[1] - p[0] > 8
cand = np.zeros((H, W), bool)
for y in range(H):
    for x in range(W):
        cand[y, x] = isbg(im[y, x])
mask = np.zeros((H, W), bool); q = deque()
for y in range(H):
    for x in (0, W - 1):
        if cand[y, x]: mask[y, x] = True; q.append((y, x))
for x in range(W):
    for y in (0, H - 1):
        if cand[y, x] and not mask[y, x]: mask[y, x] = True; q.append((y, x))
# พื้นหลังที่ถูกล้อม (เช่น ระหว่างขา): ก้อนสีพื้นหลังที่ใหญ่พอก็ลบด้วย
from itertools import product
seen = mask.copy()
for y0, x0 in product(range(H), range(W)):
    if cand[y0, x0] and not seen[y0, x0]:
        comp = [(y0, x0)]; seen[y0, x0] = True; qq = deque(comp)
        while qq:
            y, x = qq.popleft()
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; comp.append((ny, nx)); qq.append((ny, nx))
        if len(comp) > 40:
            for y, x in comp: mask[y, x] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not mask[ny, nx]:
            mask[ny, nx] = True; q.append((ny, nx))
# ลอกขอบ: พิกเซลติดพื้นหลังที่เป็นสีฟ้าผสม (G > R, B > R มาก) ถือเป็นพื้นหลัง — ไม่กินสีม่วง (G < R)
for _ in range(3):
    edge = np.zeros_like(mask)
    edge[1:] |= mask[:-1]; edge[:-1] |= mask[1:]; edge[:, 1:] |= mask[:, :-1]; edge[:, :-1] |= mask[:, 1:]
    r_, g_, b_ = im[..., 0], im[..., 1], im[..., 2]
    fr = edge & ~mask & (g_ >= r_ + 10) & (b_ - r_ > 25) & (r_ < 80)
    if MODE != 'navy': fr &= False
    mask |= fr
# ย่อ: แต่ละบล็อก k×k ใช้ค่ามัธยฐานของพิกเซลที่ไม่ใช่พื้นหลัง (ทึบถ้า >50%)
w2, h2 = int(W / k), int(H / k)
outa = np.zeros((h2, w2, 4), np.uint8)
for j in range(h2):
    for i in range(w2):
        y0, y1, x0, x1 = int(j * k), int((j + 1) * k), int(i * k), int((i + 1) * k)
        m = ~mask[y0:y1, x0:x1]
        if m.mean() > .5:
            outa[j, i, :3] = np.median(im[y0:y1, x0:x1][m], axis=0); outa[j, i, 3] = 255
# ลบจุดเศษ (พิกเซลทึบที่มีเพื่อนบ้านทึบน้อยกว่า 2)
al = outa[:, :, 3] > 0
for j in range(h2):
    for i in range(w2):
        if al[j, i] and sum(al[j+dj, i+di] for dj, di in ((1,0),(-1,0),(0,1),(0,-1)) if 0 <= j+dj < h2 and 0 <= i+di < w2) < 2:
            outa[j, i, 3] = 0
# ชีตแบบ navy มีเส้นเรืองฟ้ารอบตัว → เปลี่ยนพิกเซลขอบที่ติดสีฟ้าเป็นเส้นขอบเข้ม
if MODE == 'navy':
    al = outa[:, :, 3] > 0
    for j in range(h2):
        for i in range(w2):
            if not al[j, i]: continue
            nb = any(not (0 <= j+dj < h2 and 0 <= i+di < w2) or not al[j+dj, i+di] for dj, di in ((1,0),(-1,0),(0,1),(0,-1)))
            r_, g_, b_ = (int(v) for v in outa[j, i, :3])
            if nb and g_ > r_ + 5 and b_ > r_ + 20: outa[j, i, :3] = (14, 11, 30)
img = Image.fromarray(outa, 'RGBA')
img = img.crop(img.getbbox())
# ลดสีเฉพาะพิกเซลทึบ (k-means 40 สี) เก็บสีม่วง/ฟ้าที่มีน้อยไว้ได้
a = np.asarray(img); op = a[:, :, 3] > 0
strip = Image.fromarray(a[op][:, :3].reshape(1, -1, 3).astype(np.uint8), 'RGB')
qs = np.asarray(strip.quantize(40, method=Image.Quantize.MEDIANCUT, kmeans=3).convert('RGB'))[0]
b = a.copy(); b[op, :3] = qs
res = Image.fromarray(b, 'RGBA')
res.save(out); print(out, res.size)

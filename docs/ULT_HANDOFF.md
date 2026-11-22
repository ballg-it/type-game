# Handoff: Ultimate Cutscene — Sandevistan Overdrive (112 Frames — ดูบันทึกอัปเดตท้ายไฟล์)

> **ส่งงานต่อให้ Claude** — สรุปสถานะคัตซีนท่าไม้ตายและงานที่เหลือสำหรับเจนเฟรมรอยต่อ (in-between) ให้ลื่นยิ่งขึ้น

---

## 1. สถานะปัจจุบัน (ทำเสร็จแล้ว)
- **Branch:** `ccr-a67b83da-eggwh5`
- **แนวทางที่ผู้ใช้เลือก:** **Sandevistan Overdrive** (แยกร่างความเร็วแสง × ดาบแสงยักษ์ผ่าฟ้า)
- **เฟรมทั้งหมด:** 32 เฟรม (`art/ult-01.jpg` – `art/ult-32.jpg`, ขนาด `1376×768` JPEG)
  - เฟรม `01–07`: คงของเดิมไว้ทั้งหมด (ชาร์จ → ซูมมาโครตาเห็นศัตรู → ตาเรืองแสงสายฟ้า)
  - เฟรม `08–32`: ออกแบบและสร้างใหม่ทั้งหมดเป็นคัตซีน **Sandevistan Overdrive**
- **อัปเกรดใน `index.html`:**
  - `ULT_FRAMES` (`length: 32`), `ULT_SEQ`, `ULT_END_MS = 5240`
  - ระบบ `.prev` Crossfade 60ms ใน `applyUltStep()` (ยกเว้นเฟรมที่มี `cut: 1` จะตัด 0ms สำหรับ Impact Frame)
  - เอฟเฟกต์ CSS 60fps: `.uc-vbeam` (ลำแสงดาบยักษ์ฟาดดิ่งลง) และ `.uc-ring` (คลื่นช็อกเวฟนีออนขยายเต็มจอ)
  - คีย์เฟรมกล้องใหม่: `cam-sande`, `cam-surround`, `cam-blitz`, `cam-grin`, `cam-ascend`, `cam-overcharge`, `cam-claymore`, `cam-slam`, `cam-shockwave`
  - เสียงซินธ์ใหม่ใน `playUltSfx()`: `sande`, `blitz`, `ascend`, `overcharge`, `claymore`, `slam`

---

## 2. สารบัญเฟรมปัจจุบัน (`ult-08` – `ult-32`)

| เฟรม | เวลา (ms) | ประเภท | รายละเอียดช็อต |
| :--- | :--- | :--- | :--- |
| `ult-08.jpg` | 1380 | AI Keyframe | **Sandevistan Ignition** — แยกร่างสีรุ้ง 5 ชั้นพุ่งหน้าประตูโทริอิ |
| `ult-09.jpg` | 1500 | FX In-Between | RGB Split Boost เร่งสปีดก่อนแตกเส้นแสง |
| `ult-10.jpg` | 1610 | AI In-Between | **Sandevistan Split** — แตก 3 เส้นแสงพุ่งกระจายทั่วถนน |
| `ult-11.jpg` | 1730 | AI Keyframe | **Sandevistan Surround** — มุมสูง 5 ร่างล้อมเป้าเชื่อมสายฟ้า |
| `ult-12.jpg` | 1870 | FX In-Between | 5 ดาบพุ่งบรรจบกลางวงระเบิดแสงดาว |
| `ult-13.jpg` | 1990 | AI Keyframe | **Blitz Sweep** — ฟาดคลื่นดาบกวาดต่อเนื่อง (ปรับสีไซอัน/ม่วงแล้ว) |
| `ult-14.jpg` | 2110 | AI Keyframe | **Dutch-Angle X-Slash** — ฟันไขว้มุมเอียง 30° ระหว่างตึกนีออน |
| `ult-15.jpg` | 2230 | FX In-Between | X-Slash Flare + RGB แยกสี |
| `ult-16.jpg` | 2350 | AI Keyframe | **Close-Up Grin Cut-in** — โคลสอัพหน้ายิ้มสะใจตวัดดาบเฉียง |
| `ult-17.jpg` | 2500 | FX In-Between | Speed-Whip ซูมใกล้ตาเรืองแสง |
| `ult-18.jpg` | 2620 | AI Keyframe | **Skyward Launch** — มุมเงยต่ำพุ่งเกลียวขึ้นฟ้าเหนือตึกนีออน |
| `ult-19.jpg` | 2770 | AI In-Between | **Sky Rocket** — ทะยานผ่านยอดตึกตรงสู่พระจันทร์เต็มดวง |
| `ult-20.jpg` | 2910 | AI Keyframe | **Moon Overcharge** — ลอยหน้าพระจันทร์ชาร์จสายฟ้าเข้าดาบ |
| `ult-21.jpg` | 3060 | FX In-Between | แฟลร์พลาสมาปะทุที่ด้ามดาบ |
| `ult-22.jpg` | 3190 | AI In-Between | **Blade Eruption** — พลาสมาพุ่งระเบิดขยายออกจากใบดาบ |
| `ult-23.jpg` | 3340 | AI Keyframe | **Giant Laser Claymore** — ขยายเป็นดาบเลเซอร์ยักษ์สูงเท่าตึก |
| `ult-24.jpg` | 3530 | FX In-Between | ดาบยักษ์ชาร์จพลาสมาเต็มพิกัดก่อนฟาด |
| `ult-25.jpg` | 3660 | AI In-Between | **Claymore Downswing** — เหวี่ยงดาบยักษ์โค้งพลาสมาฟาดดิ่งลงสู่ประตูโทริอิ |
| `ult-26.jpg` | 3790 | AI Keyframe | **Impact Frame 1** — ขาว-ดำ-นีออน ฟาดผ่าเมือง (`cut: 1`, `vbeam: 1`) |
| `ult-27.jpg` | 3870 | FX Impact 2 | **Impact Frame 2** — สลับสีเนกาทีฟ 80ms คงสีไซอัน/มาเจนต้า (`cut: 1`) |
| `ult-28.jpg` | 3950 | AI Keyframe | **Orbital Shockwave** — เสาแสงระเบิด + ช็อกเวฟนีออน + ตัวเลขดาเมจ (`ring: 1`) |
| `ult-29.jpg` | 4130 | FX In-Between | คลื่นช็อกเวฟขยายสูงสุด |
| `ult-30.jpg` | 4310 | AI Keyframe | **Heroic Landing** — คุกเข่าข้างเดียวท่ามกลางควันนีออน |
| `ult-31.jpg` | 4510 | FX In-Between | ควันนีออนจางลงเตรียมลุกยืน |
| `ult-32.jpg` | 4670 | AI Keyframe | **Cool Finisher** — ยืนพาดดาบบนบ่า + น้องแมวหุ่นยนต์ |

---

## 3. งานที่เหลือ (User Request ล่าสุด)
ผู้ใช้แจ้งว่า:
> **"ตอนนี้ keyframe หลักๆ โอเครแล้ว แค่เจนภาพตรงรอยต่อ ระหว่างเฟรม"**

(รอบก่อนหน้าติดโควตา `gemini-3.1-flash-image` หมดชั่วคราว จึงยังไม่ได้เจน 4 จุดรอยต่อสุดท้าย)

### จุดรอยต่อที่ควรเจน AI Pixel Art เพิ่ม (เรียงตามความสำคัญ)
1. **รอยต่อ `ult-29 → ult-30` (`inb_smoke_descend`)** — *สำคัญสุด*
   - Reference: `art/ult-28.jpg`, `art/ult-30.jpg`
   - ภาพ: เสาแสงจางลงเป็นกลุ่มควันนีออนสีฟ้า-ม่วงและประกายไฟ ไอริณทิ้งตัวลงมาจากกลางอากาศท่างอขาเตรียมลงพื้นคุกเข่า ถือดาบเฉียงไปด้านหลัง
2. **รอยต่อ `ult-30 → ult-32` (`inb_rise_shoulder`)** — *สำคัญมาก (แทน `ult-31.jpg` หรือแทรกหลัง `ult-30`)*
   - Reference: `art/ult-30.jpg`, `art/ult-32.jpg`
   - ภาพ: ไอริณลุกขึ้นจากท่าคุกเข่า สะบัดดาบแสงไซอันขึ้นพาดบ่าพร้อมยิ้มมุมปาก น้องแมวหุ่นยนต์สีขาวบินพุ่งเข้ามาในเฟรมจากด้านขวา
3. **รอยต่อ `ult-07 → ult-08` (`inb_glint_to_sande`)**
   - Reference: `art/ult-07.jpg`, `art/ult-08.jpg`
   - ภาพ: ซูมเอาต์ความเร็วสูงจากโคลสอัพตาเรืองแสงสายฟ้า ไอริณย่อตัวเตรียมดีดออกพร้อมประกายสายฟ้าสีไซอัน-มาเจนต้าและเงา Sandevistan เริ่มแยกออกจากตัว
4. **รอยต่อ `ult-16 → ult-18` (`inb_grin_to_launch`)** — *(แทน `ult-17.jpg` หรือแทรกหลัง `ult-16`)*
   - Reference: `art/ult-16.jpg`, `art/ult-18.jpg`
   - ภาพ: ไอริณหมุนตัวดีดขาออกจากพื้นถนนแตกเป็นเศษหิน เริ่มหมุนเกลียวสายฟ้าไซอัน-มาเจนต้าพุ่งขึ้นฟ้าในมุมกล้องเงยต่ำ

*(ถ้าต้องการลื่นระดับสูงสุด สามารถทยอยเปลี่ยนเฟรมที่เป็น `FX In-Between` อย่าง `09`, `12`, `15`, `21`, `24`, `29` เป็นภาพ AI ที่เจนใหม่ทีละจุดได้เช่นกัน)*

---

## 4. สเปกตัวละคร & ลายเส้น (สำหรับใส่ใน Prompt เจนภาพ)
- **Style:** Crisp 16-bit anime pixel art cutscene frame, 16:9, neon cyberpunk Tokyo night (purple/indigo sky, electric cyan `#22d3ee`, hot magenta `#e879f9`, dark torii gate silhouette, glowing full moon, wet reflective pavement). No text, no UI.
- **Character (Airin / ไอริณ):** Short dark navy spiky hair with cyan `V` hairclip, glowing electric-cyan eyes, white cropped open-shoulder hoodie jacket with purple lining, black crop top with cyan `V` stripe, black cargo pants with belt & boots, fingerless gloves, glowing cyan-magenta energy katana.
- **Companion (เฟรมจบ):** Cute small floating white round cat-bot robot with glowing cyan eyes (ดู `art/ult-32.jpg`).

---

## 5. วิธีแทรกเฟรมใหม่ & ตรวจสอบ
```bash
# 1) แทรกเฟรมใหม่หลังหมายเลขเฟรมปัจจุบัน (1-based) — สคริปต์จะครอปเป็น 1376x768 JPEG และรันเลขให้อัตโนมัติ
python3 tools/ult_frames.py insert 29 path/to/inb_smoke_descend.jpg 30 path/to/inb_rise_shoulder.jpg

# 2) อัปเดต ULT_FRAMES (length), ULT_SEQ และ ULT_END_MS ใน index.html ตาม mapping ที่สคริปต์พิมพ์ออกมา

# 3) สร้าง GIF พรีวิว (อย่า commit ไฟล์ gif)
python3 tools/ult_frames.py gif /tmp/ult-preview.gif

# 4) ตรวจ syntax JS ใน index.html
python3 -c "import re,subprocess,tempfile; s=re.findall(r'<script>(.*?)</script>',open('index.html').read(),re.S)[0]; f=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False); f.write(s); f.close(); subprocess.check_call(['node','--check',f.name])"

# 5) ตรวจเทสต์คัตซีน (ใน tests/features-cdp.js ส่วน Ultimate) — เลขเฟรมฝังอยู่ ต้องขยับตามเฟรมที่แทรก
#    NF === 32 (จำนวนเฟรม) · waitFrame(26, …) + f10 >= 26 (Impact Frame 1 = ult-26) · waitFrame(30, …) + f13 >= 30 (Heroic Landing = ult-30)
#    เช่น แทรก 1 เฟรมหลัง 29 → NF 33, impact ยัง 26, landing กลายเป็น 31
node tests/features-cdp.js   # ต้องผ่าน 29/29
```

> **อัปเดต 2026-11-21 (Claude) — เจนรอยต่อแล้ว 32 → 37 เฟรม, `ULT_END_MS` 5760:** เลขเฟรมในตารางข้อ 2 เป็นของเดิม ปัจจุบัน: เดิม 01–07 = 01–07 · **ใหม่ 08** ย่อตัวฟาดดาบซูมออกจากตา · **ใหม่ 09** ร่างเงา 2 ร่างแรกแยก · เดิม 08–17 = 10–19 · **ใหม่ 20** ถีบพื้นแตกกระโดดหมุน · เดิม 18–29 = 21–32 (Impact = 29–30, ช็อกเวฟ = 31) · **ใหม่ 33** เสาแสงสลาย ทิ้งตัวลง · เดิม 30 = 34 (ลงพื้น) · **35 (แทนเดิม 31)** ลุกเหวี่ยงดาบโค้ง แมวหุ่นยนต์พุ่งเข้า · **ใหม่ 36** ดาบตกลงบ่า · เดิม 32 = 37 · เทสต์ `features-cdp.js`: NF 37, impact 29, landing 34 — ผ่าน 29/29 · ข้อ 3 (4 จุดรอยต่อ) เสร็จแล้ว

> **อัปเดต 2026-11-21 (`fec3483`, Claude):** เฟรม FX ที่เป็นแค่ฟิลเตอร์ของเฟรมก่อน (11, 14, 17, 19, 24, 27, 32 ตามเลขใหม่) เจน AI ใหม่ทั้งหมดแล้ว — เหลือแค่ 30 (Impact 2 เนกาทีฟ) ที่ตั้งใจเป็นฟิลเตอร์

> **อัปเดต 2026-11-21 (`fdf284b`, Claude) — 37 → 39 เฟรม, `ULT_END_MS` 5920:** แทรก AI in-between 2 เฟรมหลังเฟรม 11 — **ใหม่ 12** ถีบพื้นพุ่งขึ้น ร่างเงาสีรุ้งยืดเป็นเส้นแสง, **ใหม่ 13** กลางอากาศแตกเป็น 3 ร่าง · เดิม 12–37 = 14–39 (Impact = 31–32, ลงพื้น = 36) · เวลาตั้งแต่เฟรม 14 เลื่อน +160ms · เทสต์: NF 39, impact 31, landing 36 — ผ่าน 29/29

> **อัปเดต 2026-11-21 (`4d18260`, Claude) — 39 → 63 เฟรม, `ULT_END_MS` 6880:** แทรก AI in-between 24 เฟรม ส่วนละ ~5 (เปิดฉาก/ซูมตา · พุ่งแยกร่าง · ฟันไขว้/เกลียวขึ้นฟ้า · พระจันทร์/ดาบยักษ์/ฟาด · ควัน/ลงพื้น) หลังเลขเดิม 1,2,3,4,7,8,9,13,15,16,17,18,19,21,22,23,24,26,27,29,33,34,35,37 · Impact = 50–51 (0-based f50), ลงพื้น = f58 · เทสต์: NF 63, impact 50, landing 58 — ผ่าน 29/29 · ค้าง: ตอนลุกยืนท้ายคัตซีน (60→62) ยังกระโดด รอเจนเพิ่มหลังลิมิตรายวันรีเซ็ต

> **อัปเดต 2026-11-21 (Claude) — 63 → 65 เฟรม, `ULT_END_MS` 7160:** ตอนจบเจนเพิ่ม 2 เฟรม — **ใหม่ 62** ครึ่งลุกเหวี่ยงดาบขึ้นบ่า กล้องเข้าใกล้, **ใหม่ 64** พาดดาบบนบ่า ยิ้ม แมวหุ่นยนต์ลอยเข้า · เดิม 62 = 63, เดิม 63 = 65 · เทสต์ NF 65 (impact 50, landing 58 ไม่เปลี่ยน)

> **รอบ 3 (เจนแล้ว 2026-11-22 ดูบันทึกล่าง; เดิม: ชนลิมิตรายวันของ AI Studio 2026-11-21 ~20:40, รีเซ็ตราว 16 ชม.):** ผู้ใช้สั่ง "เจนเพิ่มทุกส่วน 5 เฟรม" อีกรอบ — 25 งานเตรียมไว้ใน `tools/ult_jobs/round3-65f.json` (`a`/`b` = เลขเฟรมปัจจุบันแบบ 65 เฟรม, `d` = คำบรรยายท่า, `n` = ชื่อไฟล์ผล) · เซิร์ฟเวอร์ `node tools/ult_jobs/serve.js <outdir> art` (GET `/ult-XX.jpg`, GET `/jobs.json` จาก outdir, POST `?n=` บันทึกผล) → คัด json ไปไว้ใน outdir ก่อน · ช่วงที่เลือก: เปิดฉาก 05-06, 06-07, 11-12, 12-13, 13-14 · พุ่งแยกร่าง 14-15, 17-18, 20-21, 23-24, 26-27 · ฟัน/ขึ้นฟ้า 27-28, 30-31, 32-33, 37-38, 40-41 · พระจันทร์/ดาบยักษ์ 42-43, 45-46, 47-48, 48-49, 49-50 · ลงพื้น 53-54, 55-56, 58-59, 60-61, 62-63 · ในหน้า AI Studio: `eval` ได้เฉพาะ top-level ของ javascript tool (Trusted Types บล็อก eval ในฟังก์ชันของหน้า) → เรียก `eval(localStorage.__gen); eval(localStorage.__grab); const j=(await (await fetch('http://127.0.0.1:8765/jobs.json')).json())[k]; await __gen(j.a,j.b,j.d,j.n)` แล้ว `await __grab()` หลัง ~60 วิ (โค้ด `__gen`/`__grab` อยู่ใน localStorage ของ aistudio.google.com — ถ้าหายให้ดูบันทึกเซสชันหรือเขียนใหม่ตามหลักใน HANDOFF)

> **อัปเดต 2026-11-22 (Claude) — 65 → 90 เฟรม, `ULT_END_MS` 7910:** เจน 25 งานใน `tools/ult_jobs/round3-65f.json` ครบ (แทรกหลังเลขเดิม 5,6,11,12,13,14,17,20,23,26,27,30,32,37,40,42,45,47,48,49,53,55,58,60,62) · 6 งาน (06-07, 11-12, 23-24, 32-33, 47-48, 62-63) รอบแรกได้ภาพเกือบซ้ำ → สั่งใหม่ด้วย prompt ที่ระบุมุมกล้อง/ขนาดตัวชัด ๆ + "must be clearly different" · เวลา: เฟรมใหม่กลางเพื่อนบ้าน +30ms/จุด · Impact = f70–71, ลงพื้น = f81 · เทสต์ผ่าน 29/29 · ⚠ ภาพรวม 25MB โหลดตอนเปิดหน้า

> **อัปเดต 2026-11-22 (Claude) — 90 → 112 เฟรม, `ULT_END_MS` 8350:** รอบ 4 จาก `tools/ult_jobs/round4-90f.json` ได้ 22/25 (แทรกหลังเลขแบบ 90 เฟรม 3,8,9,15,18,22,26,29,33,37,40,44,49,52,59,63,66,69,76,79,85,88) ก่อนชนลิมิต · ค้าง: 36-37, 73-74, 89-90 (เลขแบบ 90 เฟรม → ปัจจุบัน 45-46, 91-92, 111-112) · Impact = f88–89, ลงพื้น = f101 · เทสต์ผ่าน 29/29 · `ult_frames.py` รองรับเลข 3 หลักแล้ว · ภาพรวม 31MB โหลดตอนเปิดหน้า

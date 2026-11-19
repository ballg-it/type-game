# HANDOFF — Type Game (สถานะ ณ 2026-11-19 ค่ำ)

## ภาพรวม
เกมฝึกพิมพ์ **ต่อสู้ 1:1 + Roguelike + เนื้อเรื่องเบาๆ** รองรับไทย (เกษมณี) / อังกฤษ / สองภาษา — ไอเดียทั้งหมดอยู่ใน `README.md`
- ผู้ใช้สื่อสาร**ภาษาไทย** · ตอบเป็นภาษาไทย · ชอบให้ทำทีละระบบแล้วสรุปสั้นๆ พร้อมเสนอขั้นต่อไป
- รีโป `ballg-it/type-game` · branch **`ccr-a67b83da-eggwh5`** (push แล้ว, ไม่มี PR — ห้ามสร้าง PR ถ้าไม่ได้ขอ) · `main` มีแค่ต้นแบบแรก (SVG) — **อย่าทำงานบน main**
- เครื่องผู้ใช้ (Windows): โฟลเดอร์ `D:\1234` = local branch **`pixel-game`** (track `origin/ccr-a67b83da-eggwh5`) push ตรงกับ origin แล้ว (`git push origin pixel-game:ccr-a67b83da-eggwh5`; ข้อความ "Not enough memory resources" ตอน push มาจาก credential helper — push สำเร็จ) · มี session อื่นทำงานบน branch เดียวกันได้ (เช่น หน้า title `282bbcd`) → `git log` ก่อนแก้ และแก้ `index.html` ด้วยการแทนที่เฉพาะจุด
- branch อื่นบน origin: `claude/funny-meitner-f5fese` (**character sheet ต้นฉบับ** `art/airin/sheet-source.png` = ด้านหน้า/หลัง/สีหน้า/โดรนแมว/พาเลต และของเรย์ `art/rei/` + สไปรต์ที่ตัดจากชีต — แตกจาก main ไม่ได้รวม; ดึงไฟล์: `git show origin/claude/funny-meitner-f5fese:art/airin/sheet-source.png > ไฟล์.png`), `claude/practical-brown-ykaf3s` (ลิงก์ Pages, รวมใน ccr แล้ว)
- ไม่มี build step: เปิด `index.html` ได้เลย (ต้องมี `sprites.js` ข้างกัน)
- คอนเซ็ปต์อาร์ต (อยู่ในแชตเก่า ไม่อยู่ในรีโป): อนิเมะ โทนม่วงนีออน ไซเบอร์พังก์ผสมญี่ปุ่น (โทริอิ, โอนิ)

## ไฟล์
| ไฟล์ | คืออะไร |
|---|---|
| `index.html` | **ตัวเกมทั้งหมด** (~1900 บรรทัด HTML/CSS/JS ไฟล์เดียว) |
| `sprites.js` | เอนจินสไปรต์พิกเซล (ใช้ร่วมกับ `pixel.html`) |
| `pixel.html` | แกลเลอรีสไปรต์ + ฉากเดโม |
| `tests/*.js` | สคริปต์ Playwright จำลองการพิมพ์ (ดู “การทดสอบ”) · `tests/menu-cdp.js` = เทสต์หน้าเมนูที่ไม่ต้องใช้ Playwright |
| `art/title-bg.jpg`, `art/title-airin.png` | อาร์ตหน้าเมนู: ฉากเมืองนีออน 1920×1072 / ไอรินภาพปก+โดรนแมว+คีย์บอร์ด โปร่งใส 894×1200 (เจนจาก AI Studio) · ต้นฉบับพื้นเขียว `art/title-airin-green.png` ไม่ commit |
| `tools/key_art.py` | ตัดพื้นเขียวภาพเดี่ยว → PNG โปร่งใส ครอป+ย่อ (`python tools/key_art.py in.png out.png [สูงสุด=1200]`, ใช้ `key()` จาก key_frames.py) |
| `art/poses/airin-*.png` | 35 เฟรมพิกเซลไอริน พื้นโปร่งใส 176×152 (ดู “อาร์ตไอริน”) · ชีตต้นฉบับ `art/airin-pixel-sheet{,-2,-3}.png` (ไม่ commit, 6.8MB/ไฟล์) |
| `tools/key_frames.py` | ตัดพื้นเขียว+แยกเฟรมจากชีต AI Studio (`python tools/key_frames.py art/poses <ชีต1> <ชีต2> <ชีต3>`, ต้องมี Pillow+numpy) |
| `vendor/pixelfx.js` (+ `-LICENSE.txt`, `-NOTICE.md`) | เอฟเฟกต์ท่าจาก [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, @5294518) bundle เฉพาะ 7 ตัวที่ใช้ เป็น IIFE `window.PFX` โหลดด้วย `<script>` ธรรมดา |
| `tools/pixelfx-entry.js` | entry ของ bundle ข้างบน (วิธี build อยู่ในหัวไฟล์; ต้องมี checkout ของ pixelfx + esbuild) |
| `characters.html` | แบบร่าง SVG เก่า **ไม่ได้ใช้แล้ว** |
| `README.md` | เอกสารไอเดียเกม |

## วงจรของหนึ่งรัน (ทำเสร็จแล้วทั้งหมด)
เมนู → **แผนที่ 7 ชั้น** (เลือกทางโดยพิมพ์) → ไฟต์ / 💀 ศัตรูเก่ง / ❓ เหตุการณ์ / 🔥 จุดพัก / 🐱 ร้าน → ชนะไฟต์ = ได้เหรียญ + เลือกอัปเกรด → **ฉากเนื้อเรื่องก่อนบอส** → บอสราชินีวรรณยุกต์ → **ฉากจบ** (2 แบบ) → หน้าสรุป (+เศษคริสตัล 💎) → **ศาลเจ้า** อัปเกรดถาวร → รันใหม่
**หลักการ: ทุกการเลือกต้องพิมพ์คำ** (คลิกได้ด้วยเป็นทางสำรอง)

## `index.html` — โครงโค้ด
**หน้าเมนู (title screen, `#startScr`):** เต็มจอแบบหน้าเกม — ชั้นล่างขึ้นบน: `#titleBg` (canvas วาด `BG` จาก sprites.js = สำรอง) → `#titleArt` (`art/title-bg.jpg`, ขึ้นเมื่อโหลดได้ คลาส `.on`) → `#tsFx` ตัวอักษรนีออนลอย → `.ts-fade` ไล่มืดด้านซ้าย → ไอริน: `#heroArt` (`art/title-airin.png`; โหลดได้ = `#startScr.art` ซ่อน `.ts-hero`) หรือ `.ts-hero` canvas `#heroCv` ไอรินพิกเซลขยับเอง (`heroLoop` ใช้ `airinFrame`; หยุดเมื่อมีภาพปก) · ซ้าย: โลโก้ (`.logo` + ปุ่มคีย์ `.kcap` "ก") + `#menuList` ปุ่ม `.mi[data-m]` start/shrine/duel/help · ล่าง: `.ts-bar` สวิตช์ภาษา/ความยาก (ยังเป็น `.opts[data-group=mode|diff] .opt` เดิม เทสต์เก่าคลิกได้) · ขวาบน `#startMeta` ชิปสถิติ (`renderMetaBar`) · เลือกเมนู: ↑↓ (`menuSel`/`MSEL`) + Enter (`menuGo`) หรือพิมพ์คำ (`MENU()` = `เริ่ม/go`, `ศาล/shrine`, `ดวล/duel`, `วิธีเล่น/help`; รับทั้งสองภาษา แสดงตาม `metaLang()`; `menuInput`/`renderMenu` ไฮไลต์ `.lock`/`.off`, พิมพ์ผิด = เขย่า) · "วิธีเล่น" = `#helpBox` การ์ดกติกา 10 ข้อ (`showHelp`, `HELP`, `#startScr.helpOn`) ปิดด้วย Esc/Enter/พิมพ์ `กลับ`/`back` · หน้าสรุปผล (`phase='result'`) ยังใช้ `menuInput` แต่รับแค่ shrine/duel และ Enter = เริ่มรันใหม่

**State:** `R` รัน (HP ต่อเนื่อง, `R.mod` อัปเกรด, `R.coins`, `R.map`/`R.at`/`R.trail`, สถิติ) · `S` ไฟต์ปัจจุบัน · `FOE` ศัตรู (สำเนาที่สเกลแล้วจาก `makeFoe`) · `META` เซฟถาวร · `PK` การ์ดอัปเกรด · `SHOP` ร้าน · `CH` หน้าตัวเลือก · `ST` ฉากเนื้อเรื่อง
**`phase`:** `menu | fight | pick | shop | shopExit | choice | story | meta | pvp | busy | result` — `onInput()` และ keydown แยกตาม phase · `busy` = ล็อกการพิมพ์ช่วงเปลี่ยนหน้า (หลังจบไฟต์จนหน้าใหม่ขึ้น)

**Flow:** `startRun()` → `genMap()` → `enterNode(nd)`
- ไฟต์/elite: `startFight()` → `endFight(win)` → `showPick()` → `choose()` → `showMap()`
- บอส: `showStory(nd)` → `endStory()` → `startFight()` → ชนะ → `showEnding()` → `endStory()` → `showResult(true)`
- shop: `showShop()` → `ออก` → `showMap()` · rest: `showRest()` · event: `showEvent()` (ทั้งสองใช้ `showChoice`)

**ระบบ**
- **ไฟต์:** 3 ช่องคำ (เร็ว/กลาง/แรง) `atkDmg()` = (3+ยาว×2.2)×คอมโบ×เหนื่อย×mod; ศัตรูชาร์จ → พิมพ์คำกัน, กันช่วงท้าย (`counterWin()`) = สวนกลับ; คอมโบ +0.1/คำ; **Tab** ท่าไม้ตาย; Stamina หมด ×0.5; `DIFF` ง่าย/ปกติ/ยาก
- **เทียบคำไทย:** `clusters`/`match`/`expectedNext` — สลับลำดับวรรณยุกต์/สระบน-ล่างในกลุ่มได้; พิมพ์ผิดภาษาแป้น → เตือน ไม่นับผิด
- **`ENEMIES`:** 🔨 โจรค้อนคีย์ (แถวบน, HP 110) · 👻 ภูตตัวเลข (เลขไทย/ตัวเลข, 120) · 👹 โอนิดาบแดง (Shift/ตัวใหญ่, 150) · 👑 ราชินีวรรณยุกต์ บอส (วรรณยุกต์, คำกันเอง `def`, HP<ครึ่ง = โกรธ, 230)
- **แผนที่:** `MAP_LAYERS`=7; ชั้น1 ไฟต์ (ไปได้ทุกทาง) · ชั้น2–5 สุ่ม 2–3 จุด · ชั้น6 พัก+ร้าน · ชั้น7 บอส; เส้นไม่ตัดกัน ทุกจุดมีทางเข้า; ศัตรูตามชั้น (ต้น: โจร/ภูต, ท้าย: ภูต/โอนิ), HP +7%/ชั้น; elite HP×1.25 ดาเมจ×1.2 เหรียญ+15 การ์ด+1; `mapSVG()`, `trailHTML()`
- **หน้าตัวเลือกกลาง** `showChoice({title, sub, opts, map})`: option มี `word` (สตริง+`lang` หรือ `{th,en}`), `cond`, `fn` (คืน `'pick'` = เปิดหน้าอัปเกรดแบบฝึก)
- **จุดพัก:** `พัก` ฟื้น 35% / `ฝึก` เลือกอัปเกรด · **`EVENTS`:** หีบสมบัติ, ศาลพระภูมิ (HP −15% → อัปเกรดสุ่ม), แมวจรจัด (15🪙 → โล่+HP10), บ่อน้ำพุร้อน (ฟื้น 25% / HP สูงสุด +8); ทุกอันมี `ผ่าน`
- **อัปเกรด:** ชนะแล้วฟื้น 15% (`HEAL_BETWEEN`) แล้วเลือกจาก `UPGRADES` (11 แบบ) + `letterUpgrade()`; `upPool()`/`randomUp()`/`applyUp()`
- **เหรียญ + ร้าน:** `fightCoins()` (ฐาน 12 + ความแม่น + คอมโบ/2 + สวนกลับ×3 + elite/boss); ร้าน: อัปเกรด 3 ชิ้น (40/once 50) + ชาไทยฟื้น 40% (20), พิมพ์ชื่อสัตว์ (`SHOP_WORDS`) เพื่อซื้อ, `สุ่ม`/`roll` (10, +5), `ออก`/`go`; สไปรต์เหมียวมิ `drawShopCat`
- **ศาลเจ้า (แต้มถาวร):** `META` ใน localStorage `typegame.meta.v1` (`loadMeta`/`saveMeta` มี try/catch) — `shards, lv, runs, wins, best, total, story, endings`; `runShards()` = ไฟต์ที่ชนะ×6 + เหรียญ/4 + พิชิต 25; `PERKS` 7 แบบ ราคา `cost×(lv+1)`, ใช้ผ่าน `lv(id)`; เข้าโดยพิมพ์ `ศาล`/`shrine` ที่เมนู/หน้าสรุป
- **ฉากเนื้อเรื่อง (`ST`):** `storyScript()` ก่อนบอส / `endingScript()` ฉากจบ — บรรทัด `{who, t}` (NPC: พิมพ์ทีละตัว, Enter/คลิก ไปต่อ) · `{who:'me', say:{th,en}}` (ต้องพิมพ์) · `{who:'me', choice:[{…, bonus|ending, then:[บรรทัด]}]}`; ฟิลด์เสริม `e`/`p` = ท่าศัตรู/ผู้เล่น, `fx:'glyphs'` = วรรณยุกต์ทองลอย (`risingGlyphs`); Esc ข้ามไปตัวเลือก; บทเปลี่ยนตามสถานะ (เคยชนะ/เลือดต่ำ/อัปเกรดเยอะ/ใช้ขนนก); ก่อนบอสได้โบนัส `R.storyBonus` (ใจกล้า: ult+50% / ใจเย็น: โล่); ฉากจบ 🤝 มิตรภาพ / 🔒 ผู้พิทักษ์ บันทึกใน `META.endings`
- **PvP ดวลออนไลน์ (`PV`, `PVP`):** PeerJS 1.5.4 โหลดจาก unpkg ตอนกดเข้าเท่านั้น (`pvLoad`, ใช้เซิร์ฟเวอร์จับคู่ฟรีของ PeerJS) · เข้าจากเมนูพิมพ์ `ดวล`/`duel` · `pvStep(home|loading|wait|join|connecting|over)` หน้าเดียว `#pvpScr` พิมพ์เลือกเหมือนหน้าอื่น · รหัสห้อง = 3 คำจาก `PV_CODE` (16 สัตว์ พิมพ์ไทยหรืออังกฤษก็ได้, peer id `typegame-duel-v1-a-b-c`), ลิงก์เชิญ `#duel=a-b-c` เข้าห้องอัตโนมัติ · **แต่ละฝั่งเป็นเจ้าของเลือดตัวเอง**: ตีเบา/กลาง/สวนกลับ/ท่าไม้ตาย → `dealDamage` → `pvDeal` ส่ง `hit`; คำแรง → `pvHeavy` ส่ง `hv` ไปเข้าคิว `S.pvQ` อีกฝั่ง → ใช้ระบบชาร์จ/กันเดิม (`enemyStartCharge`/`block`/`enemyHit`) แล้วตอบ `blk`/`land`; ปล่อยท่าหนักได้ทีละลูก (`pvBusy`); `st` ทุก 150ms ซิงก์เลือด/ult/คอมโบ; แพ้ส่ง `ko`, หลุด = ชนะโดยปริยาย, `again` ทั้งคู่ = รีแมตช์ (host ส่ง `go` → นับถอยหลัง) · กติกา: HP 500 เท่ากัน ไม่มีอัปเกรด/perk, คอมโบคูณสูงสุด ×2, ท่าหนัก ×1.4 ชาร์จ 2.4 วิ, ตีเบาไม่ทำคอมโบอีกฝั่งหลุด (ท่าหนักโดนเต็ม/สวนกลับ/ท่าไม้ตาย = หลุด), ไม่มีหยุดเกม · ต่างคนเลือกภาษาเองได้ · โค้ดเดิมแยกด้วย `R.pvp`
- **ฉากพิกเซล:** canvas `#stage` 640×360; `FIG.P`/`FIG.E` + `play(fig, state)`; ดาเมจที่ `HIT_DELAY` 180ms; `drawStage()` วาดทุกอย่าง (เสี้ยวฟัน `ARC`, ฝุ่น, คีย์บอท, ออร่า, วรรณยุกต์ราชินี); `placeFighter()` วางกล่องล่องหนให้ตัวเลขดาเมจลอยถูกที่; จอกว้าง cover / จอแคบ contain
- **เฟรมไอรินพิกเซล (AI):** 35 เฟรมโปร่งใส `art/poses/airin-<ท่า>.png` (idle×3, attack×6, block×4, hurt×5, charge×4, ult×7, win×6) จาก 3 ชีต 6×3 ที่ Gemini เจนบนพื้นเขียว (ชีต 2 = เฟรมแทรก `-0`/`-1b`/`-2b`/`-4` ฯลฯ; ชีต 3 = ท่าตั้งรับด้านข้าง ใช้ช่องแถว 2 คอลัมน์ 3; ชื่อตาม `SHEETS` ใน `tools/key_frames.py`) · **idle** ไม่ใช้เฟรมหายใจจาก AI (ดาบหาย/หน้าเปลี่ยนทำให้สั่น) แต่สร้าง idle-1..3 จากท่าตั้งรับเดียว: ช่วงบนเหนือสะโพก+ทั้งดาบเลื่อนลง 0/1/2px ขาอยู่กับที่ วน 1→2→3→2 · สคริปต์หาท่าจากช่องเขียว แยกชิ้นที่ต่อกันไม่ให้ดาบข้ามเฟรม ย่อให้ idle สูง 118px แล้ววางบนผืนเดียวกัน พิมพ์ค่า `AIRIN_FIT` · ฉากวาดที่ 30fps เมื่อมีเฟรม (สไปรต์ศัตรูยังก้าวที่ `FPS` 15) และวาด 1:1 ไม่ smoothing · `drawAirinArt` เพิ่มการเคลื่อนตัวแบบ ease: พุ่ง 16px ตอนตี, กระโดด/พุ่ง 34px ตอนท่าไม้ตาย · ไทม์ไลน์ใน `AIRIN_ANIM` (เฟรมที่โหลดไม่ขึ้นจะข้ามไป) · `ult` (กำลังพิมพ์) = ชาร์จวนลูป, โดนท่าไม้ตาย (`airinUltAt`) เล่น ult-0→4 ใน 0.9 วิ, `ko` ค้าง hurt-2 · ไม่มีไฟล์ = ใช้สไปรต์โค้ดเหมือนเดิม
- **เอฟเฟกต์ท่า (pixelfx):** `stageFx()` ใน `drawStage` (เฉพาะตอนใช้เฟรมวาด) ยิงเอฟเฟกต์ตามสถานะไอริน ไม่แตะลอจิกเกม: ตี = sword-slash ม่วง + hit-spark ที่ศัตรู (ถ้าศัตรูไม่กัน) · กัน = shield-block · โดนตี = hit-spark กลับด้าน · พิมพ์ท่าไม้ตาย = spell-charge วน · ท่าไม้ตายโดน = slash ใหญ่ + crit-hit + impact-frame + ground-slam (ตัดที่ 1.3 วิ) · วาดบนเลเยอร์ 214×120 (= ฉาก ÷3 ให้ไอริน ~39px เท่าฮีโร่ 38px ของ pixelfx) แล้วขยาย ×3 · ไม่มีไฟล์ vendor = ไม่มีเอฟเฟกต์ · ศัตรูยังใช้ `slashArc` เดิม

**กับดักที่เคยเจอ (อย่าทำซ้ำ)**
- ห้ามตั้งชื่อตัวแปร global ซ้ำกับ `sprites.js` (เช่น `SH`, `SW`, `U`, `FPS`, `MARKS`, `GKO`) — สคริปต์คลาสสิกแชร์ scope
- หลัง `endFight` ต้องอยู่ `phase='busy'` จน `showPick`/`showEnding`/`showResult` ตั้ง phase เอง (ไม่งั้นพิมพ์ทันการ์ดเก่า / Enter เริ่มรันซ้อน)
- ท่าโดนตีของศัตรูใช้ `hurtE()` (ไม่ทับท่า `ko`); KO เล่นที่ 380ms หลังทุกเฟรมโดนตี
- คำบนการ์ดใช้ตัวอักษรแรกไม่ซ้ำกันในหน้าเดียว (กันพิมพ์กำกวม)
- overlay ที่ตั้ง `display` เอง (เช่น `#startScr{display:block}`) ต้องมี `[hidden]{display:none}` คู่กัน ไม่งั้น `hidden` ไม่ซ่อนและบังไฟต์ (เทสต์ที่เช็กแค่ `.hidden` จับไม่ได้ — เช็ก `offsetParent`/ภาพหน้าจอด้วย)
- คำของเมนู/การ์ดในหน้าเดียวกันต้องขึ้นต้นต่างกันในแต่ละภาษา (อังกฤษ: go/shrine/duel/help)

## `sprites.js`
`Px` บัฟเฟอร์พิกเซล · `U=2` · สไปรต์ 160×148 สะโพก (80,96) · 15 fps · `makeRig` + ท่า `PO` + `FIGHTER`/`ANIMS` · `renderChar(id, state, t, gt)` → `{px, pose}` · `CHARS`: `airin`, `oni`, `queen`, `cat`, `robo`, `bandit`, `ghost` · `drawBG()`, `drawGlyphs()`
ข้อจำกัด: เท้าไถล, bandit ใช้ท่าชุดโอนิ, แขนภูตแทบมองไม่เห็น

## เล่นผ่านเว็บ (GitHub Pages)
ไม่มี build: Settings → Pages → Source "Deploy from a branch" → branch `ccr-a67b83da-eggwh5` โฟลเดอร์ `/ (root)` (มี `.nojekyll` แล้ว) — รีโปเป็น private ต้องเปลี่ยนเป็น public หรือมี GitHub Pro ก่อน · ลิงก์จะเป็น `https://ballg-it.github.io/type-game/` · หน้า Artifact ของ claude.ai ใช้ PvP ไม่ได้ (บล็อก WebRTC/WebSocket) · PeerJS โหลด unpkg ก่อน ไม่ได้ค่อยลอง jsDelivr

## การทดสอบ
`cd tests && node run.js th` (หรือ `en`/`bi`) — Playwright จำลองการพิมพ์เล่นจบรันบนแผนที่สุ่ม (ร้าน/เหตุการณ์/ฉาก/บอส); ไฟล์อื่น: `bugs.js` (บั๊กที่แก้แล้ว 3 ข้อ), `story.js`, `ending.js`, `ev.js` (เหตุการณ์+จุดพัก), `meta.js` (ศาลเจ้า+localStorage+ขนนก), `pvp.js [modeA] [modeB]` (2 หน้าต่อกันผ่าน Peer ปลอมบน BroadcastChannel + http server ในตัว: สร้าง/ผิดรหัส/Backspace/ไฟต์/รีแมตช์/หลุดกลางไฟต์) — ทุกตัวต้องได้ `errors []` (ภาพ .png ลงในโฟลเดอร์ที่รัน อย่า commit)
**เครื่องผู้ใช้ไม่มี Playwright** (ชุดข้างบนรันใน container เก่า) → `node tests/menu-cdp.js` สั่ง Chrome ผ่าน DevTools protocol ตรง (Node 22+, 20 ข้อ: พิมพ์/ลูกศร/Esc/อังกฤษ/เริ่มรัน/ภาพปก, ต้องได้ `errors []`) · ถ่ายภาพหน้าจอ: `chrome --headless=new --allow-file-access-from-files --window-size=1280,800 --screenshot=out.png file:///D:/1234/index.html` (headless กว้างต่ำสุด 500px — ดูมือถือให้ครอบ iframe กว้าง 390) · preview pane ในแอปมักโหลด localhost ไม่ขึ้น (policy check) และ bash ต่อ preview server ไม่ได้ → ใช้ file:// แทน
**ยังไม่ได้ทดสอบ:** PvP ผ่านเน็ตจริง (container นี้ต่อ unpkg/peerjs ไม่ได้ — ต้องเปิดผ่าน http(s) หรือไฟล์ก็ได้แต่ต้องมีเน็ต; เครือข่ายบางที่ที่ NAT เข้มอาจต่อไม่ติดเพราะไม่มี TURN), คีย์บอร์ดไทยจริง (ห่วงเลขไทยที่ต้อง Shift), **บาลานซ์ตัวเลข** (รันยาว 4–6 ไฟต์+บอส, บอทพิมพ์แม่นได้ ~70–80🪙 ต่อร้าน, ซื้อศาลครบ ~840💎 ≈ 10–15 รัน)

## อาร์ตไอริน (AI Studio) — วิธีทำ + กับดัก
- **เจน:** Google AI Studio ใน Chrome ของผู้ใช้ (ล็อกอินแล้ว) · Nano Banana 2.1 · 16:9 · 2K · ปิด Grounding · แชตพิกเซล `aistudio.google.com/prompts/1PAfI2gyKjXoEAYrflHYqnaLwqb8EbgIH` (แนบชีตพิกเซลอ้างอิงไว้แล้ว) · พรอมต์: ชีต 6×3, หันขวา, ฐานเท้าเดียวกัน, เว้นที่ว่างกว้างระหว่างท่า, พื้น #00FF00, ไม่มีกริด/ตัวหนังสือ/แมวโดรน + รายชื่อเฟรมทีละแถว · ส่งด้วย Enter หรือปุ่ม Run · ~40 วิ/ชีต
- **`GEMINI_API_KEY` ในเครื่องใช้ไม่ได้** (401) · Canva generate-image ติดโควตาบ่อย และได้แค่ thumbnail 200px (ลิงก์เต็มขนาดติด signature; export ต้องสร้าง design ซึ่งก็ติดโควตา)
- **แชตพิกเซลเดิมหนักจนโหลดไม่ขึ้นแล้ว** → เปิด `aistudio.google.com/prompts/new_chat` ใหม่ (มี dialog ต้อนรับให้ปิด) ตั้ง Aspect/Resolution ทุกแชต (ค่าเริ่ม Auto/1K) แนบรูปอ้างอิงด้วย `file_upload` ที่ `input[type=file]` · บางช่วงขึ้น "Model isn't available right now" (Rerun ซ้ำก็ไม่ผ่าน ต้องรอ) หรือคิดนาน ~6 นาที · ภาพเป็น blob JPEG (2K: 16:9 = 2752×1536, 3:4 = 1792×2400)
- **อาร์ตหน้าเมนู (ทำแล้ว):** ฉาก = พรอมต์ข้อความล้วน 16:9 (เมืองไซเบอร์พังก์ญี่ปุ่นพิกเซล ม่วงนีออน พระจันทร์ขวาบน โทริอิ พื้นเปียก ซ้ายมืดไว้วางเมนู ไม่มีคน/ตัวหนังสือ) ย่อเป็น JPG 1920 · ไอรินภาพปก = แนบ `sheet-source.png` + พรอมต์ 3:4 key art ปกเกม พิกเซลอนิเมะละเอียด ยื่นมือหาคนดู คีย์บอร์ดเรืองแสงด้านหน้า โดรนแมวขวาบน พื้น #00FF00 → `key_art.py` · ผู้ใช้ชอบสไตล์ภาพปกเกม (อนิเมะตัวใหญ่ + คีย์บอร์ด + โดรนแมว) — **ใช้ character sheet เป็นอ้างอิงตัวละครเสมอ**
- **เอาภาพออก:** รายการแชตเป็น virtual list (turn นอกจอไม่มี img/text) → เลื่อน `scrollIntoView` ทีละ turn แล้วคัด blob img ลง canvas ใน `window.__fr` · ดาวน์โหลดด้วย `<a download>` ได้ แต่ Chrome ตั้ง “ถามที่เก็บทุกครั้ง” → **ผู้ใช้ต้องกด Save เอง** (ค่าเริ่มต้นไป `D:\1234\art`) — รวมทุกเฟรมเป็นชีตเดียวให้กด Save ครั้งเดียว · fetch ไป localhost ถูกบล็อก
- **ในเกม:** ดู `AIRIN_FRAMES`/`AIRIN_ANIM`/`AIRIN_FIT`/`drawAirinArt` (สรุปในหัวข้อฉากพิกเซลด้านบน) · ทดสอบ: `python -m http.server` แล้วเปิดผ่าน http (เปิด file:// ใน preview pane โหลด `sprites.js` ไม่ได้) · ใน console: `startRun()` เข้าไฟต์เร็ว (ตอนนี้มีหน้า title ซ้อนอยู่ — `startRun` ซ่อนให้) · pane ซ่อน/RAF ช้า: เดินเวลาเองด้วย `stageTick(1/30); drawStage()` วนลูป · บิลด์เอฟเฟกต์ใหม่: clone pixelfx ลง scratchpad, `npm i esbuild@0.25.10` ในโฟลเดอร์แยก, copy `tools/pixelfx-entry.js` ไปที่ราก checkout แล้วรันคำสั่งในหัวไฟล์ (เติม header ไลเซนส์กลับด้วย)
- **ข้อจำกัด:** เฟรมแทรกบางคู่แทบเหมือนเดิม (attack-1/1b, attack-2/2b, ult-1/1b) · พิกเซลจาก AI ไม่ลงกริดจริง · ศัตรู/บอสยังเป็นสไปรต์โค้ด รายละเอียดน้อยกว่าไอริน
- ชีตต้นฉบับ `art/airin-pixel-sheet{,-2,-3}.png` untracked ตั้งใจ (ใหญ่) · `art/pixel/` (untracked, ไม่ใช่งานจากเซสชันนี้ — มี `airin-chibi-400.png`, ไฟล์ `_diff_*`) ยังไม่ได้ตรวจ/commit · `.claude/launch.json` (server เทส) ไม่ commit

## ขั้นต่อไปที่เป็นไปได้ (รอผู้ใช้เลือก — แนะนำข้อ 1 ก่อน)
0. **อาร์ต/เอฟเฟกต์:** ศัตรูยังใช้ `slashArc` เดิม → ใส่ pixelfx ให้ศัตรูด้วยสีตาม `ARC[id]` (เพิ่มเอฟเฟกต์ใน `tools/pixelfx-entry.js` แล้วบิลด์ใหม่) · เจนศัตรู/บอสในแชต AI Studio ใหม่ (แชตพิกเซลเดิมโหลดไม่ขึ้นแล้ว) แนบ character sheet/สไปรต์ไอรินเป็นอ้างอิงให้สไตล์ตรงกัน · ถ้าอยากลื่นกว่านี้: เจนชีตเฟรมแทรกที่ต่างจากเฟรมหลักชัดเจนขึ้น · idle อาจเพิ่มประกายที่ใบดาบ
1. ผู้ใช้เล่นจริง → บาลานซ์ HP/ดาเมจ/ราคา/เหรียญ
2. เนื้อหาเพิ่ม: บทก่อน elite, ฉากจบลับ, เหตุการณ์มินิเกมพิมพ์จับเวลา, ของพิเศษในร้าน, ปุ่มรีเซ็ตเซฟ
3. หลายองก์ / บอสใหม่ (README: กระจก/ล่องหน/สลับแป้น/แฝด) — ฉากจบ “ครั้งแรก” ปูไว้แล้วว่ายังมีแป้นพิมพ์อื่นรออยู่
4. สไปรต์: ล็อกเท้า, ท่าเฉพาะโจร/ภูต, นักสู้สายอื่น
5. ระบบใน README ที่ยังไม่ทำ: ธาตุ, คำหลอก, โหมด Endless/ครู/PvP

## บั๊กที่รู้แล้วแต่ยังไม่แก้
- PvP: กด Backspace (`pvBack`) ที่หน้าแรกของดวล ยังค้าง `phase='pvp'` ไม่กลับเมนู (มีอยู่ก่อนหน้าเมนูใหม่)

## ยังไม่ได้กำหนด
ตัวเลขบาลานซ์, วิธีนับ WPM ภาษาไทย, รายการคำศัพท์จริง, ค่าพลังนักสู้สายอื่น, engine สุดท้าย (ตอนนี้ HTML/JS ล้วน, Phaser ไว้พิจารณา), กลุ่มเป้าหมาย

'use strict';
/* Type Game — pixel sprite engine (ใช้ร่วมกันระหว่าง index.html และ pixel.html) */
/* =================== Pixel buffer =================== */
const OUT = '#120a24';
const rgbCache = new Map();
function rgba(c) {
  let v = rgbCache.get(c); if (v) return v;
  const h = c.slice(1);
  v = [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), h.length > 6 ? parseInt(h.slice(6,8),16) : 255];
  rgbCache.set(c, v); return v;
}
class Px {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.a[y * this.w + x] = c; }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.a[y * this.w + x]; }
  disc(cx, cy, r, c) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = x + .5 - cx, dy = y + .5 - cy; if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
    }
  }
  line(a, b, r, c) {
    const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1e-6;
    for (let y = Math.floor(Math.min(a.y, b.y) - r - 1); y <= Math.max(a.y, b.y) + r + 1; y++)
      for (let x = Math.floor(Math.min(a.x, b.x) - r - 1); x <= Math.max(a.x, b.x) + r + 1; x++) {
        const px = x + .5 - a.x, py = y + .5 - a.y;
        const t = Math.max(0, Math.min(1, (px * vx + py * vy) / L));
        const dx = px - t * vx, dy = py - t * vy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
  }
  taper(a, b, r1, r2, c) {
    const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy || 1e-6, R = Math.max(r1, r2);
    for (let y = Math.floor(Math.min(a.y, b.y) - R - 1); y <= Math.max(a.y, b.y) + R + 1; y++)
      for (let x = Math.floor(Math.min(a.x, b.x) - R - 1); x <= Math.max(a.x, b.x) + R + 1; x++) {
        const px = x + .5 - a.x, py = y + .5 - a.y;
        const t = Math.max(0, Math.min(1, (px * vx + py * vy) / L));
        const dx = px - t * vx, dy = py - t * vy, r = r1 + (r2 - r1) * t;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
  }
  poly(pts, c) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        const X = x + .5, Y = y + .5; let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const a = pts[i], b = pts[j];
          if ((a.y > Y) !== (b.y > Y) && X < (b.x - a.x) * (Y - a.y) / (b.y - a.y) + a.x) ins = !ins;
        }
        if (ins) this.set(x, y, c);
      }
  }
  blit(rows, ox, oy, pal) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { const c = pal[ch]; if (c) this.set(ox + i, oy + j, c); }));
  }
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.a[y * this.w + x]) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * this.w + x);
    }
    for (const i of add) this.a[i] = c;
  }
  fillAll(c) { for (let i = 0; i < this.a.length; i++) if (this.a[i]) this.a[i] = c; }
  toCanvas(cv) {
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.a.length; i++) { const c = this.a[i]; if (c) img.data.set(rgba(c), i * 4); }
    ctx.putImageData(img, 0, 0); return cv;
  }
}

/* =================== Rig (ความละเอียด 2 เท่า: ท่าเขียนเป็นหน่วยเดิม แล้วคูณ U) =================== */
const U = 2;
const SW = 160, SH = 148, HX = 80, HY = 96;   // ขนาดสไปรต์และตำแหน่งสะโพก
const D2R = Math.PI / 180;
const vdir = d => ({ x: -Math.sin(d * D2R), y: Math.cos(d * D2R) });
const add = (p, x, y) => ({ x: p.x + x, y: p.y + y });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function limb(s, a1, a2, l1, l2) {
  const d1 = vdir(a1), e = { x: s.x + d1.x * l1, y: s.y + d1.y * l1 };
  const d2 = vdir(a1 + a2), h = { x: e.x + d2.x * l2, y: e.y + d2.y * l2 };
  return { s, e, h, ang: a1 + a2, dir: d2 };
}
function makeRig(p) {
  const hip = { x: HX + p.dx * U, y: HY + p.dy * U }, L = p.lean * D2R, cs = Math.cos(L), sn = Math.sin(L);
  // T(x, y): จุดบนลำตัวในหน่วยเดิม (เอียงตาม lean) → พิกเซลจริง
  const T = (rx, ry, upper = true) => { ry += upper ? p.by : 0; rx *= U; ry *= U; return { x: hip.x + rx * cs - ry * sn, y: hip.y + rx * sn + ry * cs }; };
  const r = { hip, T };
  r.ba = limb(T(-4, -16), p.ba[0] + p.lean, p.ba[1], 8 * U, 8 * U);
  r.fa = limb(T(4, -16), p.fa[0] + p.lean, p.fa[1], 8 * U, 8 * U);
  r.bl = limb({ x: hip.x - 2.5 * U, y: hip.y }, p.bl[0], p.bl[1], 10 * U, 11 * U);
  r.fl = limb({ x: hip.x + 2.5 * U, y: hip.y }, p.fl[0], p.fl[1], 10 * U, 11 * U);
  r.neck = T(0, -18);
  r.hc = { x: Math.round(r.neck.x + 2 + p.head * U), y: Math.round(r.neck.y - 14) };   // จุดกลางหัว
  r.sway = (p.sway || 0) * U;
  return r;
}
const LIT = { x: .9, y: -1.1 };   // แสงมาจากด้านหน้า-บน
// ชิ้นเรียว: สีเงาเต็มชิ้น แล้วทับด้วยสีสว่างเลื่อนไปทางแสง → เหลือขอบเงาด้านหลัง-ล่าง
function shade(px, a, b, r1, r2, cl, cd) {
  px.taper(a, b, r1, r2, cd);
  px.taper(add(a, LIT.x, LIT.y), add(b, LIT.x, LIT.y), Math.max(.6, r1 - 1.4), Math.max(.6, r2 - 1.4), cl);
}
function arm(px, l, w, cl, cd, hand, handD) {
  shade(px, l.s, l.e, w, w * .86, cl, cd);
  shade(px, l.e, l.h, w * .86, w * .7, cl, cd);
  if (hand) { const h = add(l.h, l.dir.x * 2.4, l.dir.y * 2.4); px.disc(h.x, h.y, 3.4, handD || hand); px.disc(h.x + .8, h.y - .8, 2.3, hand); }
}
function leg(px, l, o) {
  const th = o.th || 5.4, kn = o.kn || 4, an = o.an || 3.2;
  shade(px, l.s, l.e, th, kn, o.c, o.d);
  shade(px, l.e, l.h, kn, an, o.c, o.d);
  const bc = o.boot || o.c, bd = o.bootD || o.d;
  if (o.boot && o.bootAt !== false) shade(px, lerp(l.e, l.h, o.bootAt ?? .35), l.h, kn + .7, an + .7, bc, bd);
  const h = l.h, f = o.foot ?? 8;
  px.poly([add(h, -3.6, -2.4), add(h, 3, -3.2), add(h, f, .2), add(h, f + .8, 3.6), add(h, -3.8, 3.6)], bc);
  px.line(add(h, -3.4, 3.1), add(h, f + .4, 3.1), .7, bd);
}
// สายรัดพาดขวางท่อนขา/แขน
function strap(px, l, t, half, w, c) {
  const q = lerp(l.e, l.h, t), dx = l.h.x - l.e.x, dy = l.h.y - l.e.y, m = Math.hypot(dx, dy) || 1;
  px.line({ x: q.x - dy / m * half, y: q.y + dx / m * half }, { x: q.x + dy / m * half, y: q.y - dx / m * half }, w, c);
}
// แขนเสื้อกิโมโนห้อยลงตามแรงโน้มถ่วง (มีซับในสีตัดที่ขอบ)
function drape(px, l, c, cd, len, lining) {
  const a = lerp(l.e, l.h, .05), b = lerp(l.e, l.h, .85);
  px.poly([a, b, add(b, 1, len * .6), add(a, -2, len)], c);
  px.poly([add(a, -1, len * .55), add(b, .5, len * .35), add(b, 1, len * .6), add(a, -2, len)], cd);
  if (lining) px.line(add(a, -2, len), add(b, 1, len * .6), .8, lining);
}
const rect = (px, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set(x + i, y + j, c); };
function spike(px, a, b, w, c) {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  px.poly([{ x: a.x + nx, y: a.y + ny }, { x: a.x - nx, y: a.y - ny }, b], c);
}

/* =================== Poses =================== */
const BASE = { dx: 0, dy: 0, by: 0, lean: 0, head: 0, travel: 0, smear: 0 };
const PO = {
  idleA:   { lean: 4,  fa: [-40, -100], ba: [-20, -110], fl: [-16, 18], bl: [16, 10] },
  idleB:   { lean: 5,  by: 1, dy: .6, fa: [-34, -106], ba: [-16, -114], fl: [-16, 20], bl: [16, 12] },
  windup:  { dx: -3, dy: 1, lean: -8, head: -1, fa: [-8, -135], ba: [-35, -95], fl: [-12, 22], bl: [20, 14], travel: -.06 },
  strike:  { dx: 8, dy: 1, lean: 14, fa: [-94, -4], ba: [25, -95], fl: [-36, 24], bl: [30, 4], travel: 1, smear: 1 },
  strikeF: { dx: 9, dy: 1, lean: 16, fa: [-98, 0], ba: [32, -88], fl: [-38, 26], bl: [32, 4], travel: 1 },
  block:   { dx: -3, dy: 2, lean: -4, head: -1, fa: [-62, -128], ba: [-48, -122], fl: [-12, 30], bl: [24, 28] },
  blockB:  { dx: -5, dy: 2, lean: -7, head: -1, fa: [-58, -124], ba: [-45, -120], fl: [-10, 30], bl: [26, 30] },
  hurt:    { dx: -6, dy: 1, lean: -16, head: -1, fa: [30, -25], ba: [42, -12], fl: [-6, 12], bl: [16, 10] },
  hurtB:   { dx: -9, dy: 1, lean: -22, head: -1, fa: [42, -18], ba: [52, -8], fl: [-2, 10], bl: [18, 8] },
  hurtR:   { dx: -3, dy: 1, lean: -4, fa: [-10, -70], ba: [0, -80], fl: [-12, 16], bl: [16, 10] },
  charge:  { dx: -3, dy: 1, lean: -8, fa: [-150, -30], ba: [-120, -60], fl: [-20, 24], bl: [22, 18] },
  chargeB: { dx: -4, dy: 1, lean: -9, fa: [-153, -27], ba: [-123, -57], fl: [-20, 24], bl: [22, 18] },
  ultCrouch: { dy: 3, lean: 10, head: 1, fa: [-20, -120], ba: [-10, -120], fl: [-30, 40], bl: [30, 30] },
  ultA:    { dy: -1, lean: -4, head: -1, fa: [-150, -12], ba: [140, 8], fl: [-24, 2], bl: [24, 2] },
  ultB:    { dy: -2, lean: -5, head: -1, fa: [-156, -6], ba: [146, 4], fl: [-24, 2], bl: [24, 2] },
  crouch:  { dy: 4, lean: 8, fa: [-20, -110], ba: [-10, -110], fl: [-30, 46], bl: [30, 40] },
  winAir:  { dy: -10, lean: -2, head: -1, fa: [-170, -10], ba: [30, -80], fl: [-30, 40], bl: [20, 50] },
  winLand: { dy: 2, fa: [-168, -22], ba: [22, -100], fl: [-14, 20], bl: [14, 16] },
  winA:    { fa: [-168, -22], ba: [22, -100], fl: [-8, 0], bl: [8, 0] },
  winB:    { dy: -1, fa: [-158, -45], ba: [22, -100], fl: [-8, 2], bl: [8, 2] },
  // โอนิ: ถือดาบชี้หน้า ฟันจากบนลงล่าง
  oniIdleA:  { lean: 4, fa: [-62, -58], ba: [-50, -70], fl: [-18, 20], bl: [18, 12] },
  oniIdleB:  { lean: 5, by: 1, dy: .6, fa: [-58, -60], ba: [-47, -72], fl: [-18, 22], bl: [18, 14] },
  oniRaise:  { dx: -3, dy: 1, lean: -10, fa: [-178, -18], ba: [-152, -38], fl: [-16, 22], bl: [22, 16], travel: -.06 },
  oniSlash:  { dx: 8, dy: 2, lean: 18, fa: [-72, -8], ba: [-42, -58], fl: [-38, 28], bl: [32, 6], travel: 1, smear: 1 },
  oniFollow: { dx: 9, dy: 2, lean: 20, fa: [-28, -8], ba: [-20, -60], fl: [-38, 28], bl: [32, 6], travel: 1 },
  // ราชินี: สะบัดพัด
  qIdleA:  { lean: 2, fa: [-50, -75], ba: [-12, -40], fl: [-6, 4], bl: [6, 4] },
  qIdleB:  { lean: 3, by: 1, fa: [-46, -80], ba: [-10, -44], fl: [-6, 4], bl: [6, 4] },
  qWind:   { dx: -2, lean: -6, head: -1, fa: [-155, -40], ba: [-30, -60], fl: [-6, 4], bl: [6, 4], travel: -.04 },
  qSweep:  { dx: 4, lean: 8, fa: [-92, -10], ba: [20, -50], fl: [-10, 6], bl: [10, 6], travel: .35, smear: 1 },
  qSweepF: { dx: 5, lean: 10, fa: [-48, -12], ba: [24, -50], fl: [-10, 6], bl: [10, 6], travel: .35 },
  npcA:    { lean: 2, fa: [-30, -80], ba: [-25, -85], fl: [-4, 0], bl: [4, 0] },
  npcB:    { lean: 3, by: 1, fa: [-28, -84], ba: [-24, -88], fl: [-4, 0], bl: [4, 0] },
  waveA:   { lean: 0, head: 1, fa: [-168, -8], ba: [-25, -85], fl: [-4, 0], bl: [4, 0] },
  waveB:   { lean: 1, head: 1, fa: [-160, -55], ba: [-25, -85], fl: [-4, 0], bl: [4, 0] }
};

/* ---- Keyframe animation: [เวลา, ท่า, easing ไปถึงท่านั้น] ---- */
const EASE = { lin: t => t, out: t => 1 - (1 - t) * (1 - t), in: t => t * t, io: t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t), sine: t => .5 - .5 * Math.cos(Math.PI * t) };
const FIGHTER = {
  idle:   { loopFrom: 0, keys: [[0, 'idleA'], [.6, 'idleB', 'sine'], [1.2, 'idleA', 'sine']] },
  attack: { keys: [[0, 'idleA'], [.133, 'windup', 'out'], [.2, 'strike', 'in'], [.333, 'strikeF', 'out'], [.533, 'idleA', 'io']] },
  block:  { loopFrom: .07, keys: [[0, 'idleA'], [.07, 'block', 'out'], [.35, 'blockB', 'sine'], [.7, 'block', 'sine']] },
  hurt:   { keys: [[0, 'hurt'], [.08, 'hurtB', 'out'], [.3, 'hurtR', 'io'], [.5, 'idleA', 'io']] },
  charge: { loopFrom: .14, keys: [[0, 'idleA'], [.14, 'charge', 'out'], [.2, 'chargeB', 'lin'], [.26, 'charge', 'lin']] },
  ult:    { loopFrom: .36, keys: [[0, 'idleA'], [.18, 'ultCrouch', 'out'], [.36, 'ultA', 'out'], [.6, 'ultB', 'sine'], [.84, 'ultA', 'sine']] },
  win:    { loopFrom: .8, keys: [[0, 'idleA'], [.14, 'crouch', 'out'], [.34, 'winAir', 'out'], [.5, 'winA', 'in'], [.62, 'winLand', 'out'], [.8, 'winA', 'out'], [1.1, 'winB', 'sine'], [1.4, 'winA', 'sine']] }
};
const swapIdle = (anim, a, b) => JSON.parse(JSON.stringify(anim).replaceAll('"idleA"', `"${a}"`).replaceAll('"idleB"', `"${b}"`));
const ANIMS = {
  airin: FIGHTER,
  oni: { ...swapIdle(FIGHTER, 'oniIdleA', 'oniIdleB'),
    attack: { keys: [[0, 'oniIdleA'], [.133, 'oniRaise', 'out'], [.2, 'oniSlash', 'in'], [.333, 'oniFollow', 'out'], [.533, 'oniIdleA', 'io']] } },
  queen: { ...swapIdle(FIGHTER, 'qIdleA', 'qIdleB'),
    attack: { keys: [[0, 'qIdleA'], [.133, 'qWind', 'out'], [.2, 'qSweep', 'in'], [.4, 'qSweepF', 'out'], [.6, 'qIdleA', 'io']] } },
  cat: {
    idle: { loopFrom: 0, keys: [[0, 'npcA'], [.8, 'npcB', 'sine'], [1.6, 'npcA', 'sine']] },
    wave: { loopFrom: .2, keys: [[0, 'npcA'], [.2, 'waveB', 'out'], [.38, 'waveA', 'io'], [.56, 'waveB', 'io']] }
  },
  robo: { idle: { loopFrom: 0, keys: [[0, 'npcA'], [1, 'npcA']] } }
};
const LIMBS = ['fa', 'ba', 'fl', 'bl'], NUMS = ['dx', 'dy', 'by', 'lean', 'head', 'travel', 'smear'];
const full = p => ({ ...BASE, ...(typeof p === 'string' ? PO[p] : p) });
function sampleAnim(anim, t) {
  const ks = anim.keys, end = ks[ks.length - 1][0];
  if (anim.loopFrom !== undefined && t > end) t = anim.loopFrom + (t - end) % Math.max(.001, end - anim.loopFrom);
  t = Math.max(0, Math.min(t, end));
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, p0] = ks[i], [t1, p1, e = 'io'] = ks[i + 1];
    if (t <= t1) {
      const k = t1 > t0 ? EASE[e]((t - t0) / (t1 - t0)) : 1, a = full(p0), b = full(p1), o = {};
      for (const n of NUMS) o[n] = a[n] + (b[n] - a[n]) * k;
      for (const n of LIMBS) o[n] = [a[n][0] + (b[n][0] - a[n][0]) * k, a[n][1] + (b[n][1] - a[n][1]) * k];
      return o;
    }
  }
  return full(ks[ks.length - 1][1]);
}

/* =================== Heads (วาดเป็นรูปทรง ความสูง ~32px หันขวา) =================== */
// o: สีผม/ผิว/ตา + ตัวเลือก closed (ตาปิดยิ้ม), lidded (ตาครึ่งปิด), pre/extra (ของประดับหลัง/หน้าผม)
function animeHead(px, r, o) {
  const c = r.hc, s = r.sway, P = (x, y) => ({ x: c.x + x, y: c.y + y });
  if (o.pre) o.pre(px, P, s);
  // มวลผมด้านหลังศีรษะ + ปอยแหลมปลิวไปด้านหลัง
  px.poly([P(-15, -4), P(-6, -13), P(4, -8), P(2, 10), P(-7, 15), P(-15, 9)], o.hair);
  [[-12, -9, 13], [-14, -2, 15], [-13, 5, 13]].forEach(([x, y, L], i) =>
    spike(px, P(x + 3, y), P(x - L + s * .5, y + 3 + i * 2), 7, i === 1 ? o.hairD : o.hair));
  // ใบหน้า
  px.poly([P(-4, -9), P(8, -8), P(10.5, -1), P(10, 4), P(7, 9.5), P(3, 12.5), P(-1, 11.5), P(-5, 6)], o.skin);
  px.poly([P(-5, 6), P(-1, 11.5), P(3, 12.5), P(1.5, 9.5), P(-2.5, 5)], o.skinD);
  // ตา
  const E = o.eye;
  if (o.closed) {
    px.line(P(1, 1.5), P(3, -.5), .55, o.lash); px.line(P(3, -.5), P(5, 1.5), .55, o.lash);
    px.line(P(7.5, 1.5), P(8.5, -.3), .5, o.lash); px.line(P(8.5, -.3), P(10, 1.3), .5, o.lash);
  } else {
    const top = o.lidded ? 1 : -1;
    rect(px, c.x + 1, c.y + top, 4, 5 - top, E[1]);
    rect(px, c.x + 1, c.y + top + 2, 4, 3 - top, E[0]);
    rect(px, c.x + 2, c.y + 3, 2, 1, E[2]);
    px.set(c.x + 3, c.y + top, '#ffffff'); px.set(c.x + 2, c.y + 2, '#ffffff');
    rect(px, c.x + 8, c.y + top, 2, 5 - top, E[1]); rect(px, c.x + 8, c.y + top + 2, 2, 3 - top, E[0]);
    px.set(c.x + 9, c.y + top, '#ffffff');
    px.line(P(0, top - .5), P(6, top - 1.5), o.lidded ? 1 : .75, o.lash); px.set(c.x + 6, c.y + top - 1, o.lash);
    px.line(P(7.5, top - .5), P(10.2, top - 1), .6, o.lash);
    if (o.lidded) px.line(P(1, 5.2), P(5, 5.2), .4, o.skinD);
  }
  px.line(P(0.5, -4.5), P(5, -5.5), .5, o.brow); px.line(P(8, -5), P(10, -5), .5, o.brow);
  px.set(c.x + 10, c.y + 4, o.skinD);
  px.line(P(5, 8.5), P(7, 8.3), .5, o.mouth);
  if (o.blush) { rect(px, c.x + 1, c.y + 6, 3, 1, o.blush); rect(px, c.x + 8, c.y + 6, 2, 1, o.blush); }
  // ปอยข้างแก้ม
  px.poly([P(-4, -6), P(0, -5), P(-.5, 9), P(-2.5, 15), P(-4.5, 7)], o.hair);
  px.line(P(-2, -3), P(-2.5, 12), .45, o.hairD);
  // กะบังผมด้านบน
  px.poly([P(-15, 2), P(-15, -6), P(-11, -13), P(-4, -16.5), P(3, -16), P(9, -12.5), P(12, -6), P(11.5, -4), P(-3, -6)], o.hair);
  // หน้าม้าแหลม
  [[-3, 2, 0, 3], [1, 6, 4, 2], [5, 9, 7.5, -1], [8.5, 12, 11.5, -2.5]].forEach(([x0, x1, tx, ty], i) => {
    px.poly([P(x0, -7), P(x1, -7), P(tx, ty)], o.hair);
    px.line(P(x0 + .5, -6.5), P(tx - .3, ty - 1), .4, o.hairD);
  });
  // ไฮไลต์ผมแบบวงแหวน
  px.line(P(-10, -9), P(-4, -12.5), .6, o.hairL); px.line(P(-2, -13.5), P(4, -13), .6, o.hairL);
  px.set(c.x - 6, c.y - 12, o.hairLL); px.set(c.x + 1, c.y - 14, o.hairLL);
  px.line(P(-12, -2), P(-13, 6), .45, o.hairD);
  if (o.extra) o.extra(px, P, s);
}

function oniHead(px, r) {
  const c = r.hc, s = r.sway, P = (x, y) => ({ x: c.x + x, y: c.y + y });
  const M = { mane: '#1a1220', maneL: '#3f3f46', R: '#dc2626', RL: '#f05252', r: '#8f1717', rr: '#5c0d0d', Y: '#fde047', YL: '#fffbeb', T: '#ffffff', horn: '#f5f5f4', hornD: '#b8b2aa', gold: '#f59e0b', mouth: '#2a0505' };
  // แผงผมดำปลิว
  px.poly([P(-3, -15), P(-14, -12), P(-19, 2), P(-15, 15), P(-4, 12)], M.mane);
  for (let i = 0; i < 5; i++) spike(px, P(-8, -11 + i * 5.5), P(-25 - i + s * .7, -14 + i * 8 + s * .2), 11, i % 2 ? M.mane : '#120c18');
  [[-8, -6, -20, -4], [-8, 4, -22, 14]].forEach(([a, b, c2, d]) => px.line(P(a, b), P(c2, d), .5, M.maneL));
  // เขา (โค้ง เรียว)
  const horn = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const w0 = 2.6 - i * .9, w1 = 2.6 - (i + 1) * .9; shade(px, pts[i], pts[i + 1], Math.max(.6, w0), Math.max(.6, w1), M.horn, M.hornD); } };
  horn([P(-3, -10), P(-6, -18), P(-4, -25)]);
  horn([P(6, -11), P(8, -19), P(12, -25)]);
  // หน้ากาก
  px.poly([P(-8, -11), P(6, -13), P(11, -7), P(12.5, 2), P(10.5, 9), P(6, 13.5), P(-2, 13.5), P(-8, 8.5), P(-10, -2)], M.R);
  px.poly([P(-10, -2), P(-8, 8.5), P(-2, 13.5), P(1, 13.5), P(-5, 6), P(-7, -3)], M.r);
  px.line(P(-2, -11), P(6, -12), .6, M.RL); px.line(P(10, -6), P(11.5, 1), .5, M.RL);
  px.line(P(-6, -9.5), P(9, -11), .55, M.gold);
  // คิ้วขมวด
  px.poly([P(-1, -7), P(6, -9), P(6.5, -6.5), P(0, -4.5)], M.rr);
  px.poly([P(8, -8.5), P(12, -7), P(12, -5.5), P(8, -6)], M.rr);
  // ตาเรืองแสง
  px.poly([P(0, -4), P(6, -6), P(6, -1.5), P(1.5, -1)], M.Y); px.line(P(3.5, -4.8), P(3.5, -1.8), .5, M.rr); px.set(c.x + 1, c.y - 4, M.YL);
  px.poly([P(8.5, -5.5), P(11.5, -5), P(11, -1.8), P(8.5, -2)], M.Y); px.set(c.x + 10, c.y - 4, M.rr);
  // จมูก
  px.line(P(8, -1), P(10, 3), .6, M.r); px.set(c.x + 9, c.y + 3, M.rr);
  // ปากแสยะ + เขี้ยว
  px.poly([P(0, 5), P(12, 4), P(11, 10), P(1, 10.5)], M.mouth);
  px.line(P(1, 5.5), P(11.5, 4.6), .8, M.T);
  for (let x = 2; x < 11; x += 2.2) px.set(c.x + x, c.y + 6, M.mouth);
  px.line(P(1.5, 9.8), P(10.5, 9.3), .55, M.T);
  spike(px, P(2.5, 5), P(3, 10), 2.4, M.T); spike(px, P(9.5, 4.5), P(10, 9.5), 2.4, M.T);
  px.line(P(-1, 12), P(9, 12.5), .5, M.rr);
}

const ROBO = { pal: { W: '#f1f5f9', g: '#94a3b8', d: '#1e1b4b', C: '#67e8f9', c: '#c084fc' },
  rows: [
    '.WW.........WW..',
    '.WcW.......WcW..',
    '.WWWWWWWWWWWWW..',
    'WWWWWWWWWWWWWWW.',
    'WWdddddddddddWW.',
    'WWdCCdddddCCdWW.',
    'WWdCCdddddCCdWW.',
    'WWdddddddddddWW.',
    '.WWWWWWWWWWWWW..',
    '..gWWWWWWWWWg...',
    '...gg.....gg....'] };

/* =================== Characters =================== */
function blitK(px, rows, ox, oy, pal, k) { rows.forEach((row, j) => [...row].forEach((ch, i) => { const c = pal[ch]; if (c) rect(px, ox + i * k, oy + j * k, k, k, c); })); }
const CHARS = {
  airin: {
    name: 'ไอริน', role: 'นางเอก · นักพิมพ์', theme: '', rim: '#c4b5fd',
    desc: 'ผมม่วงยาว แจ็กเก็ตฮู้ดสีขาว เสื้อครอปดำ ถุงมือครึ่งนิ้ว และบูทม่วง ตามคอนเซ็ปต์อาร์ต',
    draw(px, r) {
      const C = { hair: '#4c35b5', hairD: '#2d1b69', hairL: '#8b6cf0', hairLL: '#c4b5fd', w: '#f4f1fb', wD: '#bdb5df', wDD: '#8f86bd', b: '#1c1730', bL: '#3a3160', skin: '#f6d1bc', skinD: '#dfa48c', belt: '#4b4570', p: '#c084fc', pG: '#f3e8ff', pants: '#3b3372', pantsD: '#241d4a', boot: '#7357e0', bootD: '#3b2a8a', bootL: '#a78bfa', glove: '#2a2342', gloveD: '#120e22', metal: '#cbd5e1' };
      const n = r.neck, T = r.T, s = r.sway, hp = (x, y) => add(n, x + s * Math.max(0, y + 8) / 26, y);
      // ผมยาวด้านหลัง ปลายแตกเป็นแฉก
      px.poly([hp(-6, -26), hp(-18, -20), hp(-25, -4), hp(-27, 16), hp(-25, 34), hp(-21, 28), hp(-19, 42), hp(-15, 32), hp(-12, 40), hp(-9, 26), hp(-6, 12), hp(-2, -2), hp(2, -16)], C.hair);
      [[-20, -6, -23, 30], [-14, -4, -16, 36], [-9, -2, -10, 24]].forEach(([a, b, c2, d]) => px.line(hp(a, b), hp(c2, d), .7, C.hairD));
      px.line(hp(-17, -10), hp(-20, 10), .6, C.hairL);
      // ฮู้ด
      const hd = T(-4.5, -17.5); px.disc(hd.x, hd.y, 6.5, C.wD); px.disc(hd.x + 1, hd.y + 1, 3.6, C.wDD);
      // ชายแจ็กเก็ตปลิวด้านหลัง
      const tl = (x, y) => add(T(x, y, false), s * Math.max(0, y) / 5, 0);
      px.poly([T(-8.5, -4), T(-2, -3), tl(-4, 7), tl(-6.5, 5.5), tl(-9, 8.5), tl(-12, 4.5)], C.wDD);
      px.line(tl(-6.5, 5.5), T(-6, -3), .5, C.wD);
      arm(px, r.ba, 4.6, C.wD, C.wDD, C.glove, C.gloveD);
      leg(px, r.bl, { c: C.pantsD, d: '#17122f', boot: C.bootD, bootD: '#261a5c' });
      [.55, .78].forEach(t => strap(px, r.bl, t, 4, .5, C.boot));
      leg(px, r.fl, { c: C.pants, d: C.pantsD, boot: C.boot, bootD: C.bootD });
      [.55, .78].forEach(t => strap(px, r.fl, t, 4.2, .55, C.bootL));
      // สายรัดต้นขา + กระเป๋า
      strap(px, { e: r.fl.s, h: r.fl.e }, .45, 5, .6, C.b);
      const pc = lerp(r.fl.s, r.fl.e, .5); rect(px, pc.x - 4, pc.y - 2, 4, 5, C.b); px.set(pc.x - 3, pc.y - 1, C.p);
      // สะโพก
      px.poly([T(-5.5, -6, false), T(5.5, -6, false), T(6.5, 2.5, false), T(0, 1.5, false), T(-5.5, 2.5, false)], C.pants);
      px.line(T(0, -2, false), T(0, 1.5, false), .45, C.pantsD);
      // แจ็กเก็ตเปิดหน้า
      px.poly([T(-7.5, -17.5), T(6, -18.5), T(8, -9), T(8.5, -2), T(4, -1), T(-4, -1), T(-8.5, -3)], C.w);
      px.poly([T(-7.5, -16.5), T(-4.5, -16.5), T(-4.5, -2), T(-8.5, -3)], C.wD);
      px.line(T(-6, -13), T(-6.5, -4), .5, C.wDD); px.line(T(6.5, -12), T(7, -4), .5, C.wD); px.line(T(5.5, -6), T(8, -3), .45, C.wD);
      // เสื้อครอป + หน้าท้อง
      px.poly([T(-2, -17.5), T(4.5, -17.5), T(4.5, -11), T(-2, -11)], C.b);
      px.line(T(-1.5, -16.6), T(4, -16.6), .6, C.bL); px.line(T(-1, -13), T(3.5, -12), .4, C.bL);
      px.poly([T(-2, -11), T(4.5, -11), T(4.5, -6), T(-2, -6)], C.skin);
      px.line(T(-2, -10.6), T(4.5, -10.6), .5, C.skinD); px.line(T(1.3, -9.5), T(1.3, -7), .4, C.skinD);
      // เข็มขัด หัวเข็มขัด โซ่
      px.poly([T(-3, -6), T(5, -6), T(5, -4.5), T(-3, -4.5)], C.belt);
      const bk = T(1, -5.3); rect(px, bk.x - 1, bk.y - 1, 3, 3, C.metal); px.set(bk.x, bk.y, C.belt);
      for (let i = 0; i <= 5; i++) { const q = lerp(T(2.5, -4.5), T(6, -3.5), i / 5); px.set(q.x, q.y + Math.sin(i / 5 * Math.PI) * 2.5, C.metal); }
      // ขอบซิปม่วง + ตราปุ่มคีย์บอร์ด
      px.line(T(-2, -17.5), T(-2, -2), .7, C.p); px.line(T(4.8, -17.5), T(5.2, -2), .6, C.wD);
      const em = T(6.4, -14.5); rect(px, em.x - 1, em.y - 1, 3, 3, C.p); px.set(em.x, em.y, C.pG);
      // คอ + โชคเกอร์
      px.line(n, add(n, 2, 4), 2.6, C.skin); px.line(add(n, -2, 1), add(n, 3.5, .5), .8, C.b); px.set(n.x + 1, n.y + 2, C.p);
      animeHead(px, r, { hair: C.hair, hairD: C.hairD, hairL: C.hairL, hairLL: C.hairLL, skin: C.skin, skinD: C.skinD, eye: ['#3b82f6', '#1e3a8a', '#7dd3fc'], lash: '#1e1b4b', brow: C.hairD, mouth: '#c2410c', blush: '#f9a8b8',
        extra: (px, P) => { px.line(P(-8, -8), P(-5, -11), .6, C.p); px.line(P(-8, -11), P(-5, -8), .6, C.p); } });
      arm(px, r.fa, 4.9, C.w, C.wD, C.glove, C.gloveD);
      strap(px, r.fa, .3, 4.4, .5, C.wD);
      const cuff = lerp(r.fa.e, r.fa.h, .78); px.disc(cuff.x, cuff.y, 3, C.p); px.disc(cuff.x + .6, cuff.y - .6, 1.5, C.pG);
      const kn = add(r.fa.h, r.fa.dir.x * 4, r.fa.dir.y * 4); px.set(kn.x, kn.y, C.pG); px.set(kn.x + 1, kn.y, C.p);
    }
  },
  oni: {
    name: 'โอนิดาบแดง', role: 'ศัตรู · ตัว Shift', theme: 'red', enemy: true, rim: '#fb7185',
    desc: 'ซามูไรหน้ากากโอนิสีแดง เขาสีขาว เกราะแดงเข้มขลิบทอง ถือคาตานะ',
    draw(px, r) {
      const C = { armor: '#8a1c2e', armorD: '#4a0d1a', armorL: '#c0344c', trim: '#f59e0b', trimL: '#fde68a', lace: '#f5d0a0', hak: '#2e1a24', hakD: '#170c12', hakL: '#4a2a38', sleeve: '#3d1020', sleeveD: '#22070f', hand: '#1a0a10', blade: '#f1f5f9', bladeD: '#94a3b8', glow: '#f87171', hilt: '#111111', wrap: '#7f1d1d', rope: '#fde047', ropeD: '#ca8a04', cape: '#3a0b16', capeL: '#5c1424' };
      const T = r.T, s = r.sway;
      // ผ้าคลุมขาดรุ่ยปลิวด้านหลัง
      const cp = (x, y) => add(T(x, y, false), s * Math.max(0, y + 14) / 4, 0);
      px.poly([T(-6, -18), T(3, -18), cp(-5, 6), cp(-7, 10), cp(-9, 7), cp(-11, 12), cp(-13, 6), cp(-15, 9), cp(-14, -4)], C.cape);
      px.line(cp(-8, -10), cp(-10, 6), .5, C.capeL); px.line(cp(-12, -6), cp(-13, 6), .5, C.capeL);
      arm(px, r.ba, 5.4, C.sleeveD, '#14050a', C.hand, '#000000');
      const hk = { th: 6.6, kn: 6.2, an: 6.4, foot: 7, boot: '#0a0508', bootD: '#000000', bootAt: false };
      leg(px, r.bl, { ...hk, c: C.hakD, d: '#0b0508' });
      leg(px, r.fl, { ...hk, c: C.hak, d: C.hakD });
      // ฮากามะ (กางเกงจีบกว้าง)
      px.poly([T(-6, -4, false), T(7, -4, false), add(r.fl.e, 7, 0), add(r.bl.e, -7, 0)], C.hak);
      [[-2, .3], [2, .6], [5, .85]].forEach(([x, t]) => px.line(T(x, -2, false), lerp(r.bl.e, r.fl.e, t), .45, C.hakD));
      px.line(lerp(r.fl.e, r.fl.h, .1), lerp(r.fl.e, r.fl.h, .9), .45, C.hakL);
      // เกราะอก (โด) เป็นแผ่นซ้อน + เชือกผูก
      px.poly([T(-8, -18), T(8, -18), T(7, -3), T(-6, -3)], C.armor);
      px.poly([T(-8, -18), T(-4.5, -18), T(-3.5, -3), T(-6, -3)], C.armorD);
      px.line(T(-3, -17.2), T(7, -17.2), .6, C.armorL);
      [-14.5, -11, -7.5].forEach((y, i) => { px.line(T(-7.5, y), T(7.5, y), .45, i ? C.armorD : C.trim); px.line(T(-6, y + .6), T(7, y + .6), .4, C.armorL); });
      for (let y = -17; y < -3; y += 1.6) { const a = T(-1, y), b = T(4, y); px.set(a.x, a.y, C.lace); px.set(b.x, b.y, C.lace); }
      const mon = T(1.5, -15.8); px.disc(mon.x, mon.y, 2.2, C.trim); px.set(mon.x, mon.y, C.armorD);
      // เชือกคาดเอว + ปม
      px.poly([T(-7, -4), T(8, -4), T(8, -2), T(-7, -2)], C.rope);
      px.line(T(-7, -3), T(8, -3), .4, C.ropeD);
      const kt = T(6, -3); px.disc(kt.x, kt.y, 2, C.rope); px.line(kt, add(kt, 2, 7), .6, C.rope); px.line(add(kt, -1, 0), add(kt, -1, 6), .6, C.ropeD);
      // คุซาซุริ (แผ่นเกราะห้อยสะโพก) 3 แผ่น
      [[-7, -2.5], [-2.5, 2], [2, 8.5]].forEach(([a, b], i) => {
        px.poly([T(a, -2), T(b, -2), T(b + .6, 5, false), T(a - .3, 5, false)], i === 0 ? C.armorD : C.armor);
        px.line(T(a, 1, false), T(b, 1, false), .45, C.trim); px.line(T(a, 3.5, false), T(b + .3, 3.5, false), .45, C.trim);
      });
      // โซเดะด้านหลัง
      px.poly([T(-11.5, -19), T(-3, -19), T(-3, -11), T(-12.5, -12)], C.armorD);
      px.line(T(-11.5, -15), T(-3, -15), .45, C.trim);
      oniHead(px, r);
      // คาตานะ: ด้ามพันลาย กระบังทอง ใบมีดมีเส้นแสงแดง
      const d = r.fa.dir, h = r.fa.h, A = (k, o = 0) => add(h, d.x * k - d.y * o, d.y * k + d.x * o);
      px.line(A(-8), A(1), 2, C.hilt);
      for (let k = -7; k < 1; k += 2) px.set(A(k).x, A(k).y, C.wrap);
      px.line(A(2, -3.5), A(2, 3.5), 1.1, C.trim);
      px.line(A(3), A(50), 1.6, C.blade);
      px.line(A(4, 1.2), A(47, 1.2), .6, C.bladeD);
      px.line(A(6, -1.1), A(44, -1.1), .45, C.glow);
      spike(px, A(48), A(54, -1), 3, C.blade);
      arm(px, r.fa, 5.4, C.sleeve, C.sleeveD, C.hand, '#000000');
      // ถุงมือเกราะ
      const g0 = lerp(r.fa.e, r.fa.h, .45), g1 = lerp(r.fa.e, r.fa.h, .9);
      shade(px, g0, g1, 4.2, 3.6, C.armor, C.armorD); strap(px, r.fa, .6, 3.6, .45, C.trim);
      // โซเดะด้านหน้า 3 ชั้น
      px.poly([T(1, -19.5), T(10.5, -19.5), T(11.5, -11), T(2, -10)], C.armor);
      px.poly([T(1, -19.5), T(10.5, -19.5), T(10.5, -17.5), T(1, -17.5)], C.armorL);
      [-16, -13].forEach(y => { px.line(T(1.5, y), T(11, y - .3), .45, C.armorD); px.line(T(1.5, y + .6), T(11, y + .3), .4, C.armorL); });
      px.line(T(2, -10.5), T(11.5, -11.5), .5, C.trimL);
    }
  },
  queen: {
    name: 'ราชินีวรรณยุกต์', role: 'บอส · วรรณยุกต์', theme: 'red', enemy: true, glyphs: true, rim: '#f0abfc',
    desc: 'ผมเงินยาว ปิ่นสีชมพู กิโมโนม่วง ถือพัด มีตัวอักษรวรรณยุกต์ลอยรอบตัว',
    draw(px, r) {
      const C = { hair: '#e4e4e7', hairD: '#a1a1aa', hairL: '#ffffff', kim: '#5b21b6', kimD: '#3b0f86', kimDD: '#24085a', kimL: '#7c3aed', obi: '#f0abfc', obiD: '#c026d3', skin: '#f8e1d4', skinD: '#e2bfae', fan: '#f5d0fe', fanD: '#a21caf', white: '#f5f3ff', gold: '#fbbf24', goldD: '#b45309', pink: '#f472b6' };
      const n = r.neck, T = r.T, s = r.sway, hip = r.hip, hp = (x, y) => add(n, x + s * Math.max(0, y + 8) / 34, y);
      // ผมเงินยาวถึงพื้น
      px.poly([hp(-6, -26), hp(-20, -16), hp(-27, 6), hp(-29, 34), hp(-27, 58), hp(-23, 70), hp(-20, 62), hp(-16, 72), hp(-12, 56), hp(-9, 36), hp(-5, 12), hp(2, -14)], C.hair);
      [[-22, -4, -25, 60], [-15, -2, -17, 64], [-9, 4, -11, 46]].forEach(([a, b, c2, d]) => px.line(hp(a, b), hp(c2, d), .7, C.hairD));
      px.line(hp(-19, -8), hp(-23, 24), .6, C.hairL);
      arm(px, r.ba, 6, C.kimD, C.kimDD, C.skinD, C.skinD);
      drape(px, r.ba, C.kimD, C.kimDD, 20, C.pink);
      // กิโมโนยาวถึงพื้น
      const hem = 141, H = (x, y) => ({ x: hip.x + x, y });
      px.poly([T(-6, -17), T(6, -17), T(7, -6), H(21, hem), H(-22, hem), T(-7, -6)], C.kim);
      px.poly([T(-6, -16), T(-3, -16), H(-11, hem), H(-22, hem), T(-7, -6)], C.kimD);
      px.poly([T(3, -6), T(7, -6), H(21, hem), H(13, hem)], C.kimL);
      px.poly([H(-22, hem - 9), H(21, hem - 9), H(21, hem), H(-22, hem)], C.kimDD);
      px.line(H(-21, hem - 9), H(20, hem - 9), .8, C.obi); px.line(H(-21, hem - 1), H(20, hem - 1), .6, C.pink);
      // ลายซากุระ
      [[-8, 112], [8, 122], [-14, 128], [12, 106], [2, 132], [-3, 118]].forEach(([x, y]) => { const q = H(x, y); px.set(q.x, q.y, C.white); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => px.set(q.x + a, q.y + b, C.pink)); });
      // โอบิกว้างลายทอง + เชือก
      px.poly([T(-6.5, -10), T(7.5, -10), T(7.5, -3.5), T(-6.5, -3.5)], C.obi);
      px.line(T(-6.5, -9.5), T(7.5, -9.5), .5, C.obiD); px.line(T(-6.5, -4), T(7.5, -4), .5, C.obiD);
      for (let x = -5; x < 7; x += 3) { const q = T(x, -7.5); px.set(q.x, q.y, C.gold); px.set(q.x + 1, q.y + 1, C.gold); px.set(q.x + 1, q.y - 1, C.goldD); }
      px.line(T(-6.5, -6.6), T(7.5, -6.6), .45, C.gold);
      const kt = T(2, -6.6); px.disc(kt.x, kt.y, 1.6, C.pink); px.line(kt, add(kt, 1, 10), .5, C.pink); px.line(kt, add(kt, 3, 9), .5, C.obiD);
      // ปกไขว้ซ้อนชั้น ขาว/ชมพู
      px.line(T(-3, -17.5), T(1, -10), 1.1, C.white); px.line(T(4.5, -17.5), T(1, -10), 1.1, C.white);
      px.line(T(-1.8, -17.5), T(1.5, -11.5), .5, C.pink); px.line(T(3.3, -17.5), T(1.2, -12), .5, C.pink);
      px.line(n, add(n, 2, 4), 2.6, C.skin);
      animeHead(px, r, { hair: C.hair, hairD: C.hairD, hairL: C.hairL, hairLL: '#ffffff', skin: C.skin, skinD: C.skinD, eye: ['#a855f7', '#4c1d95', '#e9d5ff'], lash: '#3b0764', brow: C.hairD, mouth: '#db2777', lidded: true,
        pre: (px, P) => { px.disc(P(-9, -16).x, P(-9, -16).y, 6.5, C.hair); px.line(P(-12, -19), P(-6, -20), .5, C.hairL); },
        extra: (px, P) => {
          px.line(P(-3, -20), P(-15, -10), .7, C.gold);
          px.disc(P(-3, -20).x, P(-3, -20).y, 2.4, C.obi); px.set(P(-3, -20).x, P(-3, -20).y, C.white);
          for (let i = 0; i < 3; i++) { const q = P(-15 + i * 2.2, -10 + i * .5); px.line(q, add(q, 0, 5 + i * 2), .4, C.gold); px.set(q.x, q.y + 6 + i * 2, C.pink); }
          px.disc(P(6, -14).x, P(6, -14).y, 1.6, C.pink);
        } });
      // พัด: ซี่สลับสี ขอบทอง
      const h = r.fa.h, base = Math.atan2(r.fa.dir.y, r.fa.dir.x), R = 22, arc = [];
      for (let k = -6; k <= 6; k++) { const a = base + k * 8.5 * D2R; arc.push({ x: h.x + Math.cos(a) * R, y: h.y + Math.sin(a) * R }); }
      for (let i = 0; i < arc.length - 1; i++) px.poly([h, arc[i], arc[i + 1]], i % 2 ? C.fan : C.obi);
      arc.forEach((q, i) => { px.line(lerp(h, q, .25), q, .35, C.fanD); if (i < arc.length - 1) px.line(q, arc[i + 1], .6, C.gold); });
      const inner = arc.map(q => lerp(h, q, .4)); for (let i = 0; i < inner.length - 1; i++) px.line(inner[i], inner[i + 1], .4, C.fanD);
      arm(px, r.fa, 6, C.kim, C.kimD, C.skin, C.skinD);
      drape(px, r.fa, C.kimL, C.kimD, 20, C.pink);
    }
  },
  cat: {
    name: 'เหมียวมิ', role: 'NPC · ร้านค้า', npc: 'cat', rim: '#fbcfe8',
    desc: 'แม่ค้าสาวหูแมวในชุดกิโมโนชมพู ยิ้มตาปิด ทักว่า “เอาอะไรดีล่ะ?” ตามคอนเซ็ปต์หน้าร้านค้า',
    draw(px, r, p, gt) {
      const C = { kim: '#fdf2f8', kimD: '#f9a8d4', kimDD: '#db6aa6', obi: '#e11d48', obiD: '#9f1239', hair: '#1c1325', hairD: '#0c0812', hairL: '#4b3b6b', skin: '#fde2d0', skinD: '#e9c3ad', pat: '#f472b6', gold: '#fbbf24', apron: '#ffffff' };
      const T = r.T, hip = r.hip, n = r.neck, sw = Math.sin(gt * 3) * 4;
      // หางแมว
      const t0 = T(-5, -4, false), t1 = { x: hip.x - 24, y: hip.y - 2 + sw }, t2 = { x: hip.x - 28, y: hip.y - 22 + sw };
      px.taper(t0, t1, 2.8, 2.2, C.hair); px.taper(t1, t2, 2.2, 2.8, C.hair); px.line(add(t1, -1, -2), add(t2, -1, 0), .5, C.hairL);
      // หางม้า
      px.poly([add(n, -10, -20), add(n, -22, -10), add(n, -24, 10), add(n, -16, 6), add(n, -12, 14), add(n, -6, -6)], C.hair);
      px.line(add(n, -16, -8), add(n, -18, 8), .5, C.hairL);
      arm(px, r.ba, 5.8, C.kimD, C.kimDD, C.skinD, C.skinD);
      drape(px, r.ba, C.kimD, C.kimDD, 15, C.obi);
      const hem = 141, H = (x, y) => ({ x: hip.x + x, y });
      px.poly([T(-6, -17), T(6, -17), T(7, -6), H(18, hem), H(-18, hem), T(-7, -6)], C.kim);
      px.poly([T(-6, -16), T(-3, -16), H(-10, hem), H(-18, hem), T(-7, -6)], C.kimD);
      px.poly([H(-18, hem - 6), H(18, hem - 6), H(18, hem), H(-18, hem)], C.kimD);
      // ผ้ากันเปื้อนสีขาว
      px.poly([T(-2.5, -4), T(6.5, -4), H(14, 128), H(0, 129)], C.apron);
      px.line(H(1, 128.5), H(14, 127.5), .6, C.kimD); px.line(T(1.5, -3), H(5, 127), .4, '#f1e4ee');
      [[-12, 110], [-8, 124], [-15, 132], [-5, 100], [14, 134]].forEach(([x, y]) => { const q = H(x, y); px.set(q.x, q.y, C.gold); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => px.set(q.x + a, q.y + b, C.pat)); });
      px.poly([T(-6, -9.5), T(7, -9.5), T(7, -4.5), T(-6, -4.5)], C.obi);
      px.line(T(-6, -9), T(7, -9), .5, C.obiD); px.line(T(-6, -7), T(7, -7), .45, C.gold);
      const bow = T(-7, -7); px.disc(bow.x - 2, bow.y - 2, 3, C.obi); px.disc(bow.x - 2, bow.y + 3, 2.6, C.obiD); px.disc(bow.x, bow.y, 1.6, C.obiD);
      px.line(T(-3, -17.5), T(1, -10), 1, C.kimDD); px.line(T(4.5, -17.5), T(1, -10), 1, C.kimDD);
      px.line(n, add(n, 2, 4), 2.6, C.skin);
      // กระดิ่งที่คอ
      px.line(add(n, -2, 1), add(n, 4, .5), .8, C.obi); px.disc(n.x + 2, n.y + 3, 1.8, C.gold); px.set(n.x + 2, n.y + 4, C.obiD);
      animeHead(px, r, { hair: C.hair, hairD: C.hairD, hairL: C.hairL, hairLL: '#7c6aa6', skin: C.skin, skinD: C.skinD, eye: ['#e11d48', '#4c0519', '#fda4af'], lash: '#1c1325', brow: C.hair, mouth: '#be123c', blush: '#fb7185', closed: true,
        extra: (px, P) => {
          spike(px, P(-9, -11), P(-12, -24), 8, C.hair); spike(px, P(-9, -12), P(-11.5, -21), 3.5, C.kimD);
          spike(px, P(4, -14), P(6, -26), 8, C.hair); spike(px, P(4, -14.5), P(5.6, -23), 3.5, C.kimD);
        } });
      arm(px, r.fa, 5.8, C.kim, C.kimD, C.skin, C.skinD);
      drape(px, r.fa, C.kim, C.kimD, 15, C.obi);
    }
  },
  robo: {
    name: 'คีย์บอท', role: 'คู่หู · มาสคอต', npc: 'robo',
    desc: 'บอทแมวลอยได้ หน้าจอเป็นตาสีฟ้า ลอยตามไอริน คอยบอกใบ้และสรุปสถิติหลังจบไฟต์',
    draw(px, r, p, gt) {
      const y = 56 + Math.round(Math.sin(gt * 2.4) * 4);
      blitK(px, ROBO.rows, 64, y, ROBO.pal, 2);
      if (Math.floor(gt * 6) % 2) rect(px, 78, y + 26, 2, 2, '#67e8f9');
      if (Math.floor(gt * 2.5) % 5 === 0) rect(px, 70, y + 10, 20, 2, '#1e1b4b');
      for (let i = 0; i < 3; i++) px.set(70 + i * 9 + (Math.floor(gt * 8) % 3), y + 30 + i % 2 * 3, '#c084fc');
    }
  }
};

/* =================== Render one frame =================== */
const FPS = 15;
const SMEAR = { airin: ['#e9d5ff', 0], oni: ['#fecaca', 50], queen: ['#f5d0fe', 20] };   // [สี, ระยะปลายอาวุธจากมือ]
function animFor(id, state) {
  const set = ANIMS[id];
  return set[state] || set.idle;
}
function poseAt(id, state, tIn, gt) {
  const ch = CHARS[id];
  const p = sampleAnim(animFor(id, state), state === 'idle' ? gt + (ch.phase || 0) : tIn);
  const prev = sampleAnim(animFor(id, state), Math.max(0, (state === 'idle' ? gt : tIn) - 1 / FPS));
  p.sway = Math.max(-4, Math.min(4, Math.sin(gt * 2.2) * .8 - (p.dx - prev.dx) * 1.2 - (p.lean - prev.lean) * .25 - (p.travel - prev.travel) * 6));
  return p;
}
// แสงขอบ: พิกเซลที่ด้านหลัง (ซ้าย) ว่าง → ทาสีแสงขอบ
function rimLight(px, c) {
  const hit = [];
  for (let y = 0; y < px.h; y++) for (let x = 1; x < px.w; x++) if (px.a[y * px.w + x] && !px.a[y * px.w + x - 1]) hit.push(y * px.w + x);
  for (const i of hit) px.a[i] = c;
}
function renderChar(id, state, tIn, gt) {
  tIn = Math.floor(tIn * FPS) / FPS; gt = Math.floor(gt * FPS) / FPS;
  const pose = poseAt(id, state, tIn, gt);
  const px = new Px(SW, SH);
  const r = makeRig(pose);
  CHARS[id].draw(px, r, pose, gt);
  if (CHARS[id].rim) rimLight(px, CHARS[id].rim);
  px.outline(OUT);
  if (state === 'charge' && tIn > .1) { const g = Math.floor(gt * 10) % 2 ? '#ef4444' : '#fb7185'; px.outline(g); px.outline(g + 'aa'); px.outline(g + '55'); }
  if (state === 'ult' && tIn > .3) { const g = Math.floor(gt * 12) % 2 ? '#e879f9' : '#a855f7'; px.outline(g); px.outline(g + 'aa'); px.outline(g + '55'); }
  if (state === 'hurt' && tIn < .1) px.fillAll('#ffffff');
  const sm = SMEAR[id];
  if (sm && pose.smear > .25) {
    const tip = rr => add(rr.fa.h, rr.fa.dir.x * sm[1], rr.fa.dir.y * sm[1]);
    let last = tip(r);
    for (let k = 1; k <= 3; k++) {
      const pp = poseAt(id, state, Math.max(0, tIn - k / (FPS * 2)), gt);
      const cur = tip(makeRig(pp));
      px.line(last, cur, Math.max(1, 3.2 - k * .7), k === 1 ? '#ffffff' : sm[0]);
      if (sm[1]) px.line(add(last, -r.fa.dir.x * sm[1] * .5, -r.fa.dir.y * sm[1] * .5), add(cur, -r.fa.dir.x * sm[1] * .5, -r.fa.dir.y * sm[1] * .5), 1, sm[0] + '99');
      last = cur;
    }
  }
  return { px, pose };
}

/* ---- pixel glyphs (ก + วรรณยุกต์) ---- */
const GKO = ['.XXXX.', 'X....X', '.XX..X', '..X..X', '..X..X', '..X..X', '..X..X'];
const MARKS = [['X', 'X'], ['XX.', '..X', 'XXX'], ['XXX', '.X.', 'X.X'], ['.X.', 'XXX', '.X.']];
function drawGlyphs(ctx, cx, cy, gt, rx = 30, ry = 8) {
  MARKS.forEach((mk, i) => {
    const a = gt * 1.2 + i / MARKS.length * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry + Math.sin(gt * 2 + i) * 2);
    const g = new Px(12, 14);
    g.blit(GKO, 3, 5, { X: '#f0abfc' }); g.blit(mk, 5, 1, { X: '#f0abfc' });
    g.outline('#6b21a8');
    ctx.drawImage(g.toCanvas(tmpCv()), x - 12, y - 14, 24, 28);
  });
}
const cvPool = []; let cvIdx = 0;
function tmpCv() { if (!cvPool[cvIdx]) cvPool[cvIdx] = document.createElement('canvas'); return cvPool[cvIdx++]; }

/* =================== Background (320×180) =================== */
function drawBG() {
  const px = new Px(320, 180);
  const bands = ['#0b0618', '#110a28', '#180e38', '#211248', '#2b1659', '#36196b', '#3f1d79'];
  const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < 150; y++) {
    const f = y / 150 * (bands.length - 1), i = Math.floor(f), fr = f - i;
    for (let x = 0; x < 320; x++) px.set(x, y, fr > (B[y % 4][x % 4] + .5) / 16 ? bands[Math.min(i + 1, bands.length - 1)] : bands[i]);
  }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) px.set(rnd() * 320, rnd() * 90, rnd() < .3 ? '#ffffff' : '#a78bfa');
  for (let y = 18; y < 68; y++) for (let x = 226; x < 276; x++) {
    const d = Math.hypot(x + .5 - 251, y + .5 - 43);
    if (d <= 15) px.set(x, y, '#f5f3ff'); else if (d <= 20 && (x + y) % 2 === 0) px.set(x, y, '#8b5cf6');
  }
  px.disc(246, 40, 3, '#ddd6fe'); px.disc(255, 48, 2, '#ddd6fe');
  // far city
  for (let x = 0; x < 320;) {
    const w = 10 + Math.floor(rnd() * 20), h = 30 + Math.floor(rnd() * 55);
    if (x > 110 && x < 210) { x += w; continue; }
    for (let yy = 150 - h; yy < 150; yy++) for (let xx = x; xx < x + w - 1; xx++) px.set(xx, yy, '#1a1040');
    for (let k = 0; k < h / 5; k++) if (rnd() < .5) px.set(x + 2 + Math.floor(rnd() * (w - 5)), 150 - h + 3 + Math.floor(rnd() * (h - 6)), rnd() < .7 ? '#7c5cff' : '#f0abfc');
    x += w;
  }
  // torii
  const tc = '#3a1450', tl = '#5b1d6e';
  for (let y = 96; y < 150; y++) for (let k = 0; k < 4; k++) { px.set(130 + k, y, tc); px.set(186 + k, y, tc); }
  for (let x = 118; x < 202; x++) { const lift = x < 124 ? 124 - x : x > 196 ? x - 196 : 0; for (let k = 0; k < 4; k++) px.set(x, 88 + k - Math.floor(lift / 2), k ? tc : tl); }
  for (let x = 124; x < 196; x++) for (let k = 0; k < 3; k++) px.set(x, 100 + k, tc);
  for (let y = 92; y < 100; y++) for (let k = 0; k < 3; k++) px.set(159 + k, y, tc);
  // ground
  for (let y = 150; y < 180; y++) for (let x = 0; x < 320; x++) {
    let c = y < 152 ? '#6d4bd6' : '#2b1d55';
    if (y >= 152 && ((x + (y > 165 ? 8 : 0)) % 16 === 0 || y === 165 || y === 179)) c = '#221748';
    if (y > 170) c = (x + y) % 2 ? c : '#1f1544';
    px.set(x, y, c);
  }
  return px.toCanvas(document.createElement('canvas'));
}


/* =================== ศัตรูเพิ่ม: โจรค้อนคีย์ / ภูตตัวเลข =================== */
function banditHead(px, r) {
  const c = r.hc, s = r.sway, P = (x, y) => ({ x: c.x + x, y: c.y + y });
  const M = { skin: '#d9a07a', skinD: '#a8704f', band: '#dc2626', bandD: '#991b1b', bandL: '#f87171', mask: '#111014', eye: '#fde047', beard: '#3f3a36', beardL: '#57534e', mouth: '#5c1a10', tooth: '#fef3c7' };
  // ชายผ้าโพกหัวปลิวด้านหลัง
  spike(px, P(-9, -8), P(-24 + s, -12 + s * .3), 6, M.band);
  spike(px, P(-9, -6), P(-21 + s * .8, -1 + s * .2), 5, M.bandD);
  // หัว + กราม (กว้างกว่าหัวอนิเมะ)
  px.poly([P(-9, -10), P(7, -12), P(12, -5), P(12.5, 4), P(10, 10), P(4, 13.5), P(-4, 13), P(-9, 8), P(-11, -1)], M.skin);
  px.poly([P(-11, -1), P(-9, 8), P(-4, 13), P(-1, 13), P(-6, 6), P(-8, -2)], M.skinD);
  // หู
  px.disc(P(-6, 1).x, P(-6, 1).y, 2.6, M.skinD); px.disc(P(-5.5, .5).x, P(-5.5, .5).y, 1.4, M.skin);
  // ผ้าโพกหัว
  px.poly([P(-11, -2), P(-10, -11), P(-3, -16), P(6, -15.5), P(11, -10), P(12.5, -5), P(-10, -3)], M.band);
  px.line(P(-9, -9), P(4, -14), .6, M.bandL);
  for (const [x, y] of [[-5, -8], [1, -11], [7, -9], [-1, -5]]) { px.set(c.x + x, c.y + y, '#fef2f2'); }
  const kn = P(-10, -6); px.disc(kn.x, kn.y, 2.4, M.bandD);
  // หน้ากากผ้าคาดตา
  px.poly([P(-9, -3), P(12.8, -4.5), P(13, 1), P(-9, 2)], M.mask);
  px.poly([P(1, -2.5), P(5.5, -3), P(5.5, -.2), P(1.5, 0)], M.eye);
  px.poly([P(8.5, -3.2), P(11.5, -3.5), P(11.5, -.6), P(8.5, -.4)], M.eye);
  px.set(c.x + 2, c.y - 2, '#ffffff'); px.set(c.x + 9, c.y - 3, '#ffffff');
  // จมูกใหญ่
  px.poly([P(10, 1), P(14, 4), P(10.5, 5.5)], M.skinD);
  // เครา + ยิ้มแสยะ
  px.poly([P(-6, 7), P(1, 8), P(12, 6.5), P(10.5, 11), P(4, 14.5), P(-3, 13.5)], M.beard);
  px.line(P(-2, 11), P(8, 12), .5, M.beardL);
  px.poly([P(3, 7.5), P(11, 6.5), P(10, 9.5), P(4, 10)], M.mouth);
  px.line(P(3.5, 7.8), P(10.5, 7), .6, M.tooth); px.set(c.x + 6, c.y + 9, M.tooth);
}

CHARS.bandit = {
  name: 'โจรค้อนคีย์', role: 'ศัตรู · แป้นแถวบน', theme: 'red', enemy: true, rim: '#fdba74',
  desc: 'โจรร่างหนา ผ้าโพกหัวแดง ผ้าปิดตา แบกค้อนหัวปุ่มคีย์บอร์ด Q',
  draw(px, r) {
    const C = { shirt: '#7c2d12', shirtD: '#4a1a0a', vest: '#a16207', vestD: '#6b4105', vestL: '#ca8a04', skin: '#d9a07a', skinD: '#a8704f', pants: '#3f3a5a', pantsD: '#26233a', boot: '#1c1917', bootD: '#0c0a09', belt: '#292524', buckle: '#fbbf24', wood: '#92400e', woodD: '#5c2a08', cap: '#e5e7eb', capD: '#9ca3af', capT: '#ffffff', glyph: '#7c3aed', wrap: '#f5f5f4' };
    const T = r.T;
    arm(px, r.ba, 6.4, C.skinD, '#7a4d33', C.skinD, '#7a4d33');
    strap(px, r.ba, .75, 4.4, .8, C.wrap);
    const lg = { th: 7, kn: 6, an: 5, foot: 8.5, boot: C.boot, bootD: C.bootD, bootAt: .55 };
    leg(px, r.bl, { ...lg, c: C.pantsD, d: '#17152a' });
    leg(px, r.fl, { ...lg, c: C.pants, d: C.pantsD });
    // ลำตัวกว้าง พุงยื่น
    px.poly([T(-9, -19), T(8, -19), T(10.5, -9), T(9, -2), T(-8, -2), T(-10, -10)], C.shirt);
    px.poly([T(-9, -19), T(-5, -19), T(-5, -2), T(-8, -2), T(-10, -10)], C.shirtD);
    // เสื้อกั๊กหนังเปิดหน้า
    px.poly([T(-9.5, -19), T(-1, -19), T(-2, -3), T(-8.5, -3)], C.vest);
    px.poly([T(4, -19), T(8.5, -19), T(10, -9), T(8.5, -3), T(4.5, -3)], C.vest);
    px.line(T(-1.2, -18.5), T(-2, -4), .6, C.vestD); px.line(T(4.2, -18.5), T(4.6, -4), .6, C.vestD);
    px.line(T(-8, -16), T(-3, -16), .5, C.vestL); px.line(T(5, -16), T(8, -16), .5, C.vestL);
    for (const y of [-14, -10, -6]) { const q = T(-1.5, y); px.set(q.x, q.y, C.buckle); }
    // เข็มขัดใหญ่
    px.poly([T(-9, -4), T(9.5, -4), T(9.5, -1), T(-9, -1)], C.belt);
    const bk = T(1.5, -2.5); rect(px, bk.x - 2, bk.y - 2, 5, 4, C.buckle); rect(px, bk.x - 1, bk.y - 1, 3, 2, C.belt);
    // สะโพก
    px.poly([T(-7, -1, false), T(7.5, -1, false), T(8, 4, false), T(-7, 4, false)], C.pants);
    banditHead(px, r);
    // ค้อน: ด้ามไม้ + หัวปุ่มคีย์ (ตั้งฉากกับด้าม)
    const d = r.fa.dir, h = r.fa.h, A = (k, o = 0) => add(h, d.x * k - d.y * o, d.y * k + d.x * o);
    px.line(A(-6), A(30), 1.8, C.wood); px.line(A(-5, .8), A(29, .8), .5, C.woodD);
    for (let k = -4; k < 3; k += 2) { const q = A(k); px.set(q.x, q.y, C.wrap); }
    px.poly([A(26, -11), A(26, 11), A(42, 11), A(42, -11)], C.capD);
    px.poly([A(27, -9), A(27, 8.5), A(40, 8.5), A(40, -9)], C.cap);
    px.poly([A(28, -8), A(28, -2), A(39, -2), A(39, -8)], C.capT);
    const g = A(33.5, 0); px.disc(g.x, g.y, 3.6, C.glyph); px.disc(g.x, g.y, 1.8, C.cap); px.line(g, add(g, 3.5, 3.5), .8, C.glyph);
    arm(px, r.fa, 6.6, C.skin, C.skinD, C.skin, C.skinD);
    strap(px, r.fa, .78, 4.6, .8, C.wrap);
  }
};

const DIGITS = {
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'], '3': ['XXX', '..X', '.XX', '..X', 'XXX'], '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
  '#': ['X.X', 'XXX', 'X.X', 'XXX', 'X.X'], '%': ['X.X', '..X', '.X.', 'X..', 'X.X'], '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX']
};
CHARS.ghost = {
  name: 'ภูตตัวเลข', role: 'ศัตรู · ตัวเลข/สัญลักษณ์', theme: 'red', enemy: true, rim: '#cffafe',
  desc: 'ภูตลอยตัวสีฟ้าเรืองแสง มีตัวเลขและสัญลักษณ์หมุนวนรอบตัว',
  draw(px, r, p, gt) {
    const C = { body: '#5fd8ee', bodyD: '#1f8fb0', bodyDD: '#0e5a78', bodyL: '#cffafe', eye: '#0c2a4a', glow: '#fde047', mouth: '#0c2a4a', tongue: '#f472b6', dig: '#fde047', digD: '#ca8a04' };
    const T = r.T, s = r.sway, bob = Math.round(Math.sin(gt * 2.4) * 3);
    const c = add(T(1, -12), 0, bob - 6), Q = (x, y) => ({ x: c.x + x, y: c.y + y });
    // ตัวเลขด้านหลัง (ครึ่งวงโคจรด้านหลัง)
    const digs = Object.keys(DIGITS), orbit = [];
    digs.forEach((ch, i) => {
      const a = gt * 1.3 + i / digs.length * Math.PI * 2;
      orbit.push({ ch, x: Math.round(80 + Math.cos(a) * 52), y: Math.round(54 + Math.sin(a) * 12 + Math.sin(gt * 2 + i) * 3), back: Math.sin(a) < 0 });
    });
    const drawDig = o => blitK(px, DIGITS[o.ch], o.x - 3, o.y - 5, { X: o.back ? C.digD : C.dig }, 2);
    orbit.filter(o => o.back).forEach(drawDig);
    // แขนหลัง (ตอสั้น)
    px.taper(Q(-6, 4), lerp(r.ba.s, r.ba.e, 1.2), 5, 3, C.bodyD);
    // หาง/ชายผ้าปลิว
    const tail = [Q(-22, 4), Q(-30 + s, 22), Q(-40 + s * 1.5, 34), Q(-28 + s, 32), Q(-20, 40), Q(-10, 34), Q(-2, 42), Q(8, 32), Q(16, 38), Q(20, 18)];
    px.poly(tail, C.body);
    px.poly([Q(-22, 4), Q(-30 + s, 22), Q(-40 + s * 1.5, 34), Q(-28 + s, 32), Q(-20, 40), Q(-14, 20)], C.bodyD);
    // หัวโดม
    px.disc(c.x, c.y - 4, 23, C.body);
    px.disc(c.x - 4, c.y - 2, 21, C.body);
    px.poly([Q(-25, 0), Q(-24, -10), Q(-16, -22), Q(-8, -24), Q(-14, -14), Q(-20, 4)], C.bodyD);
    px.line(Q(-4, -24), Q(8, -24), .8, C.bodyL); px.line(Q(-12, -20), Q(-6, -23), .7, C.bodyL);
    px.disc(Q(12, -14).x, Q(12, -14).y, 2.4, C.bodyL);
    // ตาโกรธ เรืองแสง
    px.poly([Q(0, -8), Q(8, -6), Q(8, 4), Q(1, 4)], C.eye);
    px.poly([Q(11, -6), Q(17, -8), Q(17, 3), Q(11, 4)], C.eye);
    px.disc(Q(5, 0).x, Q(5, 0).y, 1.8, C.glow); px.disc(Q(14.5, -1).x, Q(14.5, -1).y, 1.5, C.glow);
    px.line(Q(-1, -10), Q(9, -7), .9, C.bodyDD); px.line(Q(11, -7), Q(18, -10), .9, C.bodyDD);
    // ปากกว้าง + ลิ้น
    px.poly([Q(2, 9), Q(17, 8), Q(14, 16), Q(5, 16)], C.mouth);
    px.poly([Q(7, 13), Q(13, 13), Q(12, 16), Q(8, 16)], C.tongue);
    px.line(Q(3, 9.2), Q(16, 8.2), .5, C.bodyL);
    // แขนหน้า (ตอสั้น ต่อยออกไป)
    px.taper(Q(10, 10), lerp(r.fa.s, r.fa.e, 1.25), 5.5, 3.6, C.body);
    const fist = lerp(r.fa.s, r.fa.e, 1.3); px.disc(fist.x, fist.y, 3.6, C.bodyL);
    orbit.filter(o => !o.back).forEach(drawDig);
  }
};
ANIMS.bandit = ANIMS.oni;
ANIMS.ghost = FIGHTER;
SMEAR.bandit = ['#fde68a', 36];
SMEAR.ghost = ['#a5f3fc', 0];

/* =================== บอสใหม่ 4 ตัว: กระจก / ล่องหน / สลับแป้น / แฝด =================== */
CHARS.mirror = {
  name: 'จอมกระจกเงา', role: 'บอส · คำกลับด้าน', theme: 'red', enemy: true, rim: '#e0f2fe',
  desc: 'จอมเวทชุดผลึกเงิน มีเศษกระจกลอยหมุนรอบตัว คทากระจกสะท้อนคำกลับด้าน',
  draw(px, r, p, gt) {
    const C = { robe: '#334155', robeD: '#1e293b', robeL: '#64748b', trim: '#7dd3fc', trimL: '#e0f2fe', glass: '#bae6fd', glassL: '#ffffff', glassD: '#38bdf8', hood: '#0f172a', eye: '#38bdf8', eyeL: '#ffffff', silver: '#cbd5e1', silverD: '#94a3b8' };
    const T = r.T, hip = r.hip, s = r.sway, hem = 140, H = (x, y) => ({ x: hip.x + x, y });
    // เศษกระจกด้านหลัง
    const shards = [];
    for (let i = 0; i < 6; i++) {
      const a = gt * 1.4 + i * Math.PI / 3;
      shards.push({ x: Math.round(80 + Math.cos(a) * 50), y: Math.round(62 + Math.sin(a) * 14 + Math.sin(gt * 2.5 + i) * 3), back: Math.sin(a) < 0, i });
    }
    const drawShard = sh => {
      const x = sh.x, y = sh.y;
      px.poly([{ x, y: y - 7 }, { x: x + 4, y }, { x, y: y + 7 }, { x: x - 4, y }], sh.back ? C.glassD : C.glass);
      px.line({ x, y: y - 6 }, { x: x + 2, y: y - 1 }, .45, sh.back ? C.glass : C.glassL);
    };
    shards.filter(o => o.back).forEach(drawShard);
    // ผ้าคลุมเงินปลิว
    const cp = (x, y) => add(T(x, y, false), s * Math.max(0, y + 12) / 5, 0);
    px.poly([T(-6, -18), T(4, -18), cp(-14, 16), cp(-20, 10), cp(-16, -6)], C.robeD);
    arm(px, r.ba, 5.4, C.robeD, C.hood, C.silverD, C.robeD);
    drape(px, r.ba, C.robeD, C.hood, 18, C.trim);
    // ชุดคลุมผลึกยาว
    px.poly([T(-7, -17), T(7, -17), T(8, -5), H(19, hem), H(-19, hem), T(-8, -5)], C.robe);
    px.poly([T(-7, -16), T(-3, -16), H(-10, hem), H(-19, hem), T(-8, -5)], C.robeD);
    px.poly([T(3, -6), T(8, -5), H(19, hem), H(11, hem)], C.robeL);
    px.line(H(-18, hem - 6), H(18, hem - 6), .8, C.trim);
    // ลายกระจกกลางอก
    const cr = T(1, -11);
    px.poly([add(cr, 0, -6), add(cr, 5, 0), add(cr, 0, 6), add(cr, -5, 0)], C.glass);
    px.poly([add(cr, 0, -4), add(cr, 2.5, 0), add(cr, 0, 4), add(cr, -2.5, 0)], C.glassL);
    // หัวฮู้ด + หน้ากากกระจก
    const c = r.hc, P = (x, y) => ({ x: c.x + x, y: c.y + y });
    px.poly([P(-13, -12), P(4, -17), P(12, -8), P(12, 8), P(3, 14), P(-11, 12), P(-15, 0)], C.robe);
    px.poly([P(-13, -12), P(-5, -15), P(-7, 12), P(-11, 12), P(-15, 0)], C.robeD);
    px.line(P(-2, -16), P(11, -7), .8, C.trim);
    // หน้ากากผลึกสีเงินสะท้อนแสง
    px.poly([P(-2, -10), P(9, -9), P(11, 0), P(8, 10), P(-1, 10), P(-5, 0)], C.glass);
    px.poly([P(-5, 0), P(-1, 10), P(3, 10), P(-1, 0), P(2, -10), P(-2, -10)], C.silver);
    px.line(P(2, -9), P(8, 8), .5, C.glassL);
    // ตาเรืองแสงฟ้าผ่านหน้ากาก
    px.line(P(1, -2), P(6, -3), .9, C.eye); px.set(c.x + 3, c.y - 2, C.eyeL);
    px.line(P(8, -3), P(10.5, -2.5), .8, C.eye);
    // คทากระจก
    const d = r.fa.dir, h = r.fa.h, A = (k, o = 0) => add(h, d.x * k - d.y * o, d.y * k + d.x * o);
    px.line(A(-10), A(36), 1.6, C.silverD); px.line(A(-9, -.8), A(35, -.8), .5, C.glassL);
    px.poly([A(32, -8), A(44, 0), A(32, 8), A(26, 0)], C.trim);
    px.poly([A(33, -5), A(40, 0), A(33, 5), A(29, 0)], C.glassL);
    arm(px, r.fa, 5.4, C.robe, C.robeD, C.silver, C.silverD);
    drape(px, r.fa, C.robeL, C.robeD, 18, C.trimL);
    shards.filter(o => !o.back).forEach(drawShard);
  }
};

CHARS.phantom = {
  name: 'ภูตล่องหน', role: 'บอส · คำจางหาย', theme: 'red', enemy: true, rim: '#99f6e4',
  desc: 'วิญญาณนักฆ่าในผ้าคลุมหมอก มีดวงตาเรืองแสงกลางหน้ากากและควันวิญญาณ',
  draw(px, r, p, gt) {
    const C = { cl: '#1e1b4b', clD: '#0f0d2e', clL: '#3730a3', mist: '#2dd4bf', mistD: '#0f766e', mistL: '#ccfbf1', eye: '#5eead4', eyeC: '#ffffff', mask: '#09071a', blade: '#5eead4', bladeL: '#f0fdfa' };
    const T = r.T, s = r.sway, bob = Math.round(Math.sin(gt * 2.2) * 4);
    const Q = (x, y) => add(T(x, y), 0, bob);
    // ควันล่องหนรอบตัว
    for (let i = 0; i < 5; i++) {
      const ph = (gt * .9 + i * .2) % 1;
      const mx = Math.round(80 + Math.sin(gt * 2 + i * 1.4) * 32), my = Math.round(128 - ph * 55);
      px.disc(mx, my, 3.2 * (1 - ph * .6), i % 2 ? C.mistD : C.mist);
    }
    // ชายผ้าคลุมขาดลอยเหนือพื้น
    px.poly([Q(-9, -18), Q(8, -18), Q(14, 14), Q(8, 22), Q(3, 14), Q(-3, 24), Q(-9, 15), Q(-16 + s * .5, 22), Q(-15, 2)], C.cl);
    px.poly([Q(-9, -18), Q(-3, -18), Q(-5, 16), Q(-16 + s * .5, 22), Q(-15, 2)], C.clD);
    px.line(Q(14, 14), Q(8, 22), .6, C.mistD); px.line(Q(-3, 24), Q(-9, 15), .6, C.mist);
    // ผ้าพันคอเรืองแสง
    px.poly([Q(-9, -18), Q(9, -18), Q(8, -12), Q(-10, -12)], C.mistD);
    px.line(Q(-9, -17), Q(8, -17), .6, C.mist);
    spike(px, Q(-9, -15), add(Q(-26, -10), s * .8, Math.sin(gt * 3) * 3), 5, C.mist);
    // หัว + ดวงตาใหญ่กลางหน้ากาก
    const c = add(r.hc, 0, bob), P = (x, y) => ({ x: c.x + x, y: c.y + y });
    px.poly([P(-13, -10), P(3, -16), P(12, -8), P(11, 8), P(2, 13), P(-12, 10), P(-15, -2)], C.cl);
    px.poly([P(-3, -9), P(10, -7), P(11, 4), P(6, 10), P(-3, 8), P(-5, -1)], C.mask);
    // ดวงตาล่องหน (กะพริบจางเป็นจังหวะ)
    const open = (Math.floor(gt * 1.5) % 5) !== 0;
    if (open) {
      px.poly([P(-1, -1), P(4.5, -5.5), P(10, -1), P(4.5, 3.5)], C.eye);
      px.disc(c.x + 4.5, c.y - 1, 2.2, C.eyeC);
      px.set(c.x + 5, c.y - 1, C.mask);
    } else {
      px.line(P(-1, -1), P(10, -1), .7, C.eye);
    }
    // กริชวิญญาณ
    const d = r.fa.dir, h = add(r.fa.h, 0, bob), A = (k, o = 0) => add(h, d.x * k - d.y * o, d.y * k + d.x * o);
    px.line(A(-5), A(30), 1.5, C.blade);
    px.line(A(0, -.7), A(26, -.7), .5, C.bladeL);
    spike(px, A(27), A(36, 0), 3, C.bladeL);
    arm(px, { ...r.fa, s: add(r.fa.s, 0, bob), e: add(r.fa.e, 0, bob), h }, 4.8, C.clL, C.clD, C.mist, C.mistD);
  }
};

CHARS.jester = {
  name: 'ตัวตลกสลับแป้น', role: 'บอส · สลับปุ่มกลางไฟต์', theme: 'red', enemy: true, rim: '#bef264',
  desc: 'ตัวตลกไซเบอร์พังก์หมวกเขากระดิ่งปุ่มคีย์ สลับแป้นพิมพ์กลางไฟต์',
  draw(px, r, p, gt) {
    const C = { a: '#4d7c0f', aL: '#a3e635', aD: '#365314', b: '#7e22ce', bL: '#c084fc', bD: '#4c1d95', gold: '#facc15', goldD: '#ca8a04', white: '#f8fafc', dark: '#18181b', eye: '#a3e635', cap: '#f1f5f9', capD: '#94a3b8' };
    const T = r.T, s = r.sway;
    arm(px, r.ba, 4.8, C.bD, C.dark, C.white, C.capD);
    leg(px, r.bl, { c: C.bD, d: C.dark, boot: C.a, bootD: C.aD, foot: 10 });
    leg(px, r.fl, { c: C.a, d: C.aD, boot: C.b, bootD: C.bD, foot: 10 });
    // ลำตัวลายสลับสองสี (เขียว-ม่วง)
    px.poly([T(-7, -17), T(0, -17), T(0, -2), T(-6, -2)], C.b);
    px.poly([T(0, -17), T(7, -17), T(6, -2), T(0, -2)], C.a);
    // ปกคอจีบแฉก
    for (let x = -7; x <= 6; x += 4) spike(px, T(x, -17), T(x + 1, -11), 5, x % 8 === 0 ? C.aL : C.gold);
    // หัว + หน้ากากครึ่งยิ้ม + หมวกตัวตลก 2 เขา
    const c = r.hc, P = (x, y) => ({ x: c.x + x, y: c.y + y });
    // เขาหมวกซ้าย-ขวาพร้อมปุ่มคีย์ห้อยปลาย
    px.taper(P(-5, -12), P(-22 + s * .8, -22), 5, 2, C.b);
    px.taper(P(3, -13), P(16 + s * .4, -26), 5, 2, C.a);
    const b1 = P(-23 + s * .8, -22), b2 = P(17 + s * .4, -26);
    rect(px, b1.x - 3, b1.y - 3, 6, 6, C.gold); px.set(b1.x, b1.y, C.dark);
    rect(px, b2.x - 3, b2.y - 3, 6, 6, C.aL); px.set(b2.x, b2.y, C.dark);
    // หน้ากาก
    px.poly([P(-8, -11), P(8, -11), P(11, -2), P(9, 10), P(1, 13), P(-8, 9), P(-10, -2)], C.white);
    px.poly([P(-8, -11), P(1, -11), P(1, 13), P(-8, 9), P(-10, -2)], C.dark);
    // ตา + รอยยิ้มกว้าง
    px.disc(c.x + 2, c.y - 3, 2.3, C.eye); px.disc(c.x + 8, c.y - 3, 2, C.bL);
    px.line(P(-2, 5), P(9, 4), .9, C.b); px.line(P(-1, 6), P(8, 5), .5, C.aL);
    // ปุ่มคีย์ลอยเล่นกลรอบมือ
    for (let i = 0; i < 3; i++) {
      const a = gt * 3.6 + i * 2.1, kx = Math.round(r.fa.h.x + 12 + Math.cos(a) * 14), ky = Math.round(r.fa.h.y - 10 + Math.sin(a) * 10);
      rect(px, kx - 4, ky - 4, 8, 8, C.capD); rect(px, kx - 3, ky - 3, 6, 5, C.cap);
      px.set(kx, ky - 1, i % 2 ? C.b : C.aD);
    }
    arm(px, r.fa, 4.8, C.aL, C.aD, C.white, C.capD);
  }
};

CHARS.twins = {
  name: 'แฝดแห่งคีย์บอร์ด', role: 'บอส · ศัตรู 2 ตัวพร้อมกัน', theme: 'red', enemy: true, rim: '#fde68a',
  alive: [1, 1],   // อัปเดตจากเกมเมื่อแฝดตัวใดตัวหนึ่งล้ม
  desc: 'นักสู้ฝาแฝด อัคคี (แดง) และ วารี (ฟ้า) สลับกันรุกไล่พร้อมกัน',
  draw(px, r, p, gt) {
    const alive = CHARS.twins.alive || [1, 1];
    const drawOne = (ox, oy, C, phase) => {
      const bob = Math.round(Math.sin(gt * 3 + phase) * 2);
      const S = pt => ({ x: pt.x + ox, y: pt.y + oy + bob });
      const T = (rx, ry, u = true) => S(r.T(rx * .76, ry * .76, u));
      const limbS = l => ({ s: S(l.s), e: S(lerp(l.s, l.e, .78)), h: S(lerp(l.s, l.h, .78)), dir: l.dir });
      const fa = limbS(r.fa), ba = limbS(r.ba), fl = limbS(r.fl), bl = limbS(r.bl);
      arm(px, ba, 3.8, C.mainD, C.dark, C.glow, C.mainD);
      leg(px, bl, { th: 4.2, kn: 3.4, an: 2.8, foot: 6, c: C.dark, d: '#090714', boot: C.mainD, bootD: C.dark });
      leg(px, fl, { th: 4.2, kn: 3.4, an: 2.8, foot: 6, c: C.pants, d: C.dark, boot: C.main, bootD: C.mainD });
      px.poly([T(-7, -17), T(7, -17), T(6, -2), T(-6, -2)], C.main);
      px.line(T(-5, -12), T(5, -12), .7, C.glow);
      // หัว + ผ้าคาดผม + ผมแหลม
      const hc = S({ x: r.hc.x * .9 + 8, y: r.hc.y + 8 }), P = (x, y) => ({ x: hc.x + x, y: hc.y + y });
      px.poly([P(-10, -8), P(5, -11), P(9, -3), P(7, 8), P(-5, 9), P(-11, 1)], C.hair);
      spike(px, P(-7, -5), P(-20 + r.sway * .6, -8 + phase), 5, C.glow);
      px.poly([P(-2, -6), P(8, -5), P(8, 5), P(1, 8), P(-3, 3)], '#f6d1bc');
      px.line(P(-7, -6), P(8, -7), 1.1, C.main);
      px.disc(hc.x + 4, hc.y, 1.5, C.glow); px.set(hc.x + 4, hc.y, '#ffffff');
      // ดาบสั้นพลังงาน
      const d = fa.dir, h = fa.h, A = k => add(h, d.x * k, d.y * k);
      px.line(A(-3), A(26), 1.4, C.glow); px.line(A(0), A(24), .6, '#ffffff');
      arm(px, fa, 4, C.main, C.mainD, C.glow, C.mainD);
    };
    // วารี (ฟ้า) ยืนหลัง-ซ้ายเล็กน้อย · อัคคี (แดง) ยืนหน้า-ขวาเล็กน้อย
    if (alive[1]) drawOne(-14, -4, { main: '#0284c7', mainD: '#075985', glow: '#67e8f9', hair: '#0c4a6e', pants: '#1e3a5f', dark: '#082f49' }, 2.2);
    if (alive[0]) drawOne(14, 2,   { main: '#dc2626', mainD: '#7f1d1d', glow: '#fb923c', hair: '#450a0a', pants: '#3b1518', dark: '#1c090b' }, 0);
  }
};

ANIMS.mirror = ANIMS.queen;
ANIMS.phantom = FIGHTER;
ANIMS.jester = FIGHTER;
ANIMS.twins = FIGHTER;
SMEAR.mirror = ['#bae6fd', 34];
SMEAR.phantom = ['#5eead4', 30];
SMEAR.jester = ['#a3e635', 0];
SMEAR.twins = ['#fde047', 24];


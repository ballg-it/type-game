// ทดสอบ PvP: 2 หน้าในเบราว์เซอร์เดียว ใช้ Peer ปลอมผ่าน BroadcastChannel (ไม่ต้องใช้เน็ต)
// node pvp.js [modeA] [modeB]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const FAKE = `(() => {
  const bc = new BroadcastChannel('fakepeer'), peers = [];
  class Em { constructor() { this.h = {}; } on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } }
  class Conn extends Em {
    constructor(peer, remote, cid) { super(); this.peer = remote; this.local = peer; this.cid = cid; this.open = false; }
    send(d) { if (this.open) bc.postMessage({ type: 'data', cid: this.cid, to: this.peer, d: JSON.parse(JSON.stringify(d)) }); }
    close() { if (!this.open) return; this.open = false; bc.postMessage({ type: 'close', cid: this.cid, to: this.peer }); this.emit('close'); }
  }
  window.Peer = class extends Em {
    constructor(id) {
      super(); this.id = id || 'anon' + Math.random().toString(36).slice(2); this.conns = {}; peers.push(this);
      setTimeout(() => this.emit('open', this.id), 30);
    }
    connect(to) {
      const cid = Math.random().toString(36).slice(2), c = new Conn(this, to, cid); this.conns[cid] = c;
      bc.postMessage({ type: 'conn', from: this.id, to, cid });
      c._t = setTimeout(() => this.emit('error', { type: 'peer-unavailable' }), 600);
      return c;
    }
    destroy() { Object.values(this.conns).forEach(c => c.close()); peers.splice(peers.indexOf(this), 1); }
  };
  bc.onmessage = ({ data: m }) => {
    for (const p of peers) {
      if (m.to !== p.id) continue;
      if (m.type === 'conn') { const c = new Conn(p, m.from, m.cid); p.conns[m.cid] = c; p.emit('connection', c); bc.postMessage({ type: 'ack', cid: m.cid, to: m.from }); setTimeout(() => { c.open = true; c.emit('open'); }, 20); }
      const c = p.conns[m.cid]; if (!c) continue;
      if (m.type === 'ack') { clearTimeout(c._t); setTimeout(() => { c.open = true; c.emit('open'); }, 20); }
      if (m.type === 'data') c.emit('data', m.d);
      if (m.type === 'close' && c.open) { c.open = false; c.emit('close'); }
    }
  };
  addEventListener('pagehide', () => peers.slice().forEach(p => p.destroy()));
})();`;
const root = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split(/[?#]/)[0])); fs.readFile(f, (e, d) => { r.writeHead(e ? 404 : 200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }); r.end(d); }); });
(async () => {
  await new Promise(ok => srv.listen(0, ok));
  const url = `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1100, height: 720 } });
  await ctx.addInitScript(FAKE);
  const errs = [];
  const open = async (mode, tag) => {
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(tag + ': ' + e.message)); pg.on('console', m => m.type() === 'error' && errs.push(tag + ': ' + m.text()));
    await pg.goto(url); await pg.click(`[data-group=mode] [data-v=${mode}]`);
    return pg;
  };
  const type = (pg, t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v = ''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  const opt = (pg, name) => pg.evaluate(n => PV.opts.find(o => o.name === n).w.text, name);
  const A = await open(process.argv[2] || 'th', 'A'), B = await open(process.argv[3] || 'en', 'B');
  // A: พิมพ์ "ดวล" ที่เมนู → สร้างห้อง
  await type(A, await A.evaluate(() => PVP_OPEN[metaLang()]));
  await type(A, await opt(A, 'สร้างห้อง'));
  await A.waitForTimeout(200);
  const code = await A.evaluate(() => PV.code);
  console.log('A step', await A.evaluate(() => PV.step), 'code', code);
  await A.screenshot({ path: 'pvp-wait.png' });
  // B: ผิดรหัสก่อน → ไม่พบห้อง
  await B.click('#pvpBtn');
  await type(B, await opt(B, 'เข้าห้อง'));
  const bad = code.map(i => (i + 1) % 16);
  for (const i of bad) await type(B, await B.evaluate(i => PV_CODE[i][2], i));
  await B.waitForTimeout(900);
  console.log('B wrong code ->', await B.evaluate(() => [PV.step, PV.stat]));
  // รหัสถูก (คำแรกไทย คำถัดไปอังกฤษ) + ทดสอบ Backspace
  await type(B, await opt(B, 'เข้าห้อง'));
  await type(B, await B.evaluate(i => PV_CODE[i][1], code[0]));
  await type(B, await B.evaluate(() => PV_CODE[5][2]));
  await B.keyboard.press('Backspace');
  console.log('after backspace', await B.evaluate(() => PV.code));
  await B.screenshot({ path: 'pvp-join.png' });
  for (const i of code.slice(1)) await type(B, await B.evaluate(i => PV_CODE[i][2], i));
  await A.waitForTimeout(400);
  console.log('phases', await A.evaluate(() => phase), await B.evaluate(() => phase));
  await A.waitForTimeout(2600);
  console.log('after countdown', await A.evaluate(() => [phase, S.running, FOE.name]), await B.evaluate(() => [phase, S.running, FOE.name]));

  // บอท: A พิมพ์เร็ว กันท่าหนัก · B พิมพ์ช้ากว่า ใช้คำแรงบ่อย
  const bot = async (pg, cfg) => {
    const s = await pg.evaluate(() => ({ phase, run: S.running, def: S.def && S.def.text, ult: S.ultMode && S.ultWord.text, ultR: S.ult, slots: S.slots.map(w => w.text),
      rem: S.def ? S.enemy.chargeMax - S.enemy.charge : 0 }));
    if (s.phase !== 'fight' || !s.run) return s;
    if (s.ult) { await type(pg, s.ult); return s; }
    if (s.def && s.rem < cfg.blockAt) { await type(pg, s.def); return s; }
    if (s.ultR >= 100 && cfg.ult) { await pg.keyboard.press('Tab'); return s; }
    const i = cfg.pickSlot(); if (await pg.evaluate(() => S.pvOut) && i === 2) return s;
    await type(pg, s.slots[i]);
    return s;
  };
  const ca = { block: true, blockAt: 0.3, ult: true, pickSlot: () => Math.floor(Math.random() * 3) };
  const cb = { block: true, blockAt: 1.5, ult: false, pickSlot: () => Math.random() < .5 ? 2 : 0 };
  let shot = 0;
  const fight = async () => {
    for (let t = 0; t < 400; t++) {
      const [sa, sb] = await Promise.all([bot(A, ca), t % 2 ? bot(B, cb) : B.evaluate(() => ({ phase }))]);
      if (t === 30 && !shot++) { await A.screenshot({ path: 'pvp-fightA.png' }); await B.screenshot({ path: 'pvp-fightB.png' }); }
      if (t % 15 === 0) console.log('t', t, await A.evaluate(() => [S.stats.words, S.stats.errors, Math.ceil(S.php), S.pvQ.length, !!S.def]), await B.evaluate(() => [S.stats.words, S.stats.errors, Math.ceil(S.php), S.pvQ.length, !!S.def]));
      if (sa.phase === 'pvp' && sb.phase === 'pvp') return;
      await A.waitForTimeout(140);
    }
  };
  await fight();
  const res = pg => pg.evaluate(() => ({ title: PV.last.title, sub: PV.last.sub, step: PV.step, dealt: Math.round(document.body.innerText.length && 0) }));
  console.log('result A', await res(A), 'B', await res(B));
  console.log('hp check', await A.evaluate(() => [Math.ceil(S.php), Math.ceil(S.ehp), S.stats.blocks, S.stats.counters, S.stats.heavy]), await B.evaluate(() => [Math.ceil(S.php), Math.ceil(S.ehp), S.stats.blocks, S.stats.counters, S.stats.heavy]));
  await A.screenshot({ path: 'pvp-resA.png' }); await B.screenshot({ path: 'pvp-resB.png' });
  // รีแมตช์
  await type(B, await opt(B, 'ดวลอีกตา'));
  await A.waitForTimeout(200);
  console.log('A stat', await A.evaluate(() => PV.stat));
  await type(A, await opt(A, 'ดวลอีกตา'));
  await A.waitForTimeout(3000);
  console.log('rematch', await A.evaluate(() => [phase, S.running, S.php]), await B.evaluate(() => [phase, S.running, S.php]));
  for (let t = 0; t < 20; t++) { await bot(A, ca); await bot(B, cb); await A.waitForTimeout(150); }
  // B ปิดหน้าไปกลางไฟต์ → A ชนะโดยปริยาย
  await B.close();
  await A.waitForTimeout(2400);
  console.log('forfeit', await A.evaluate(() => [phase, PV.step, PV.last && PV.last.sub, PV.opts.map(o => o.name + (o.off ? '(off)' : ''))]));
  await type(A, await opt(A, 'กลับเมนู'));
  console.log('back', await A.evaluate(() => [phase, R.pvp, !document.getElementById('startScr').hidden]));
  // กลับมาเล่นรันปกติได้
  await A.keyboard.press('Enter'); await A.waitForTimeout(300);
  console.log('normal run', await A.evaluate(() => [phase, !!R.map, R.pvp]));
  console.log('errors', errs);
  await b.close(); srv.close();
})();

// Online PvP over the REAL PeerJS server: two headless Chromes host/join, fight, check opposite results, rematch,
// then kill one browser and check the other wins by forfeit (heartbeat). Needs internet.
// Usage: node tests/pvp-live-cdp.js [url=https://ballg-it.github.io/type-game/]   (or file:///D:/1234/index.html)
const { spawn } = require('child_process'); const os = require('os'), path = require('path'), fs = require('fs');
const URL = process.argv[2] || 'https://ballg-it.github.io/type-game/';
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const procs = [];
async function open(port, mode) {
  const prof = path.join(os.tmpdir(), 'tg-pvp-' + port + '-' + Date.now()); fs.mkdirSync(prof, { recursive: true });
  procs.push(spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' }));
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value).join(' ')); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  await cmd('Runtime.enable'); await cmd('Page.enable'); await cmd('Page.navigate', { url: URL }); await sleep(3000);
  await ev(`localStorage.setItem('typegame.tourDone','1'); document.querySelector('[data-group=mode] [data-v=${mode}]').click()`);
  const type = t => ev(`(()=>{const kb=document.getElementById('kb');for(const ch of ${JSON.stringify(t)}){kb.value+=ch;kb.dispatchEvent(new Event('input'))}})()`);
  return { ev, type, errs, ws };
}
(async () => {
  const A = await open(9461, 'th'), B = await open(9462, 'en');
  await A.ev(`showPvp(); pvHost()`);
  let code; for (let i = 0; i < 60; i++) { const s = await A.ev(`({step: PV.step, stat: PV.stat, code: PV.code})`); if (s.step === 'wait') { code = s.code; break; } if (s.step === 'home') { console.log('host failed', s.stat); break; } await sleep(500); }
  console.log('room code', code);
  if (!code) { procs.forEach(p => p.kill()); process.exit(1); }
  const t0 = Date.now();
  await B.ev(`showPvp(); pvJoin(${JSON.stringify(code)})`);
  let connected = false;
  for (let i = 0; i < 80; i++) { const a = await A.ev(`phase`), b = await B.ev(`phase`); if (a === 'fight' && b === 'fight') { connected = true; break; } await sleep(500); }
  console.log('both in fight:', connected, 'after', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const bot = P => P.ev(`({phase, run: !!(S && S.running), def: S && S.def && S.def.text, ult: S && S.ultMode && S.ultWord && S.ultWord.text, ultR: S ? S.ult : 0, w: S && S.slots ? (S.slots.find((w,i)=>i===1&&w)||S.slots[0]||{}).text : null, php: S && S.php, ehp: S && S.ehp, step: PV.step})`);
  let end = null;
  for (let step = 0; connected && step < 600; step++) {
    for (const [P, n] of [[A, 'A'], [B, 'B']]) {
      const s = await bot(P);
      if (s.phase === 'pvp' && s.step === 'over') { end = end || n; continue; }
      if (s.phase !== 'fight' || !s.run) continue;
      // A types slower (every other tick) so B should usually win
      if (n === 'A' && step % 2) continue;
      if (s.def) await P.type(s.def); else if (s.ultR >= 100 && !s.ult) await P.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}))`); else if (s.ult) await P.type(s.ult); else if (s.w) await P.type(s.w);
    }
    if (end) { await sleep(2500); break; }
    if (step % 40 === 0) { const a = await bot(A), b = await bot(B); console.log(`t=${step} A hp ${Math.ceil(a.php)} sees opp ${Math.ceil(a.ehp)} | B hp ${Math.ceil(b.php)} sees opp ${Math.ceil(b.ehp)}`); }
    await sleep(200);
  }
  const ra = await A.ev(`({step: PV.step, title: PV.last && PV.last.title, sub: PV.last && PV.last.sub})`), rb = await B.ev(`({step: PV.step, title: PV.last && PV.last.title, sub: PV.last && PV.last.sub})`);
  console.log('A', JSON.stringify(ra)); console.log('B', JSON.stringify(rb));
  const okRes = ra.step === 'over' && rb.step === 'over' && ra.title !== rb.title;
  // rematch: both type the first option word
  let rematch = false;
  if (okRes) {
    for (const P of [A, B]) await P.ev(`pvDo(PV.opts[0])`);
    for (let i = 0; i < 30; i++) { if (await A.ev(`phase`) === 'fight' && await B.ev(`phase`) === 'fight') { rematch = true; break; } await sleep(300); }
    // disconnect: kill B, A should win by forfeit
    procs[1].kill(); const tk = Date.now(); for (let i = 0; i < 90; i++) { const s = await A.ev('PV.step + "/" + phase'); if (!/fight/.test(s)) { console.log('A left fight after', ((Date.now()-tk)/1000).toFixed(1)+'s', s); break; } await sleep(1000); }
    console.log('after B quits, A:', JSON.stringify(await A.ev(`({phase, step: PV.step, sub: PV.last && PV.last.sub})`)));
  }
  console.log('RESULT connected', connected, 'opposite results', okRes, 'rematch', rematch);
  console.log('errors A', JSON.stringify(A.errs), 'B', JSON.stringify(B.errs));
  procs.forEach(p => p.kill()); process.exit(0);
})().catch(e => { console.error(e); procs.forEach(p => p.kill()); process.exit(1); });

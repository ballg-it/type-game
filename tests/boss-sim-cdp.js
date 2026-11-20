// Human-speed bot vs each boss (boss challenge), to compare fairness. Bot runs inside the page on a timer.
// node tests/boss-sim-cdp.js [mode=th] [cps=3] [err=0.05] [trials=2] [bosses=queen,mirror,phantom,jester,twins]
const { spawn } = require('child_process'); const os = require('os'), path = require('path'), fs = require('fs');
const [mode = 'th', cps = '3', err = '0.05', trials = '2', bossArg = 'queen,mirror,phantom,jester,twins'] = process.argv.slice(2);
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9480 + Math.floor(Math.random() * 15);
const prof = path.join(os.tmpdir(), 'tg-boss-' + Date.now());
const proc = spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BOT = `
window.__bot = (cps, errP) => {
  const B = { t0: performance.now(), target: null, wait: 0, keys: 0, errs: 0, swapKeys: 0, blind: 0, hpLog: [] };
  const isTh = c => /[\\u0E00-\\u0E7F]/.test(c);
  const send = ch => { kb.value += ch; kb.dispatchEvent(new Event('input')); };
  const clear = () => { kb.value = ''; kb.dispatchEvent(new Event('input')); };
  const fadeOf = i => { const el = $('#s' + i); return el ? +(getComputedStyle(el).getPropertyValue('--fade') || 1) : 1; };
  B.timer = setInterval(() => {
    if (!S || !S.running || S.paused || S.ultCine || phase !== 'fight') return;
    if (B.wait > 0) { B.wait--; return; }
    if (!S.ultMode && S.ult >= 100) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); B.target = null; B.wait = 2; return; }
    let tgt = S.ultMode ? S.ultWord : S.def;
    if (tgt) { if (B.target !== tgt.text) { B.target = tgt.text; B.wait = 2; if (S.buf) { clear(); } return; } }
    else {
      const still = S.slots.find(w => w && w.text === B.target);
      if (!still) {
        // pick a new slot word: visible (stealth) and not a trap; mirror words take longer to read
        const opts = S.slots.map((w, i) => ({ w, i })).filter(o => o.w && !o.w.trap && fadeOf(o.i) >= 0.5);
        if (!opts.length) { B.blind++; return; }
        const o = opts[Math.floor(Math.random() * opts.length)];
        B.target = o.w.text; B.wait = 3 + (o.w.mirror ? 3 : 0); if (S.buf) clear(); return;
      }
      tgt = still;
    }
    const chars = [...B.target], done = [...S.buf].length;
    if (!B.target.startsWith(S.buf)) { clear(); return; }
    const ch = chars[done]; if (ch === undefined) return;
    const blindNow = !S.def && !S.ultMode && FOE.bossMech === 'stealth' && fadeOf(S.slots.findIndex(w => w && w.text === B.target)) < 0.3;
    if (Math.random() < errP * (blindNow ? 2 : 1)) { B.errs++; send(isTh(ch) ? 'ฯ' : 'q'); return; }
    let key = ch;
    if (S.keySwap && !S.ultMode && S.keySwap.map[ch]) { key = S.keySwap.map[ch]; B.swapKeys++; }
    B.keys++; send(key);
  }, 1000 / cps);
  return B;
};`;
(async () => {
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '../index.html').split(path.sep).join('/') }); await sleep(2500);
  await ev(`localStorage.setItem('typegame.tourDone','1'); localStorage.setItem('typegame.askPractice','1')`);
  const rows = [];
  for (const boss of bossArg.split(',')) for (let t = 0; t < +trials; t++) {
    await ev(`location.reload()`); await sleep(2500);
    await ev(`document.querySelector('[data-group=mode] [data-v=${mode}]').click(); startBossChallenge('${boss}'); window.__B = null`);
    await sleep(800);
    await ev(BOT); await ev(`window.__B = __bot(${cps}, ${err}); 0`);
    const t0 = Date.now(); let s;
    while (Date.now() - t0 < 240000) {
      s = await ev(`({ run: S.running, php: Math.ceil(R.php), pmax: R.pmax, ehp: Math.ceil(S.ehp), emax: S.emax, enr: S.enraged, keys: __B.keys, errs: __B.errs, blind: __B.blind, swaps: __B.swapKeys, combo: S.maxCombo, blocks: S.stats.blocks })`);
      if (!s.run) break; await sleep(1000);
    }
    await ev(`clearInterval(__B.timer)`);
    const secs = Math.round((Date.now() - t0) / 1000);
    const r = { boss, win: s.ehp <= 0, secs, hpLeft: `${s.php}/${s.pmax}`, bossLeft: `${s.ehp}/${s.emax}`, keys: s.keys, errs: s.errs, blindTicks: s.blind, swapKeys: s.swaps, blocks: s.blocks, timeout: s.run };
    rows.push(r); console.log(JSON.stringify(r));
  }
  console.log('errors', JSON.stringify(errs));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

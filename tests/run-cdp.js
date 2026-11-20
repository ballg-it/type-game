// Full-run bot test over the DevTools protocol (no Playwright; Node 22+ and Chrome only).
// Plays whole runs: map -> fights/shop/events/rest -> story -> boss -> ending -> result, typing every word.
// Also reloads the page mid-run once and resumes from the save. Fails on page errors or a stuck screen.
// Usage: node tests/run-cdp.js [modes=th,en,bi] [runsPerMode=1] [shotDir]
// Set CHROME=<path> if Chrome is not at the default Windows location.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const modes = (process.argv[2] || 'th,en,bi').split(',');
const runsPer = +(process.argv[3] || 1);
const shotDir = process.argv[4] ? path.resolve(process.argv[4]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const profDir = path.join(os.tmpdir(), 'typegame-run-cdp-' + Date.now());
const CH = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const port = 9400 + Math.floor(Math.random() * 50);
const proc = spawn(CH, ['--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profDir}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;

(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  if (!tabs) throw new Error('Chrome CDP did not start');
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value).join(' ')); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(e.slice(0, 120) + ' -> ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
  const shot = async n => { if (!shotDir) return; const r = await cmd('Page.captureScreenshot'); fs.writeFileSync(path.join(shotDir, n), Buffer.from(r.result.data, 'base64')); };
  const type = t => ev(`(()=>{const kb=document.getElementById('kb');for(const ch of ${JSON.stringify(t)}){kb.value+=ch;kb.dispatchEvent(new Event('input'))}})()`);
  const key = k => ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true,cancelable:true}))`);
  const ok = (name, c) => { console.log(c ? 'PASS' : 'FAIL', name); if (!c) failed++; };
  const url = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Page.navigate', { url }); await sleep(2200);
  await ev(`localStorage.setItem('typegame.tourDone','1'); localStorage.setItem('typegame.askPractice','1'); localStorage.setItem('typegame.tutDone','1')`);

  const state = () => ev(`({ phase, layer: R && R.at && R.at.layer, run: !!(S && S.running), cine: !!(S && S.ultCine), paused: !!(S && S.paused),
    def: S && S.def && S.def.text, ult: S && S.ultMode && S.ultWord && S.ultWord.text, ultR: S ? S.ult : 0,
    slots: S && S.slots ? S.slots.map(w => w && !w.trap ? w.text : null) : [], php: S && S.php, ehp: S && S.ehp, foe: FOE && FOE.id })`);

  for (const mode of modes) for (let run = 1; run <= runsPer; run++) {
    const tag = `${mode}#${run}`;
    await ev(`localStorage.removeItem('typegame.save.v1'); location.reload()`); await sleep(2200);
    await ev(`document.querySelector('[data-group=mode] [data-v=${mode}]').click()`);
    await key('Enter'); await sleep(600);
    const t0 = Date.now(); let last = '', same = 0, resumed = false, rolled = false, foes = [], stuck = null, ults = 0;
    for (let step = 0; step < 2500; step++) {
      const st = await state();
      if (st.phase === 'result') break;
      const sig = JSON.stringify([st.phase, st.layer, st.def, st.ult, st.slots, st.php, st.ehp, st.cine]);
      if (sig === last) { if (++same > 60) { stuck = sig; break; } } else { same = 0; last = sig; }
      if (st.phase === 'busy' || st.phase === 'shopExit' || st.cine) { await sleep(200); continue; }
      if (st.phase === 'menu') {   // after the mid-run reload: resume from the save
        await type(mode === 'en' ? 'resume' : 'ต่อ'); await sleep(500); continue;
      }
      if (st.phase === 'shop') {
        await sleep(300);
        const sh = await ev(`({ coins: R.coins, items: SHOP.items.filter(i => !i.sold).map(i => ({ t: i.w.text, p: i.price })), roll: SHOP.roll.w.text, leave: SHOP.leave.w.text, rc: SHOP.rollCost })`);
        if (!rolled && sh.coins >= sh.rc) { rolled = true; await type(sh.roll); await sleep(300); continue; }
        const aff = sh.items.find(i => i.p <= sh.coins);
        if (aff) { await type(aff.t); await sleep(300); continue; }
        await type(sh.leave); await sleep(900); continue;
      }
      if (st.phase === 'choice') {
        const ch = await ev(`({ map: CH.map, opts: CH.opts.filter(o => !o.off).map(o => o.w.text) })`);
        if (ch.map && !resumed && st.layer >= 2) {   // save/continue check mid-run
          resumed = true; const before = await ev(`({ hp: R.php, coins: R.coins, layer: R.at.layer })`);
          await ev(`location.reload()`); await sleep(2200); await type(mode === 'en' ? 'resume' : 'ต่อ'); await sleep(600);
          const after = await ev(`({ hp: R.php, coins: R.coins, layer: R.at && R.at.layer, phase })`);
          ok(`${tag} resume after reload keeps layer/HP/coins (${JSON.stringify(before)})`, after.layer === before.layer && after.hp === before.hp && after.coins === before.coins && after.phase !== 'menu');
          continue;
        }
        await type(ch.opts[Math.floor(Math.random() * ch.opts.length)]); await sleep(300); continue;
      }
      if (st.phase === 'story') {
        const L = await ev(`(() => { const L = ST.lines[ST.i]; if (!L) return {}; return { t: L.t, say: L.w && L.w.text, ch: L.choice && L.choice.map(c => c.w.text) }; })()`);
        if (L.say) await type(L.say); else if (L.ch) await type(L.ch[0]); else await key('Enter');
        await sleep(120); continue;
      }
      if (st.phase === 'pick') {
        if (await ev(`!$('#pickScr').hidden`)) { const c = await ev(`PK.cards.map(c => c.w.text)`); await type('zz'); await type(c[1] || c[0]); }
        await sleep(300); continue;
      }
      if (st.phase !== 'fight' || !st.run || st.paused) { await sleep(200); continue; }
      if (st.foe && foes[foes.length - 1] !== st.foe) foes.push(st.foe);
      if (st.def) await type(st.def);
      else if (st.ultR >= 100 && !st.ult) { await key('Tab'); ults++; }
      else if (st.ult) await type(st.ult);
      else { const w = st.slots[2] || st.slots[1] || st.slots[0]; if (w) await type(w); }
      await sleep(250);
    }
    await sleep(1500); await shot(`result-${mode}-${run}.png`);
    const res = await ev(`({ phase, layer: R.at && R.at.layer, trail: (R.trail || []).map(n => n.t).join(','), title: $('#resTitle').textContent, hp: R.php, ups: (R.ups || []).length })`);
    console.log(`${tag} ${Math.round((Date.now() - t0) / 1000)}s foes=${foes.join(',')} ults=${ults}`, JSON.stringify(res));
    ok(`${tag} run reached result screen` + (stuck ? ' (STUCK at ' + stuck + ')' : ''), res.phase === 'result' && !stuck);
    ok(`${tag} save/continue exercised`, resumed);
  }
  console.log('errors', JSON.stringify(errs));
  if (errs.length) failed++;
  ws.close(); proc.kill(); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

// Title-screen menu test: drives headless Chrome over the DevTools protocol, so it needs only
// Node 22+ (built-in fetch/WebSocket) and Chrome - no Playwright. Usage: node tests/menu-cdp.js
// Set CHROME=<path to chrome.exe> if Chrome is not at the default Windows location.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const SP = path.join(require('os').tmpdir(), 'typegame-cdp'); fs.mkdirSync(path.join(SP, 'shots'), { recursive: true });
const CH = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const proc = spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
  `--user-data-dir=${SP}/shots/prof3`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value).join(' ')); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(e + ' -> ' + JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  const shot = async n => { const r = await cmd('Page.captureScreenshot'); fs.writeFileSync(path.join(SP, 'shots', n), Buffer.from(r.result.data, 'base64')); };
  const type = t => ev(`(()=>{const kb=document.getElementById('kb');let v=kb.value;for(const ch of ${JSON.stringify(t)}){v+=ch;kb.value=v;kb.dispatchEvent(new Event('input'))}})()`);
  const key = k => ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true,cancelable:true}))`);
  const st = () => ev(`({phase, HELP, buf: MENU_BUF, kb: kb.value, start: !$('#startScr').hidden, tcard: !$('#startScr').classList.contains('helpOn'), msel: MSEL, help: !$('#helpBox').hidden, meta: !$('#metaScr').hidden, pvp: !$('#pvpScr').hidden, lock: [...document.querySelectorAll('#startScr .mi.lock')].map(e=>e.dataset.m), off: [...document.querySelectorAll('#startScr .mi.off')].map(e=>e.dataset.m)})`);
  const ok = (name, c) => console.log(c ? 'PASS' : 'FAIL', name);
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/') }); await sleep(2500);

  let s = await st(); ok('menu shown', s.phase === 'menu' && s.start && s.tcard && !s.help);
  await type('ศา'); s = await st(); ok('partial shrine locks only shrine', s.buf === 'ศา' && s.lock.join() === 'shrine' && s.off.length === await ev(`menuItems().length - 1`));
  await shot('t-partial.png');
  await type('ล'); s = await st(); ok('shrine opens', s.phase === 'meta' && s.meta);
  await ev(`metaDo(MT.exit)`); s = await st(); ok('back to menu', s.phase === 'menu' && s.start && s.buf === '' && s.lock.length === 0);
  await type('x'); s = await st(); ok('wrong letter cleared', s.kb === '' && s.buf === '');
  await type('วิธีเล่น'); s = await st(); ok('help opens', s.HELP && s.help && !s.tcard);
  await sleep(300); await shot('t-help.png');
  await key('Escape'); s = await st(); ok('Esc closes help', !s.HELP && !s.help && s.tcard);
  await type('วิธีเล่น'); await type('กลับ'); s = await st(); ok('typing กลับ closes help', !s.HELP && s.tcard);
  await type('วิธีเล่น'); await key('Enter'); s = await st(); ok('Enter in help closes help, not start', !s.HELP && s.phase === 'menu');
  const hi = await ev(`visibleMenuEls().findIndex(e => e.dataset.m === 'help')`);   // เมนูมี "เล่นต่อ" เพิ่มเมื่อมีเซฟ
  for (let i = 0; i < hi; i++) await key('ArrowDown'); s = await st(); ok('arrows select help', s.msel === hi);
  await key('Enter'); s = await st(); ok('Enter opens selected (help)', s.HELP); await key('Escape');
  await key('ArrowDown'); s = await st(); ok('arrow wraps to start', s.msel === 0);
  // English mode
  await ev(`document.querySelector('[data-group=mode] [data-v=en]').click()`);
  const w = await ev(`visibleMenuEls().map(e=>e.querySelector('.w').textContent)`);
  // "resume" row shows only when a run save existed at menu render (depends on test-profile leftovers)
  const hasSave = await ev(`!$('#continueBtn').hidden`);
  ok('english words shown ' + w.join('/'), w.join() === (hasSave ? 'resume,' : '') + 'go,train,endless,boss,shrine,duel,help');
  await type('help'); s = await st(); ok('help (en)', s.HELP); await type('back'); s = await st(); ok('back (en)', !s.HELP);
  // practice mode (train / ฝึก): guided fight, coach shown, skip returns to menu
  await type('train'); s = await st(); ok('train starts practice', s.phase === 'fight' && await ev(`!!(S.tut && R.practice) && !$('#coach').hidden && !S.tour`));
  await ev(`$('#skipTut').click()`); s = await st(); ok('skip practice back to menu', s.phase === 'menu' && s.start && await ev(`$('#coach').hidden && !S.running`));
  await type('duel'); s = await st(); ok('duel opens pvp', s.phase === 'pvp' && s.pvp);
  await key('Backspace'); await sleep(200); s = await st(); ok('Backspace on duel home returns to menu', s.phase === 'menu' && s.start && !s.pvp);
  await type('duel'); await ev(`pvStep('join'); pvCodeAdd(0); pvCodeAdd(1)`);
  await key('Backspace'); ok('Backspace in join removes last code word', await ev(`PV.step === 'join' && PV.code.length === 1`));
  await key('Backspace'); await key('Backspace'); ok('Backspace with empty code goes to duel home', await ev(`phase === 'pvp' && PV.step === 'home'`));
  await ev(`pvStep('join'); pvCodeAdd(2)`); await key('Escape'); ok('Esc in join goes to duel home', await ev(`PV.step === 'home'`));
  await key('Escape'); s = await st(); ok('Esc on duel home returns to menu', s.phase === 'menu' && s.start && !s.pvp);
  await type('go'); await sleep(400); s = await st(); ok('go starts run', s.phase !== 'menu' && !s.start);
  // Enter path + start while help open
  await ev(`location.reload()`); await sleep(2500);
  await type('วิธีเล่น'); await ev(`startRun()`); s = await st(); ok('startRun from help hides help', !s.HELP && !s.start);
  await ev(`location.reload()`); await sleep(2500);
  await ev(`localStorage.removeItem('typegame.tourDone')`);
  await key('Enter'); await sleep(400); s = await st(); ok('Enter starts run', s.phase !== 'menu' && !s.start);
  // first real fight opens the screen tour; Enter steps it (not the game), Esc closes it
  ok('screen tour opens on first fight', await ev(`S.tour && !$('#tourTip').hidden && tourI === 0`));
  await key('Enter'); ok('Enter advances tour', await ev(`tourI === 1`));
  await key('Escape'); ok('Esc closes tour, game not paused', await ev(`!S.tour && !S.paused && $('#tourTip').hidden && localStorage.getItem('typegame.tourDone') === '1'`));
  // shrine reset: typing รีเซ็ต once only arms it, typing it again wipes progress + save and reloads
  await ev(`location.reload()`); await sleep(2500);
  await ev(`META.shards = 77; META.runs = 3; saveMeta(); localStorage.setItem('typegame.save.v1', '{}'); location.reload()`); await sleep(2500);
  await type('ศาล'); await type('รีเซ็ต');
  ok('reset armed, nothing wiped yet', await ev(`phase === 'meta' && $('#metaAct .reset').classList.contains('armed') && META.shards === 77`));
  await sleep(300); await shot('t-reset-armed.png');
  await type('รีเซ็ต'); await sleep(2500);
  ok('second รีเซ็ต wipes shards, stats and save', await ev(`phase === 'menu' && META.shards === 0 && META.runs === 0 && !localStorage.getItem('typegame.save.v1') && !localStorage.getItem('typegame.tourDone')`));
  // hero animates
  await ev(`location.reload()`); await sleep(2500);
  const fr = []; for (let i = 0; i < 8; i++) { fr.push(await ev(`airinFrame(HERO)+'|'+HERO.st`)); await sleep(600); }
  console.log('hero frames', fr.join(' '));
  ok('cover art shown (or pixel Airin animating)', await ev(`$('#startScr').classList.contains('art')`) || fr.some(f => /attack|win/.test(f)));
  console.log('errors', JSON.stringify(errs));
  ws.close(); proc.kill();
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

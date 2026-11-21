// Painted enemies in the fight scene: loads each enemy's art, checks it replaced the pixel sprite,
// and screenshots idle / charge / hurt / KO (+ enraged boss). Needs Node 22+ and Chrome, no Playwright.
// Usage: node tests/enemy-art-cdp.js [outdir]   (CHROME=<path> if Chrome is elsewhere)
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'typegame-cdp', 'enemies'); fs.mkdirSync(OUT, { recursive: true });
const CH = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const port = 9334;
const proc = spawn(CH, ['--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(OUT, '..', 'prof-enemy')}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(e + ' -> ' + JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  const shot = async n => { const r = await cmd('Page.captureScreenshot'); fs.writeFileSync(path.join(OUT, n), Buffer.from(r.result.data, 'base64')); };
  const ok = (name, c) => console.log(c ? 'PASS' : 'FAIL', name);
  await cmd('Runtime.enable'); await cmd('Page.enable');
  const url = 'file:///' + path.resolve(__dirname, '../index.html').split(path.sep).join('/');
  for (const foe of ['bandit', 'ghost', 'oni', 'queen', 'mirror', 'phantom', 'jester', 'twins']) {
    await cmd('Page.navigate', { url }); await sleep(2000);
    const isBoss = ['queen', 'mirror', 'phantom', 'jester', 'twins'].includes(foe);
    await ev(`startRun(); FOE = makeFoe({ foe: '${foe}', t: '${isBoss ? 'boss' : 'fight'}', layer: 2 }); startFight(); S.enemy.t = 99; true`);
    await sleep(600);
    ok(foe + ' art loaded and drawn', await ev(`!!enemyArt(FIG.E) && phase === 'fight'`));
    await shot(foe + '-idle.png');
    await ev(`play(FIG.E, 'charge')`); await sleep(250); await shot(foe + '-charge.png');
    // attack effect matches the move: ranged foes throw projectiles, melee foes slash
    // (shots fly only ~0.15 s, so the page samples fxShots itself while the move plays)
    await ev(`window.__mx = 0; play(FIG.E, 'attack'); (function f(n) { window.__mx = Math.max(window.__mx, fxShots.length); if (n) setTimeout(f, 20, n - 1); })(15); true`);
    await sleep(110); await shot(foe + '-attack.png'); await sleep(500);
    const ranged = ['ghost', 'queen', 'mirror', 'jester'].includes(foe);
    ok(foe + ' attack fx = ' + (ranged ? 'projectiles' : 'slash'), await ev(`(window.__mx > 0) === ${ranged}`));
    await ev(`play(FIG.E, 'hurt')`); await sleep(40); await shot(foe + '-hurt.png');
    if (foe === 'queen') { await ev(`S.enraged = true; play(FIG.E, 'idle')`); await sleep(200); await shot('queen-enraged.png'); }
    await ev(`play(FIG.E, 'ko')`); await sleep(350); await shot(foe + '-ko.png');
  }
  console.log('shots in', OUT);
  console.log('errors', JSON.stringify(errs));
  ws.close(); proc.kill();
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

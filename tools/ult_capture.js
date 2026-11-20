// Record the in-game Ultimate cutscene (with camera/flash/focus effects) from headless Chrome
// into numbered JPEGs + timings, then build a GIF with tools/ult_frames.py-style Pillow code.
// Usage: node tools/ult_capture.js [out.gif]      (Node 22+, Chrome, Python + Pillow)
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const OUT = path.resolve(process.argv[2] || 'ult-capture.gif');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ultcap-'));
const CH = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9341;
const proc = spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
  `--user-data-dir=${DIR}/prof`, '--window-size=960,640', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;
  await cmd('Page.enable');
  await cmd('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/') }); await sleep(2500);
  await ev(`localStorage.setItem('typegame.tourDone','1'); startRun(); 0`); await sleep(800);
  await ev(`Promise.all(ULT_IMGS.map(im => im.complete ? 0 : new Promise(r => im.onload = r)))`);
  await ev(`S.running = false; playUltCutscene(120, () => {}); window.__t0 = performance.now(); 0`);
  const shots = [];
  for (;;) {
    const t = await ev(`performance.now() - __t0`);
    if (t > (await ev('ULT_END_MS')) + 150) break;
    const r = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const f = path.join(DIR, `s${String(shots.length).padStart(3, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(r.result.data, 'base64')); shots.push([f, t]);
  }
  ws.close(); proc.kill();
  fs.writeFileSync(path.join(DIR, 'list.json'), JSON.stringify(shots));
  execFileSync('python', ['-c', `
import json,sys
from PIL import Image
L=json.load(open(sys.argv[1])); ims=[Image.open(f).convert('RGB') for f,_ in L]
d=[max(20,int(L[i+1][1]-L[i][1])) for i in range(len(L)-1)]+[700]
ims[0].save(sys.argv[2],save_all=True,append_images=ims[1:],duration=d,loop=0)
print(sys.argv[2], len(ims), 'shots')`, path.join(DIR, 'list.json'), OUT], { stdio: 'inherit' });
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

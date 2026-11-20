// Phone-size layout check: screenshots the main screens at a phone viewport and reports
// elements that overflow the screen width. Usage: node tests/mobile-cdp.js [outDir] [WxH]
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'typegame-mobile'); fs.mkdirSync(OUT, { recursive: true });
const [W, H] = (process.argv[3] || '390x844').split('x').map(Number);
const CH = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9351;
const proc = spawn(CH, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`,
  `--user-data-dir=${OUT}/prof`, 'about:blank'], { stdio: 'ignore' });
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
  const type = t => ev(`(()=>{const kb=document.getElementById('kb');let v=kb.value;for(const ch of ${JSON.stringify(t)}){v+=ch;kb.value=v;kb.dispatchEvent(new Event('input'))}})()`);
  // elements wider than the viewport or sticking out on the right/left
  const over = () => ev(`(()=>{const W=innerWidth,o=[];for(const e of document.querySelectorAll('body *')){if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;const r=e.getBoundingClientRect();if(r.width&&r.height&&(r.right>W+2||r.left<-2)){const p=e.parentElement&&e.parentElement.getBoundingClientRect();if(p&&(p.right>W+2||p.left<-2))continue;o.push((e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].join('.'))+' '+Math.round(r.left)+'..'+Math.round(r.right))}}return {sw:document.documentElement.scrollWidth,W,o:o.slice(0,12)}})()`);
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cmd('Page.navigate', { url: process.env.URL || 'file:///' + path.resolve(__dirname, '../index.html').split(path.sep).join('/') }); await sleep(2500);
  const report = async n => { await sleep(500); await shot(n + '.png'); console.log(n, JSON.stringify(await over())); };
  await report('1-menu');
  await type('วิธีเล่น'); await report('2-help'); await type('กลับ');
  await type('ศาล'); await report('3-shrine'); await ev(`metaDo(MT.exit)`);
  await type('ฝึก'); await sleep(800); await report('4-practice');
  await ev(`$('#skipTut').click()`);
  await type('ดวล'); await report('5-pvp');
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await type('เริ่ม'); await sleep(1500); await report('6-after-start');
  console.log('errors', JSON.stringify(errs));
  proc.kill(); process.exit(0);
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });

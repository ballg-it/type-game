// Parry rules: pre-typing the defense word and finishing in the gold window = block only; starting to type inside
// the gold window and finishing in time = counter; starting in gold but too slow = hit. Usage: node tests/parry-cdp.js
const { spawn } = require('child_process'); const os=require('os'),path=require('path'),fs=require('fs');
const port=9511, prof=path.join(os.tmpdir(),'tg-parry-'+Date.now());
const proc=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--allow-file-access-from-files',`--remote-debugging-port=${port}`,`--user-data-dir=${prof}`,'--window-size=1280,800','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let tabs;for(let i=0;i<50;i++){try{tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{await sleep(200)}}
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pend={},errs=[];
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]} if(d.method==='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.exception?.description)};
const cmd=(method,params={})=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method,params}))});
const ev=async e=>{const r=await cmd('Runtime.evaluate',{expression:e,returnByValue:true});if(r.result.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,300));return r.result.result.value};
await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Page.navigate',{url:'file:///' + path.resolve(__dirname, '../index.html').split(path.sep).join('/')});await sleep(2500);
await ev(`localStorage.setItem('typegame.tourDone','1');localStorage.setItem('typegame.askPractice','1');startRun()`);await sleep(800);
// manual clock: stop RAF-driven enemy so we control charge
const type=t=>ev(`(()=>{for(const ch of ${JSON.stringify(t)}){kb.value+=ch;kb.dispatchEvent(new Event('input'))}})()`);
const setup=async()=>{await ev(`S.buf='';kb.value='';enemyStartCharge();S.enemy.charge=0;S.ehp=9999;S.php=100`);return ev(`({def:S.def.text, win:counterWin(), max:S.enemy.chargeMax})`)};
const wait=async(remTarget)=>{for(let i=0;i<400;i++){const r=await ev(`S.def?S.enemy.chargeMax-S.enemy.charge:-1`);if(r<=remTarget)return r;await sleep(15)}};
const res=()=>ev(`({c:S.stats.counters,b:S.stats.blocks,hp:S.php,def:!!S.def})`);
let d=await setup(); console.log('def',d);
// 1) pre-type all but last, wait for gold, finish
const ch=[...d.def]; await type(ch.slice(0,-1).join('')); await wait(d.win-0.1); await sleep(50);
console.log('early label:', await ev(`$('#defBox .lbl').textContent`)); await type(ch.slice(-1)[0]); await sleep(100);
const r1=await res(); console.log('1 pretype', r1);
// 2) start inside gold, type fast
d=await setup(); await wait(d.win-0.05); await type(d.def); await sleep(100); const r2=await res(); console.log('2 in-window', r2);
// 3) start inside gold but too slow
d=await setup(); await wait(d.win-0.05); const c3=[...d.def]; await type(c3[0]); await sleep((d.win+0.4)*1000); await type(c3.slice(1).join('')); await sleep(400); const r3=await res(); console.log('3 slow', r3);
const ok=r1.b===1&&r1.c===0 && r2.c===1 && r3.hp<100;
console.log(ok?'PASS parry rules':'FAIL parry rules'); console.log('errors', JSON.stringify(errs)); process.exitCode = ok && !errs.length ? 0 : 1;
ws.close();proc.kill();})();

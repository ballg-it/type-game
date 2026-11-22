// Comprehensive CDP test for Systems 2 (enemy pixelfx + glint), 3 (4 new bosses + boss select + endless rotation),
// and 5 (elements, decoy traps, Teacher Mode + shareable #class= link).
// Usage: NO_PROXY=127.0.0.1 CHROME=/usr/bin/chromium node tests/features-cdp.js [shotDir]
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const shotDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
const profDir = path.join(os.tmpdir(), 'typegame-feat-cdp-' + Date.now());
fs.mkdirSync(profDir, { recursive: true });

const CH = process.env.CHROME || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const port = 9340 + Math.floor(Math.random() * 50);
const proc = spawn(CH, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profDir}`, '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;

(async () => {
  let tabs;
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); }
  }
  if (!tabs) throw new Error('Chrome CDP did not start');
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map(a => a.value).join(' '));
  };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => {
    const r = await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(e + ' -> ' + JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };
  const shot = async n => {
    if (!shotDir) return;
    const r = await cmd('Page.captureScreenshot');
    fs.writeFileSync(path.join(shotDir, n), Buffer.from(r.result.data, 'base64'));
  };
  const type = t => ev(`(()=>{const kb=document.getElementById('kb');for(const ch of ${JSON.stringify(t)}){kb.value+=ch;kb.dispatchEvent(new Event('input'))}})()`);
  const ok = (name, c) => { console.log(c ? 'PASS' : 'FAIL', name); if (!c) failed++; };

  await cmd('Runtime.enable'); await cmd('Page.enable');
  const url = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  await cmd('Page.navigate', { url });
  await sleep(2200);
  await ev(`localStorage.setItem('typegame.tourDone', '1')`);

  // 1. Title screen + 7 visible menu items layout check (Teacher Mode & Cutscene Viewer removed)
  const menuInfo = await ev(`(() => {
    const items = [...document.querySelectorAll('#menuList .mi:not([hidden])')];
    const bar = document.querySelector('.ts-bar').getBoundingClientRect();
    const last = items[items.length - 1].getBoundingClientRect();
    const words = items.map(e => e.querySelector('.w').textContent);
    const firsts = new Set(words.map(w => [...w][0]));
    const noTeacher = !document.getElementById('teacherBtn') && !document.getElementById('teacherScr');
    return { count: items.length, words, uniqueFirsts: firsts.size === words.length, noOverlap: last.bottom < bar.top + 4, noTeacher };
  })()`);
  ok('title menu has 7 visible items, unique TH prefixes, no overlap & no Teacher Mode (' + menuInfo.words.join('/') + ')',
     menuInfo.count === 7 && menuInfo.uniqueFirsts && menuInfo.noOverlap && menuInfo.noTeacher);
  await shot('title.png');

  // Check EN prefixes unique too
  await ev(`document.querySelector('[data-group=mode] [data-v=en]').click()`);
  const enMenu = await ev(`(() => {
    const words = [...document.querySelectorAll('#menuList .mi:not([hidden]) .w')].map(e => e.textContent);
    return { words, unique: new Set(words.map(w => w[0])).size === words.length };
  })()`);
  ok('title menu EN prefixes unique (' + enMenu.words.join('/') + ')', enMenu.unique && enMenu.words.length === 7);
  await ev(`document.querySelector('[data-group=mode] [data-v=th]').click()`);

  // 2. Boss Challenge selector (type บอส)
  await type('บอส');
  await sleep(200);
  const bossSel = await ev(`({ phase, title: $('#chTitle').textContent, count: CH.opts.length, words: CH.opts.map(o=>o.w.text) })`);
  ok('boss select opens with 5 bosses + back (' + bossSel.words.join('/') + ')',
     bossSel.phase === 'choice' && bossSel.count === 6 && new Set(bossSel.words.map(w => [...w][0])).size === 6);
  await shot('boss-select.png');

  // 3A. Mirror Boss (type กระจก)
  await type('กระจก');
  await sleep(400);
  const mirrorSt = await ev(`(() => {
    const s2 = S.slots[2];
    const domText = $('#s2 .w').textContent;
    // reversed by syllable: leading vowel stays before its consonant, so no displayed text ends in เแโใไ
    const rev = mirrorItems(s2.raw.map((c, i) => ({ c, i }))).map(({ c }) => c.b + c.m.join('')).join('');
    const sameLetters = [...rev].sort().join() === [...s2.raw.map(c => c.b + c.m.join('')).join('')].sort().join();
    return { id: FOE.id, mirror: !!s2.mirror, domMatchesRev: domText === rev && sameLetters && !/[เแโใไ]$/.test(domText), realText: s2.text, ehp: S.ehp, mech: $('#mechBar').textContent };
  })()`);
  ok('mirror boss reverses word visually (' + mirrorSt.realText + ')', mirrorSt.id === 'mirror' && mirrorSt.mirror && mirrorSt.domMatchesRev && mirrorSt.mech.includes('กระจก'));
  await shot('boss-mirror.png');
  await type(mirrorSt.realText);
  await sleep(250);
  ok('typing real word hits mirror boss', await ev(`S.ehp < ${mirrorSt.ehp}`));

  // 3B. Stealth Boss
  await ev(`startBossChallenge('phantom')`);
  await sleep(300);
  const stealthInit = await ev(`({ id: FOE.id, stealth: !!S.slots[2].stealth })`);
  await ev(`gclock += 3.5; update(0.05);`);
  const stealthFaded = await ev(`parseFloat($('#s2').style.getPropertyValue('--fade'))`);
  await ev(`mistake(); update(0.05);`);
  const stealthPeeked = await ev(`parseFloat($('#s2').style.getPropertyValue('--fade'))`);
  ok('stealth boss fades words (' + stealthFaded + ') and peeks on mistake (' + stealthPeeked + ')',
     stealthInit.id === 'phantom' && stealthInit.stealth && stealthFaded < 0.4 && stealthPeeked >= 0.6);

  // 3C. Key-Swap Boss
  await ev(`startBossChallenge('jester')`);
  await sleep(300);
  const swapSt = await ev(`(() => {
    const pair = S.keySwap.pairs[0];
    // Craft a word containing pair[0] so we verify physical key swap
    S.slots[0] = makeWord(pair[0] + 'า', 'th', 'atk');
    S.slots[0].elem = 'water';
    renderWords();
    return { pair, ehp: S.ehp, mech: $('#mechBar').textContent, swappedSpans: document.querySelectorAll('#s0 .swapped').length };
  })()`);
  await shot('boss-jester.png');
  // Type pair[1] + 'า' (physical swapped key!) to match pair[0] + 'า'
  await type(swapSt.pair[1] + 'า');
  await sleep(250);
  ok('key-swap boss translates swapped keys (' + swapSt.pair.join('⇄') + ') and hits boss',
     swapSt.swappedSpans >= 1 && swapSt.mech.includes('สลับแป้น') && await ev(`S.ehp < ${swapSt.ehp}`));

  // 3D. Twins Boss
  await ev(`startBossChallenge('twins')`);
  await sleep(300);
  const twinsSt = await ev(`({
    id: FOE.id, n: S.twins && S.twins.length,
    hudVis: !$('#twinsHud').hidden,
    t0: S.slots[0].twin, t1: S.slots[1].twin,
    alive: CHARS.twins.alive.slice()
  })`);
  ok('twins boss initializes dual HP bars & separate slot targets',
     twinsSt.id === 'twins' && twinsSt.n === 2 && twinsSt.hudVis && twinsSt.t0 === 0 && twinsSt.t1 === 1);
  await shot('boss-twins.png');
  // Kill twin 0, check enrage + sprite alive[0] === 0 + slots reassigned to 1
  await ev(`dealDamage(999, 'atk', 1, 0); stageTick(0.1); drawStage();`);
  const twinsAfter = await ev(`({
    hp0: S.twins[0].hp, hp1: S.twins[1].hp, enraged: S.enraged,
    alive: CHARS.twins.alive.slice(), slotTargets: S.slots.map(w => w.twin)
  })`);
  ok('killing Twin 0 enrages Twin 1, updates sprite alive=[0,1] & retargets slots',
     twinsAfter.hp0 === 0 && twinsAfter.hp1 > 0 && twinsAfter.enraged &&
     twinsAfter.alive[0] === 0 && twinsAfter.alive[1] === 1 && twinsAfter.slotTargets.every(t => t === 1));

  // 4. Endless Boss Rotation (all 5 bosses in 25 waves)
  const endlessBosses = await ev(`(() => {
    R = newRun(); R.endless = true; R.wave = 0; R.trail = [];
    const seen = [];
    for (const w of [5, 10, 15, 20, 25]) seen.push(endlessFoe(w).foe.id);
    return seen;
  })()`);
  ok('Endless rotates all 5 bosses (' + endlessBosses.join(',') + ')', new Set(endlessBosses).size === 5);

  // 5A. Elemental system & 5B. Decoy traps & 2. Enemy pixelfx
  await ev(`R = newRun(); R.at = { t: 'fight', foe: 'oni', layer: 2 }; R.trail = [R.at]; FOE = makeFoe(R.at); startFight();`);
  await sleep(250);
  const elTest = await ev(`(() => {
    const wWater = makeWord('ดาบน้ำ', 'th', 'atk'); wWater.elem = 'water'; // beats oni (fire)
    const wWind  = makeWord('ดาบลม', 'th', 'atk');  wWind.elem = 'wind';   // resisted by oni (fire)
    const wFire  = makeWord('ดาบไฟ', 'th', 'atk');  wFire.elem = 'fire';   // neutral
    const dW = atkDmg(wWater, 1), dN = atkDmg(wFire, 1), dR = atkDmg(wWind, 1);
    // Put a trap on slot 0 and super-effective water word on slot 2
    S.slots[0] = makeWord('หลอก', 'th', 'atk'); S.slots[0].trap = true; S.slots[0].born = gclock;
    S.slots[2] = wWater;
    renderWords();
    // Trigger enemy attack pixelfx + Airin super-effective hit
    play(FIG.E, 'attack');
    for (let k = 0; k < 6; k++) { stageTick(0.035); drawStage(); }
    const enemyFxCount = fxLive.length;
    return { dW, dN, dR, trapClass: $('#s0').classList.contains('trap'), superClass: $('#s2').classList.contains('super'), enemyFxCount };
  })()`);
  ok('elemental dmg scales (water ' + elTest.dW + ' > neutral ' + elTest.dN + ' > wind ' + elTest.dR + ')',
     elTest.dW > elTest.dN && elTest.dN > elTest.dR && elTest.superClass);
  ok('enemy pixelfx spawns on attack (fxLive=' + elTest.enemyFxCount + ') & trap slot styled',
     elTest.enemyFxCount > 0 && elTest.trapClass);
  await shot('fight-fx-trap.png');

  // Test hitting trap hurts player, and hitting safe word clears trap
  const phpBefore = await ev(`S.php`);
  await type('หลอก');
  await sleep(200);
  const phpAfterTrap = await ev(`S.php`);
  ok('typing decoy trap hurts player (' + phpBefore + ' -> ' + phpAfterTrap + ')', phpAfterTrap < phpBefore);

  // Put another trap on slot 0, then type safe slot 2 -> trap should clear automatically
  await ev(`S.slots[0] = makeWord('กับดัก', 'th', 'atk'); S.slots[0].trap = true; S.slots[0].born = gclock; S.slots[2] = makeWord('ดาบน้ำ', 'th', 'atk'); S.slots[2].elem = 'water'; renderWords();`);
  await type('ดาบน้ำ');
  await sleep(250);
  const clearedTrap = await ev(`!S.slots[0].trap && S.lastAtkSuper === true`);
  ok('hitting safe word clears decoy trap & marks elemental super hit', clearedTrap);

  // Test bandit groundSlam pixelfx + charge spellCharge pixelfx
  const banditFx = await ev(`(() => {
    fxLive.length = 0;
    FOE = ENEMIES[0]; FIG.E.id = 'bandit';
    play(FIG.E, 'charge'); stageTick(0.05); drawStage();
    const hasCharge = !!fxECharge;
    play(FIG.E, 'attack');
    for (let k = 0; k < 6; k++) { stageTick(0.035); drawStage(); }
    return { hasCharge, countAfterAttack: fxLive.length };
  })()`);
  ok('bandit charge spawns spellCharge & attack spawns slash + groundSlam (live=' + banditFx.countAfterAttack + ')',
     banditFx.hasCharge && banditFx.countAfterAttack >= 2);

  // 6. Ultimate Move Cutscene (32-frame Sandevistan Overdrive: impact = frames 26–27, landing = 30, closes at ULT_END_MS)
  await ev(`toMenu(); startRun();`);
  await sleep(300);
  ok('startRun enters Layer 1 fight directly (story intro stashed)',
     await ev(`phase === 'fight' && S.running && !document.body.classList.contains('cine')`));

  const waitFrame = async (minF, ms = 2500) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const f = await ev(`ULT_CINE ? ULT_CINE.frame : 99`);
      if (f >= minF) return f;
      await sleep(25);
    }
    return 0;
  };
  await ev(`S.ult = 100; S.ehp = S.emax = 500; tryUlt();`);
  await sleep(100);
  const ultTxt = await ev(`S.ultWord.text`);
  const ehpBeforeUlt = await ev(`S.ehp`);
  await type(ultTxt);
  const f1 = await waitFrame(1, 500);
  const loadInfo = await ev(`({ count: ULT_IMGS.length, loaded: ULT_IMGS.filter(im => im.complete && im.naturalWidth > 0).length })`);
  const NF = await ev(`ULT_FRAMES.length`);
  ok('Ultimate triggers Frame 1 with all ' + NF + ' frames loaded (' + loadInfo.loaded + '/' + loadInfo.count + ')',
     f1 >= 1 && NF === 112 && loadInfo.count === NF && loadInfo.loaded === NF && await ev(`!$('#ultCine').hidden && !!ULT_CINE`));

  await waitFrame(15, 1800);
  const focusSeen = await ev(`$('#ucStage').classList.contains('focus2')`);
  const f5 = await waitFrame(20, 1800);
  ok('Ultimate plays through Zoom-in, Eye Cut-in, Eye Macro & Flare (frame ' + f5 + ', focus FX ' + focusSeen + ')', f5 >= 20 && f5 <= NF && focusSeen);
  const f10 = await waitFrame(88, 5200);
  ok('Ultimate hits 2-Frame Sakuga Impact Flash (frame ' + f10 + ')', f10 >= 88 && f10 <= NF);
  const f13 = await waitFrame(101, 1700);
  const ultDmgTxt = await ev(`$('#ucDmg').textContent`);
  ok('Ultimate reaches Landing & Aftermath with damage pop (frame ' + f13 + ', ' + ultDmgTxt + ')',
     f13 >= 101 && ultDmgTxt.includes('-'));

  for (let t0 = Date.now(); Date.now() - t0 < 3000 && await ev(`!!ULT_CINE`);) await sleep(50);   // รอคัตซีนปิดเอง (ULT_END_MS)
  await sleep(300);   // เฟดออก 210ms
  const afterUlt = await ev(`({ hidden: $('#ultCine').hidden, ultCine: !!ULT_CINE, ehp: S.ehp })`);
  ok('Ultimate cutscene exits cleanly and deals massive damage (' + ehpBeforeUlt + ' -> ' + afterUlt.ehp + ')',
     afterUlt.hidden && !afterUlt.ultCine && afterUlt.ehp < ehpBeforeUlt);

  // Test skip on click during Ultimate Cutscene
  await ev(`S.ult = 100; tryUlt();`);
  await sleep(100);
  const ultTxt2 = await ev(`S.ultWord.text`);
  const ehpBeforeUlt2 = await ev(`S.ehp`);
  await type(ultTxt2);
  await sleep(120);
  await ev(`$('#ultCine').click();`);
  await sleep(260);
  ok('Clicking Ultimate cutscene skips immediately and applies damage',
     await ev(`$('#ultCine').hidden && !ULT_CINE && S.ehp < ${ehpBeforeUlt2}`));

  // 7. Pause Menu (เล่นต่อ / เล่นใหม่ / กลับ Lobby) + Lobby Continue (เล่นต่อ)
  await ev(`toMenu(); startRun();`);
  await sleep(350);
  await ev(`S.php = 73; S.ehp = 55; R.coins = 42; renderHUD();`);
  await ev(`setPause(true);`);
  await sleep(250);
  const pauseSt = await ev(`({
    paused: PAUSED && S.paused,
    vis: !$('#pauseScr').hidden,
    btns: [...document.querySelectorAll('#pauseBtns .pbtn .nm')].map(e => e.textContent),
    words: [...document.querySelectorAll('#pauseBtns .pbtn .w')].map(e => e.textContent)
  })`);
  ok('Pause screen shows เล่นต่อ / เล่นใหม่ / กลับ Lobby (' + pauseSt.btns.join(' | ') + ')',
     pauseSt.paused && pauseSt.vis && pauseSt.btns.join() === 'เล่นต่อ,เล่นใหม่,กลับ Lobby');
  await shot('pause.png');

  // Resume by typing ต่อ
  await type('ต่อ');
  await sleep(200);
  ok('Typing ต่อ in Pause resumes fight', await ev(`!PAUSED && !S.paused && $('#pauseScr').hidden && phase === 'fight'`));

  // Pause -> Lobby (saves run snapshot)
  await ev(`setPause(true);`);
  await sleep(150);
  await type('ล็อบบี้');
  await sleep(250);
  const lobbyWithSave = await ev(`(() => {
    const items = [...document.querySelectorAll('#menuList .mi:not([hidden])')];
    const bar = document.querySelector('.ts-bar').getBoundingClientRect();
    const last = items[items.length - 1].getBoundingClientRect();
    const words = items.map(e => e.querySelector('.w').textContent);
    const firsts = new Set(words.map(w => [...w][0]));
    return {
      phase, startVis: !$('#startScr').hidden, contVis: !$('#continueBtn').hidden,
      tag: $('#contTag').textContent, count: items.length,
      uniqueFirsts: firsts.size === words.length, noOverlap: last.bottom < bar.top + 4
    };
  })()`);
  ok('กลับ Lobby saves run and shows เล่นต่อ in Lobby with unique prefixes & no overlap (' + lobbyWithSave.tag + ')',
     lobbyWithSave.phase === 'menu' && lobbyWithSave.startVis && lobbyWithSave.contVis &&
     lobbyWithSave.count === 8 && lobbyWithSave.uniqueFirsts && lobbyWithSave.noOverlap);
  await shot('lobby-continue.png');

  // Continue from Lobby (type ต่อ) -> restores HP/enemy HP/coins!
  await type('ต่อ');
  await sleep(350);
  const resumed = await ev(`({ phase, run: S.running, php: Math.ceil(S.php), ehp: Math.ceil(S.ehp), coins: R.coins })`);
  ok('Typing ต่อ in Lobby restores saved fight state (HP=' + resumed.php + ', EHP=' + resumed.ehp + ', coins=' + resumed.coins + ')',
     resumed.phase === 'fight' && resumed.run && resumed.php === 73 && resumed.ehp === 55 && resumed.coins === 42);

  // Pause -> Restart (เล่นใหม่) -> resets HP/coins and clears old save
  await ev(`setPause(true);`);
  await sleep(150);
  await type('ใหม่');
  await sleep(350);
  const restarted = await ev(`({ phase, run: S.running, php: Math.ceil(S.php), pmax: S.pmax, coins: R.coins, layer: R.at.layer })`);
  ok('Typing ใหม่ in Pause restarts a fresh run cleanly (HP=' + restarted.php + '/' + restarted.pmax + ')',
     restarted.phase === 'fight' && restarted.run && restarted.php === restarted.pmax && restarted.coins === 0 && restarted.layer === 0);

  // Result screen -> กลับ Lobby button works and clears saved run
  await ev(`endFight(false);`);
  await sleep(1800);
  const resBtns = await ev(`({ phase, again: $('#againBtn').textContent, menu: $('#menuBtn').textContent, hasSave: !!loadRunSnapshot() })`);
  ok('Result screen shows เล่นใหม่ & กลับ Lobby and clears saved run',
     resBtns.phase === 'result' && resBtns.again.includes('เล่นใหม่') && resBtns.menu.includes('Lobby') && !resBtns.hasSave);
  await ev(`$('#menuBtn').click();`);
  await sleep(200);
  ok('Clicking กลับ Lobby on Result screen returns to Lobby cleanly',
     await ev(`phase === 'menu' && !$('#startScr').hidden && $('#resultScr').hidden && $('#continueBtn').hidden`));

  console.log('errors', JSON.stringify(errs));
  if (errs.length) failed++;
  ws.close(); proc.kill();
  try { fs.rmSync(profDir, { recursive: true, force: true }); } catch {}
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error(e);
  proc.kill();
  process.exit(1);
});

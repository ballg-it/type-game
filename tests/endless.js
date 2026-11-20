// โหมด Endless: เมนู → ไฟต์ต่อเนื่อง · ด่าน 4 ศัตรูเก่ง · ด่าน 5 บอส → ร้าน → ด่าน 6 · แพ้ = หน้าสรุป + บันทึกสถิติ · Enter = เล่นใหม่
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await pg.click(`[data-group=mode] [data-v=${process.argv[2] || 'th'}]`);
  const type = t => pg.evaluate(t => { let v = ''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  const ok = (n, c) => { console.log(c ? 'ok  ' : 'FAIL', n); if (!c) process.exitCode = 1; };
  const shot = n => process.argv[3] && pg.screenshot({ path: `${process.argv[3]}/endless-${n}.png` });
  await type(await pg.evaluate(() => menuItems().find(i => i.m.id === 'endless').disp.text));
  ok('menu word starts endless', await pg.evaluate(() => R.endless && R.wave === 1 && phase === 'fight' && $('#wave').textContent.includes('ด่าน 1')));
  // ตีจริงหนึ่งคำ
  await type(await pg.evaluate(() => S.slots[0].text)); await pg.waitForTimeout(300);
  ok('typing hits enemy', await pg.evaluate(() => S.ehp < S.emax));
  await shot('fight');
  const win = async () => {
    await pg.evaluate(() => endFight(true)); await pg.waitForTimeout(1700);
    if (await pg.evaluate(() => phase === 'pick')) await pg.evaluate(() => choose(PK.cards[0]));
    await pg.waitForTimeout(100);
  };
  const seen = [];
  for (let w = 1; w <= 5; w++) { seen.push(await pg.evaluate(() => ({ w: R.wave, t: R.at.t, hp: S.emax, boss: !!FOE.boss }))); await win(); }
  console.log(JSON.stringify(seen));
  ok('wave 4 elite', seen[3].t === 'elite');
  ok('wave 5 boss', seen[4].t === 'boss' && seen[4].boss);
  ok('enemies scale up', seen[2].hp > seen[0].hp * 0.9);
  ok('shop after boss', await pg.evaluate(() => phase === 'shop' && $('#shopSub').textContent.includes('♾')));
  await shot('shop');
  await pg.evaluate(() => shopDo(SHOP.leave)); await pg.waitForTimeout(900);
  ok('wave 6 after shop', await pg.evaluate(() => phase === 'fight' && R.wave === 6 && !FOE.boss));
  await pg.evaluate(() => { R.revive = 0; endFight(false); }); await pg.waitForTimeout(1700);
  ok('result shows endless', await pg.evaluate(() => phase === 'result' && $('#resTitle').textContent.includes('♾') && META.endless === 5));
  await shot('result');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  ok('Enter replays endless', await pg.evaluate(() => R.endless && R.wave === 1 && phase === 'fight'));
  await pg.evaluate(() => { endFight(false); }); await pg.waitForTimeout(1700);
  ok('best kept', await pg.evaluate(() => META.endless === 5 && !$('#resTitle').textContent.includes('ใหม่')));
  await pg.evaluate(() => toMenu());
  ok('menu shows best', await pg.evaluate(() => $('#startMeta').textContent.includes('♾')));
  await shot('menu');
  await pg.evaluate(() => startRun());
  ok('normal run unaffected', await pg.evaluate(() => !R.endless && R.map && $('#wave').textContent.includes('/ 7')));
  console.log('errors', errs); await b.close();
})();

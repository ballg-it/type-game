const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  // 1) สวนกลับปิดไฟต์ → ศัตรูควรค้างท่า KO
  await pg.evaluate(() => { startRun(); S.ehp = 5; enemyStartCharge(); S.enemy.charge = S.enemy.chargeMax - 0.1; });
  await type(await pg.evaluate(() => S.def.text));
  await pg.waitForTimeout(700);
  console.log('1) enemy state after counter-kill:', await pg.evaluate(() => FIG.E.st), '(ควรเป็น ko)');
  // 2) พิมพ์ช่วง 1.4 วิหลังชนะ → ไม่ควรเลือกการ์ดเก่า/เริ่มรันใหม่
  await pg.waitForTimeout(1200);
  await type(await pg.evaluate(() => PK.cards[0].w.text)); await pg.waitForTimeout(200);
  await pg.evaluate(() => { R.ehpx = 1; }); 
  const ups1 = await pg.evaluate(() => R.ups.length);
  await pg.evaluate(() => { document.getElementById('chScr').hidden = true; enterNode(R.map[1][0].foe ? R.map[1][0] : R.map[1].find(n => n.foe) || R.map[1][0]); });
  await pg.evaluate(() => { if (S.running) { S.ehp = 1; dealDamage(5); } });
  await pg.waitForTimeout(300);
  await type(await pg.evaluate(() => PK.cards[0].w.text));   // PK ยังเป็นของไฟต์ก่อน
  await pg.waitForTimeout(100);
  console.log('2) phase right after win + typing old card:', await pg.evaluate(() => phase), 'ups', ups1, '->', await pg.evaluate(() => R.ups.length), '(ไม่ควรเพิ่ม)');
  await pg.waitForTimeout(1500);
  console.log('   phase after timers:', await pg.evaluate(() => phase));
  // 3) Enter หลังแพ้ก่อนหน้าสรุปขึ้น
  await pg.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.hidden = true); R.at = R.map[0][0]; FOE = makeFoe(R.at); startFight(); S.php = 1; S.shields = 0; R.revive = 0; enemyHit(); });
  await pg.waitForTimeout(400); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1600);
  console.log('3) after Enter during KO:', await pg.evaluate(() => ({ phase, running: S.running, res: !document.getElementById('resultScr').hidden })), '(ไม่ควรมีไฟต์ใหม่ซ้อนหน้าสรุป)');
  console.log('errors', errs); await b.close();
})();

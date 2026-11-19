const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  console.log('start', await pg.textContent('#startMeta'));
  // ให้มีเศษคริสตัล แล้วเข้าศาลด้วยการพิมพ์
  await pg.evaluate(() => { META.shards = 400; saveMeta(); renderMetaBar(); });
  await type('ศาล'); await pg.waitForTimeout(200);
  console.log('phase', await pg.evaluate(() => phase));
  await type('ใจ'); await type('ใจ'); await type('ฟื้น'); await type('ไพ่');   // ไพ่ = เหรียญไม่พอ
  console.log('meta', await pg.evaluate(() => JSON.stringify(META)));
  await pg.screenshot({ path: 'meta.png' });
  await type('ออก');
  console.log('back', await pg.evaluate(() => phase), await pg.textContent('#startMeta'));
  // reload → คงอยู่
  await pg.reload(); console.log('persist', await pg.evaluate(() => JSON.stringify(META.lv)));
  // รันใหม่: HP 120, revive
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
  console.log('run', await pg.evaluate(() => ({ pmax: R.pmax, php: S.php, revive: R.revive, coins: R.coins })));
  // ทดสอบฟื้นคืนชีพ: ตั้ง HP ต่ำแล้วให้ศัตรูตี
  await pg.evaluate(() => { S.php = 1; enemyHit(); }); await pg.waitForTimeout(700);
  console.log('after revive', await pg.evaluate(() => ({ php: S.php, run: S.running, revive: R.revive })));
  await pg.screenshot({ path: 'revive.png' });
  await pg.evaluate(() => { S.php = 1; enemyHit(); }); await pg.waitForTimeout(2000);
  console.log('dead', await pg.evaluate(() => ({ phase, shards: META.shards, runs: META.runs })), await pg.textContent('#resGain'));
  await pg.screenshot({ path: 'result_meta.png' });
  await type('shrine'); console.log('from result', await pg.evaluate(() => phase));
  await type('ออก'); console.log('back to', await pg.evaluate(() => phase));
  console.log('errors', errs);
  await b.close();
})();

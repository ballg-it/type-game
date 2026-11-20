// กด "เริ่มเกม" ตอนยังไม่เคยฝึก → ถามว่าจะฝึกซ้อมก่อนไหม (ปิด navigator.webdriver เพื่อให้ถามจริง)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const fresh = async () => {
    const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
    await pg.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    await pg.click('[data-group=mode] [data-v=th]');
    return pg;
  };
  const type = (pg, t) => pg.evaluate(t => { let v = ''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  const ok = (n, c) => { console.log(c ? 'ok  ' : 'FAIL', n); if (!c) process.exitCode = 1; };
  let pg = await fresh();
  await pg.click('#startBtn');
  ok('start asks to practice', await pg.evaluate(() => phase === 'choice' && $('#startScr').hidden && $('#chTitle').textContent.includes('ฝึกซ้อม')));
  if (process.argv[2]) await pg.screenshot({ path: process.argv[2] });
  await type(pg, 'ฝึก');
  ok('ฝึก -> practice', await pg.evaluate(() => phase === 'fight' && !!S.tut && R.practice));
  await pg.evaluate(() => tutQuit());
  await pg.keyboard.press('Enter');
  ok('Enter on menu also asks', await pg.evaluate(() => phase === 'choice'));
  await type(pg, 'เริ่ม'); await pg.waitForTimeout(300);
  ok('เริ่ม -> real run', await pg.evaluate(() => !R.practice && R.map && phase !== 'choice'));
  await pg.close(); pg = await fresh();
  await pg.click('#startBtn'); await type(pg, 'ลุย'); await pg.waitForTimeout(300);
  ok('ลุย -> run + saved', await pg.evaluate(() => !R.practice && R.map && localStorage.getItem('typegame.askPractice') === '1'));
  await pg.evaluate(() => { endTour(); toMenu(); startGame(); }); await pg.waitForTimeout(300);
  ok('no ask after "don\'t ask again"', await pg.evaluate(() => phase !== 'choice' || !$('#chTitle').textContent.includes('ฝึกซ้อมก่อน')));
  await pg.evaluate(() => localStorage.clear());
  console.log('errors', errs); await b.close();
})();

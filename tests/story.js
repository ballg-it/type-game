const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, mode] of [['desk', { viewport: { width: 1200, height: 760 } }, 'th'], ['en', { viewport: { width: 1200, height: 760 } }, 'en'], ['mob', devices['iPhone 13'], 'th']]) {
    const pg = await b.newPage(opt); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    await pg.click(`[data-group=mode] [data-v=${mode}]`);
    const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
    await pg.evaluate(() => { startRun(); S.running = false; R.php = 40; enterNode(R.map[6][0]); });
    await pg.waitForTimeout(1500);
    if (name !== 'en') await pg.screenshot({ path: `story_${name}1.png` });
    const log = [];
    for (let k = 0; k < 20 && await pg.evaluate(() => phase === 'story'); k++) {
      const L = await pg.evaluate(() => { const L = ST.lines[ST.i]; return { t: L.t, say: L.w && L.w.text, ch: L.choice && L.choice.map(c => c.w.text), full: ST.full, who: L.who }; });
      if (L.t !== undefined) { log.push(L.who + ': ' + L.t.slice(0, 25)); await pg.keyboard.press('Enter'); if (!L.full) await pg.keyboard.press('Enter'); }
      else if (L.say) { log.push('TYPE ' + L.say); await type('zz'); await type(L.say); }
      else { log.push('CHOICE ' + L.ch.join('/')); if (name !== 'en') await pg.screenshot({ path: `story_${name}2.png` }); await type(L.ch[1]); }
      await pg.waitForTimeout(150);
    }
    console.log(name, log.join(' | '));
    console.log(' ->', await pg.evaluate(() => ({ phase, run: S.running, shields: S.shields, ult: S.ult, x: FIG.E.x, cine: document.body.classList.contains('cine') })), errs);
    // skip test
    await pg.evaluate(() => { S.running = false; enterNode(R.map[6][0]); });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
    console.log(' skip ->', await pg.evaluate(() => ST && !!ST.lines[ST.i].choice));
  }
  await b.close();
})();

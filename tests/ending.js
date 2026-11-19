const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, opt, mode, pickI] of [['desk', { viewport: { width: 1200, height: 760 } }, 'th', 0], ['en', { viewport: { width: 1200, height: 760 } }, 'en', 1]]) {
    const pg = await b.newPage(opt); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    await pg.click(`[data-group=mode] [data-v=${mode}]`);
    const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
    await pg.evaluate(() => { startRun(); S.running = false; R.revive = 0; R.php = 20; R.at = R.map[6][0]; R.trail.push(R.at); FOE = makeFoe(R.at); startFight(); S.ehp = 1; dealDamage(5); });
    await pg.waitForTimeout(1900);
    const log = []; let shot = 0;
    for (let k = 0; k < 30 && await pg.evaluate(() => phase === 'story'); k++) {
      const L = await pg.evaluate(() => { const L = ST.lines[ST.i]; return { t: L.t, say: L.w && L.w.text, ch: L.choice && L.choice.map(c => c.w.text), full: ST.full, who: L.who }; });
      if (name === 'desk' && (L.who === 'robo' && shot === 0)) { await pg.waitForTimeout(1500); await pg.screenshot({ path: 'end1.png' }); shot = 1; }
      if (L.t !== undefined) { log.push(L.who + ': ' + L.t.slice(0, 22)); await pg.keyboard.press('Enter'); if (!L.full) await pg.keyboard.press('Enter'); }
      else if (L.say) { log.push('TYPE ' + L.say); await type(L.say); }
      else { log.push('CHOICE ' + L.ch.join('/')); if (name === 'desk') await pg.screenshot({ path: 'end2.png' }); await type(L.ch[pickI]); }
      await pg.waitForTimeout(120);
    }
    console.log(name, log.join(' | '));
    console.log(' ->', await pg.evaluate(() => ({ phase, ending: R.ending, endings: META.endings, sub: document.getElementById('resSub').textContent })), errs);
    if (name === 'desk') await pg.screenshot({ path: 'end3.png' });
  }
  await b.close();
})();

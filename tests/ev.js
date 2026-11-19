const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  await pg.evaluate(() => { startRun(); S.running = false; R.coins = 30; R.php = 60; });
  for (let e = 0; e < 4; e++) {
    await pg.evaluate(e => { const ev = EVENTS[e](); ev.opts = ev.opts.map(o => ({ ...o, fn: () => { const m = o.fn(); if (m) toast(m); } })); R.at = R.map[1][0]; showChoice(ev); }, e);
    await pg.screenshot({ path: `ev${e}.png` });
    const w = await pg.evaluate(() => CH.opts[0].w.text);
    const before = await pg.evaluate(() => ({ c: R.coins, hp: R.php, max: R.pmax, sh: R.shields, ups: R.ups.length }));
    await type(w); await pg.waitForTimeout(200);
    console.log(e, w, before, await pg.evaluate(() => ({ phase, c: R.coins, hp: R.php, max: R.pmax, sh: R.shields, ups: R.ups.length, toast: document.getElementById('toast').textContent })));
  }
  await pg.evaluate(() => { R.at = R.map[5].find(n => n.t === 'rest'); showRest(); });
  await pg.screenshot({ path: 'rest.png' });
  await type(await pg.evaluate(() => CH.opts[1].w.text)); await pg.waitForTimeout(200);
  console.log('train ->', await pg.evaluate(() => ({ phase, title: document.querySelector('#pickScr .title').textContent, n: PK.cards.length })));
  await type(await pg.evaluate(() => PK.cards[0].w.text)); await pg.waitForTimeout(200);
  console.log('after pick', await pg.evaluate(() => ({ phase, title: document.getElementById('chTitle').textContent, opts: CH.opts.map(o => o.name) })));
  await pg.screenshot({ path: 'map_last.png' });
  console.log('errors', errs);
  await b.close();
})();

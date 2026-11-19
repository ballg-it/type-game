const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type()==='error' && errs.push(m.text()));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const mode = process.argv[2] || 'th';
  await pg.click(`[data-group=mode] [data-v=${mode}]`);
  await pg.screenshot({ path: 'start.png' });
  await pg.keyboard.press('Enter');
  const type = (t) => pg.evaluate(t => { const kb = document.getElementById('kb'); let v=''; for (const ch of t) { v += ch; kb.value = v; kb.dispatchEvent(new Event('input')); } }, t);
  let shots = 0;
  for (let step = 0; step < 600; step++) {
    const st = await pg.evaluate(() => ({ phase, idx: R.at && R.at.layer, run: S.running, def: S.def && S.def.text, ult: S.ultMode && S.ultWord.text, ultR: S.ult, slot: S.slots[2] && S.slots[2].text, php: S.php, ehp: S.ehp, cards: PK && PK.cards.map(c=>c.w.text) }));
    if (st.phase === 'result') break;
    if (st.phase === 'shop') {
      await pg.waitForTimeout(400);
      const sh = await pg.evaluate(() => ({ coins: R.coins, items: SHOP.items.filter(i=>!i.sold).map(i=>({t:i.w.text,p:i.price,n:i.up.name})), roll: SHOP.roll.w.text, leave: SHOP.leave.w.text, rc: SHOP.rollCost }));
      console.log('shop', JSON.stringify(sh));
      await pg.screenshot({ path: 'shop0.png' });
      if (!globalThis.rolled && sh.coins >= sh.rc) { globalThis.rolled = 1; await type(sh.roll); await pg.waitForTimeout(300); continue; }
      const aff = sh.items.find(i => i.p <= sh.coins);
      if (aff) { await type('zz'); await type(aff.t); console.log('bought', aff.n, await pg.evaluate(()=>R.coins)); await pg.waitForTimeout(300); await pg.screenshot({ path: 'shop1.png' }); continue; }
      await type(sh.leave); await pg.waitForTimeout(900); continue;
    }
    if (st.phase === 'choice') {
      const ch = await pg.evaluate(() => ({ map: CH.map, opts: CH.opts.filter(o => !o.off).map(o => ({ t: o.w.text, n: o.name, nd: o.nd && o.nd.t })), title: document.getElementById('chTitle').textContent }));
      const o = ch.opts[Math.floor(Math.random() * ch.opts.length)];
      if (!globalThis.ms) globalThis.ms = 0;
      if (ch.map && globalThis.ms++ < 3) await pg.screenshot({ path: `map${globalThis.ms}.png` });
      console.log(ch.title, '->', o.n, o.nd || '');
      await type(o.t); await pg.waitForTimeout(300); continue;
    }
    if (st.phase === 'story') {
      const L = await pg.evaluate(() => { const L = ST.lines[ST.i]; return { t: L.t, say: L.w && L.w.text, ch: L.choice && L.choice.map(c => c.w.text) }; });
      if (L.t !== undefined) await pg.keyboard.press('Enter'); else if (L.say) await type(L.say); else await type(L.ch[0]);
      await pg.waitForTimeout(120); continue;
    }
    if (st.phase === 'busy') { await pg.waitForTimeout(200); continue; }
    if (st.phase === 'shopExit') { await pg.waitForTimeout(300); continue; }
    if (st.phase === 'pick') {
      if (await pg.isVisible('#pickScr')) {
        if (shots++ < 2) await pg.screenshot({ path: `pick${st.idx}.png` });
        // type with a deliberate mistake first
        await type('zz'); await type(st.cards[1]);
        console.log('picked', st.cards[1], await pg.evaluate(() => R.ups.slice(-1)[0]));
      }
      await pg.waitForTimeout(300); continue;
    }
    if (!st.run) { await pg.waitForTimeout(200); continue; }
    if (st.def) await type(st.def);
    else if (st.ultR >= 100 && !st.ult) await pg.keyboard.press('Tab');
    else if (st.ult) await type(st.ult);
    else await type(st.slot);
    if (step === 8) await pg.screenshot({ path: `fight${st.idx}.png` });
    await pg.waitForTimeout(250);
  }
  await pg.waitForTimeout(1800);
  // boss screenshot happens? take result
  await pg.screenshot({ path: 'result.png' });
  console.log(await pg.evaluate(() => ({ phase, layer: R.at.layer, trail: R.trail.map(n=>n.t).join(','), cleared: R.cleared, ups: R.ups, mod: R.mod, title: document.getElementById('resTitle').textContent })));
  console.log('errors', errs);
  await b.close();
})();

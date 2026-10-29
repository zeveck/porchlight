// Checks knock outcomes and every power with real key presses (state read via window.__game).
async page => {
  const S = () => page.evaluate(() => window.__game.state());
  const TOWN = () => page.evaluate(() => window.__game.town());
  const held = new Set();
  const hold = async keys => { for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  async function walkTo(goal, nearPx = 9, maxMs = 40000) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      const st = await S(); const p = st.player;
      if (Math.hypot(goal.x - p.x, goal.y - p.y) <= nearPx) { await hold([]); return true; }
      const path = await page.evaluate(([x, y]) => window.__game.pathTo(x, y), [Math.floor(goal.x / 16), Math.floor(goal.y / 16)]);
      let tx = goal.x, ty = goal.y;
      if (path && path.length > 2) { const n = path[2]; tx = n[0] * 16 + 8; ty = n[1] * 16 + 8; }
      const keys = []; const dx = tx - p.x, dy = ty - p.y;
      if (dx > 3) keys.push('ArrowRight'); else if (dx < -3) keys.push('ArrowLeft');
      if (dy > 3) keys.push('ArrowDown'); else if (dy < -3) keys.push('ArrowUp');
      await hold(keys); await page.waitForTimeout(40);
    }
    await hold([]); return false;
  }
  const out = {};
  const K = ['spooky', 'critter', 'hero', 'magic', 'snack'];
  await page.evaluate(() => { window.__game.goToLevel(2, 2222, { wardrobe: 'starter', jacks: 'none', firstDone: true, costume: 'spooky-white' }); window.__game.setTimeScale(3); });
  await page.waitForTimeout(400);
  let t = await TOWN();
  const hh = await page.evaluate(() => 0);
  // neutral house: fav kind != spooky and color != white and not disliking spooky (unknown) -> pick one, check result type by candy delta
  const st0 = await S();
  const close = t.houses.find(h => h.fav.startsWith('spooky-') || h.fav.endsWith('-white'));
  const neutral = t.houses.find(h => !h.fav.startsWith('spooky-') && !h.fav.endsWith('-white'));
  if (close) { await walkTo({ x: close.door.x * 16 + 8, y: close.door.y * 16 + 8 }); const c0 = (await S()).candy; await page.keyboard.press('Space'); await page.waitForTimeout(200); const tt = await TOWN(); const h = tt.houses.find(x => x.id === close.id); out.close = { delta: (await S()).candy - c0, exact: h.exact, lit: h.lit, refill: h.refill > 0 }; }
  if (neutral) { await walkTo({ x: neutral.door.x * 16 + 8, y: neutral.door.y * 16 + 8 }); const c0 = (await S()).candy; await page.keyboard.press('Space'); await page.waitForTimeout(200); const sv = await page.evaluate(() => window.__game.save()); out.neutral = { delta: (await S()).candy - c0, clue: sv.clues[neutral.id] };
    // knock again right away: empty bowl
    const c1 = (await S()).candy; await page.keyboard.press('Space'); await page.waitForTimeout(200); out.emptyBowl = { delta: (await S()).candy - c1 }; }
  // powers: wear each power's costume and press Shift
  const powers = { dash: 'hero-orange', float: 'spooky-white', boo: 'spooky-black', sniff: 'critter-orange', charm: 'magic-purple', rush: 'snack-red' };
  out.powers = {};
  for (const [pw, cid] of Object.entries(powers)) {
    await page.evaluate(c => window.__game.goToLevel(2, 2222, { wardrobe: 'full', jacks: 'none', firstDone: true, costume: c }), cid);
    await page.waitForTimeout(400);
    await page.keyboard.press('Shift'); await page.waitForTimeout(120);
    const st = await S();
    const tt = await TOWN();
    out.powers[pw] = { cd: +st.player.cd.toFixed(1), floating: st.player.floating, frozen: tt.kids.filter(k => k.frozen).length };
    await page.keyboard.press('Shift'); await page.waitForTimeout(100);  // during cooldown: should do nothing harmful
  }
  // float over a house: from home spawn, float up over the home's roof and check we never end on a blocked tile
  await page.evaluate(() => window.__game.goToLevel(2, 2222, { wardrobe: 'full', jacks: 'none', firstDone: true, costume: 'spooky-white' }));
  await page.waitForTimeout(400);
  const y0 = (await S()).player.y;
  await page.keyboard.press('Shift'); await hold(['ArrowUp']); await page.waitForTimeout(1200); await hold([]);
  await page.waitForTimeout(2500);
  const fst = await S();
  out.floatOver = { movedTiles: +((y0 - fst.player.y) / 16).toFixed(1), floating: fst.player.floating };
  return out;
}

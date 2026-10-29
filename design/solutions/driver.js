// Closed-loop play-test driver for Porchlight. Runs inside `playwright-cli run-code`.
// It reads state through window.__game (town(), pathTo(), state()) and plays ONLY with real key presses.
async page => {
  const S = () => page.evaluate(() => window.__game.state());
  const TOWN = () => page.evaluate(() => window.__game.town());
  const held = new Set();
  const hold = async keys => {
    for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  const tap = async (k, wait = 120) => { await hold([]); await page.keyboard.press(k); await page.waitForTimeout(wait); };
  const KIND = ['spooky', 'critter', 'hero', 'magic', 'snack'], COL = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black', 'brown'];
  const idx = id => { const [k, c] = id.split('-'); return KIND.indexOf(k) * 10 + COL.indexOf(c); };
  // walk until within `near` px of a world point; target can be a function (moving kid)
  async function walkTo(getGoal, nearPx = 10, maxMs = 60000) {
    const t0 = Date.now();
    let stuck = 0, lastPos = null;
    while (Date.now() - t0 < maxMs) {
      const goal = await getGoal(); if (!goal) { await hold([]); return false; }
      const st = await S();
      if (st.dialog) { await hold([]); return true; }
      const p = st.player;
      const d = Math.hypot(goal.x - p.x, goal.y - p.y);
      if (d <= nearPx) { await hold([]); return true; }
      const path = await page.evaluate(([x, y]) => window.__game.pathTo(x, y), [Math.floor(goal.x / 16), Math.floor(goal.y / 16)]);
      let tx = goal.x, ty = goal.y;
      if (path && path.length > 2) { const n = path[Math.min(2, path.length - 1)]; tx = n[0] * 16 + 8; ty = n[1] * 16 + 8; }
      const dx = tx - p.x, dy = ty - p.y, keys = [];
      if (dx > 3) keys.push('ArrowRight'); else if (dx < -3) keys.push('ArrowLeft');
      if (dy > 3) keys.push('ArrowDown'); else if (dy < -3) keys.push('ArrowUp');
      if (lastPos && Math.hypot(lastPos.x - p.x, lastPos.y - p.y) < 0.5) stuck++; else stuck = 0;
      lastPos = p;
      if (stuck > 25) { keys.length = 0; keys.push(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'][Math.floor(Math.random() * 4)]); stuck = 0; }
      await hold(keys);
      await page.waitForTimeout(40);
    }
    await hold([]);
    return false;
  }
  const doorPt = h => ({ x: h.door.x * 16 + 8, y: h.door.y * 16 + 8 });
  async function knockAt(h) { if (!(await walkTo(async () => doorPt(h), 9))) return false; await tap('Space', 250); return true; }
  async function answerYes() { const st = await S(); if (st.dialog) await tap('Digit1', 250); }
  async function closeInfo() { const st = await S(); if (st.dialog) await tap('Escape', 200); }
  async function wear(cid) {
    const t = await TOWN();
    if (!(await walkTo(async () => ({ x: t.home.x * 16 + 8, y: t.home.y * 16 + 8 }), 9))) return false;
    await tap('Space', 300);
    let st = await S(); if (!st.dialog || st.dialog.type !== 'wardrobe') return false;
    const sv = await page.evaluate(() => window.__game.save());
    const list = sv.wardrobe.slice().sort((a, b) => idx(a) - idx(b));
    const LW = st.view.LW, pw = Math.min(LW - 16, 420), cols = Math.max(1, Math.floor((pw - 16) / 36));
    const from = list.indexOf(st.player.costume), to = list.indexOf(cid);
    const dr = Math.floor(to / cols) - Math.floor(from / cols), dc = (to % cols) - (from % cols);
    for (let i = 0; i < Math.abs(dr); i++) await tap(dr > 0 ? 'ArrowDown' : 'ArrowUp', 80);
    for (let i = 0; i < Math.abs(dc); i++) await tap(dc > 0 ? 'ArrowRight' : 'ArrowLeft', 80);
    await tap('Space', 300);
    st = await S();
    if (st.dialog) await tap('Escape', 200);
    return (await S()).player.costume === cid;
  }
  const log = [];
  const T0 = Date.now();
  for (let iter = 0; iter < 200 && Date.now() - T0 < 600000; iter++) {
    let st = await S();
    if (st.screen !== 'play') { await page.waitForTimeout(300); continue; }
    if (st.reached && !(await page.evaluate(() => window.__game.town())).houses.every(h => h.lit) && st.night !== 8) break;
    if (st.lit >= st.need) break;
    await closeInfo();
    const t = await TOWN();
    const sv = await page.evaluate(() => window.__game.save());
    const owned = new Set(sv.wardrobe);
    const p = st.player;
    const dist = h => Math.hypot(doorPt(h).x - p.x, doorPt(h).y - p.y);
    const unlit = t.houses.filter(h => !h.lit).sort((a, b) => dist(a) - dist(b));
    // 1) wearing a favorite of an unlit house: go light it
    let h = unlit.find(h => h.fav === p.costume);
    if (h) { await knockAt(h); log.push('light ' + h.id); continue; }
    // 2) a known jack: instant switch
    h = unlit.find(h => h.known);
    if (h) { await knockAt(h); await answerYes(); log.push('switch ' + h.id); continue; }
    // 3) a kid wears a favorite and we can afford it
    let best = null;
    for (const u of unlit) {
      if (owned.has(u.fav)) continue;
      const k = t.kids.filter(k => k.costume === u.fav && !k.prankster).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (k && k.price <= st.candy) { best = { u, k }; break; }
    }
    if (best) {
      const id = best.k.id;
      const ok = await walkTo(async () => { const tt = await TOWN(); const kk = tt.kids.find(x => x.id === id); return kk && kk.costume === best.u.fav ? { x: kk.x, y: kk.y } : null; }, 16, 45000);
      if (ok) {
        st = await S();
        if (!st.dialog) await tap('Space', 250);
        st = await S();
        if (st.dialog && st.dialog.type === 'swap') await tap('Digit1', 300);
        else await closeInfo();
      }
      log.push('swap for ' + best.u.id + (ok ? '' : ' (missed)'));
      continue;
    }
    // 4) an owned favorite: change at home
    h = unlit.find(h => owned.has(h.fav));
    if (h) { const ok = await wear(h.fav); log.push('wear ' + h.fav + ' ' + ok); if (ok) continue; }
    // 5) need candy: knock on the nearest full bowl
    h = t.houses.filter(h => h.refill <= 0).sort((a, b) => dist(a) - dist(b))[0];
    if (h) { await knockAt(h); await closeInfo(); log.push('candy knock ' + h.id); continue; }
    await page.waitForTimeout(1000);
  }
  await hold([]);
  const st = await S();
  return { night: st.night, lit: st.lit, need: st.need, candy: st.candy, reached: st.reached, ms: Date.now() - T0, steps: log.length, log: log.slice(-12) };
}

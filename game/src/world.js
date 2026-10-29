// The night itself: player, kids, houses, knocking, swapping, powers, tutorial prompts.
import { HOUSEHOLDS, COSTUME, COSTUMES, POWERS, KIND_NAMES, PLAYER_SPEED, KID_SPEED, START_CANDY, REFILL } from './data.js';
import { T, TILE, SOLID, findPath } from './town.js';
import { makeRng } from './rng.js';

const ACT_RANGE = 1.4 * TILE;
const FACE_RANGE = 2 * TILE;

export function createWorld(town, save, opts = {}) {
  const night = town.night;
  const rng = makeRng(town.seed ^ 0x5eed);
  const start = opts.costume || (save.wardrobe.includes('spooky-white') ? 'spooky-white' : save.wardrobe[0]);
  const w = {
    town, night, save, rng,
    time: 0,
    candy: START_CANDY,
    lit: 0,
    need: night.need,
    reached: false,
    player: {
      x: town.homeSpawn.x * TILE, y: town.homeSpawn.y * TILE, costume: start, facing: 1, moving: false, walkT: 0,
      cd: 0, cdMax: 1, dashT: 0, floatT: 0, floatExtra: 0, rushT: 0, charmNext: false, hop: 0, bumpCd: 0, vx: 0, vy: 0,
    },
    kids: [],
    particles: [], popups: [], rings: [],
    dialog: null,
    target: null,
    shake: 0,
    newCostumes: [], newJacks: [],
    trail: null,
    tut: (night.n === 1 && !save.firstDone && town.tutorialHid !== null) ? { stage: 0, t: 0 } : null,
    events: [],          // {type, ...} consumed by main for sounds and screen changes
    finaleReady: false,
    alertSeen: new Set(),
  };
  town.kids.forEach((k, i) => {
    w.kids.push({
      id: i, x: (k.spawn[0] + 0.5) * TILE, y: (k.spawn[1] + 0.5) * TILE, costume: k.costume, prankster: !!k.prankster,
      forHid: k.forHid, path: null, pi: 0, state: 'idle', t: rng.next() * 1.5, frozen: 0, faceT: 0, charmT: 0, flee: 0,
      facing: 1, walkT: rng.next() * 6, moving: false, seenAt: -999, lastX: 0, lastY: 0, inspected: false, bumpCd: 0,
      speed: KID_SPEED * (night.kidSpeedMul || 1) * (0.9 + rng.next() * 0.2), hop: 0,
    });
  });
  for (const l of town.candyHouses) { l.lit = false; l.refill = 0; l.flash = 0; }
  return w;
}

// ---------- helpers ----------
const tileAt = (w, px, py) => w.town.get(Math.floor(px / TILE), Math.floor(py / TILE));
function blocked(w, px, py, floating) {
  const t = tileAt(w, px, py);
  return floating ? t === T.FOREST : SOLID.has(t);
}
function boxBlocked(w, x, y, floating) {
  return blocked(w, x - 5, y - 3, floating) || blocked(w, x + 5, y - 3, floating) || blocked(w, x - 5, y + 3, floating) || blocked(w, x + 5, y + 3, floating);
}
function moveBox(w, e, dx, dy, floating) {
  if (dx) { if (!boxBlocked(w, e.x + dx, e.y, floating)) e.x += dx; else if (!dy) { // corner slide
    for (const s of [-1, 1]) if (!boxBlocked(w, e.x + dx, e.y + s * 3, floating)) { e.y += s * Math.min(1, Math.abs(dx)); break; } } }
  if (dy) { if (!boxBlocked(w, e.x, e.y + dy, floating)) e.y += dy; else if (!dx) {
    for (const s of [-1, 1]) if (!boxBlocked(w, e.x + s * 3, e.y + dy, floating)) { e.x += s * Math.min(1, Math.abs(dy)); break; } } }
}
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const doorPt = l => ({ x: l.door.x * TILE, y: l.door.y * TILE });
export const lotHousehold = l => (l.hid !== undefined ? HOUSEHOLDS[l.hid] : null);

export function clueOf(w, hid) {
  const c = w.save.clues[hid] || (w.save.clues[hid] = { exact: false, dots: false, crossed: [], dis: false });
  return c;
}
export function clueExact(w, hid) {
  const c = w.save.clues[hid];
  if (!c) return false;
  if (c.exact) return true;
  if (c.dots) { const h = HOUSEHOLDS[hid]; return h.candidates.filter(x => !c.crossed.includes(x)).length === 1; }
  return false;
}

export function kidPrice(w, kid) {
  let p = Math.ceil(COSTUME[kid.costume].price * (w.night.priceMul || 1));
  if (w.player.charmNext) p = Math.ceil(p / 2);
  return p;
}

// Kids wearing the favorite of an unlit candy house whose color you know exactly, and which you don't own.
export function wantedCostumes(w) {
  const set = new Map();
  for (const l of w.town.candyHouses) {
    if (l.lit) continue;
    const h = HOUSEHOLDS[l.hid];
    if (w.save.wardrobe.includes(h.fav)) continue;
    if (clueExact(w, l.hid) || w.night.finale) set.set(h.fav, l);
  }
  return set;
}

function popup(w, x, y, text, color = '#ffd25e', big = false) { w.popups.push({ x, y, text, color, t: 0, life: big ? 1.6 : 1.1, big }); }
function burst(w, x, y, n, kind = 'candy', tx = null, ty = null) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
    w.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: 0.7 + Math.random() * 0.5, kind, c: Math.floor(Math.random() * 6), tx, ty });
  }
}
function ev(w, type, extra = {}) { w.events.push({ type, ...extra }); }

// ---------- actions ----------
export function actTargets(w) {
  const p = w.player;
  const wear = p.costume;
  let best = null;
  const consider = (type, obj, d, pri) => { if (d <= ACT_RANGE && (!best || pri < best.pri || (pri === best.pri && d < best.d))) best = { type, obj, d, pri }; };
  for (const l of w.town.houses) {
    const d = dist(p, doorPt(l));
    if (d > ACT_RANGE) continue;
    const onStep = d < 12;   // standing right on the door step: the door wins over nearby kids
    const dp = onStep ? 1.5 : 3;
    if (l.kind === 'home') { consider('home', l, d, dp); continue; }
    if (!l.candy) { consider('dark', l, d, onStep ? 1.6 : 4); continue; }
    const h = HOUSEHOLDS[l.hid];
    if (h.fav === wear) consider(l.lit ? 'knock' : 'light', l, d, l.lit ? dp : 1);
    else if (l.known && !l.lit) consider('switch', l, d, dp);
    else consider('knock', l, d, dp);
  }
  for (const k of w.kids) consider('kid', k, dist(p, k), 2);
  return best;
}

export function doAct(w) {
  const t = w.target;
  if (!t) return;
  if (t.type === 'light' || t.type === 'knock') knock(w, t.obj);
  else if (t.type === 'switch') {
    const h = HOUSEHOLDS[t.obj.hid];
    w.dialog = { type: 'switch', lot: t.obj, text: `Wear the ${COSTUME[h.fav].name} and light ${h.name}' jack?`, costume: h.fav, options: ['Yes', 'No'], sel: 0 };
    ev(w, 'ui');
  } else if (t.type === 'home') {
    w.dialog = { type: 'wardrobe', sel: Math.max(0, w.save.wardrobe.indexOf(w.player.costume)), scroll: 0 };
    ev(w, 'wardrobe');
  } else if (t.type === 'dark') {
    popup(w, t.obj.door.x * TILE, t.obj.door.y * TILE - 30, 'Lights off. Nobody home.', '#b0a8c8');
    ev(w, 'empty');
  } else if (t.type === 'kid') {
    const k = t.obj;
    if (k.prankster) { popup(w, k.x, k.y - 44, 'Hee hee! No deals!', '#c48cff'); ev(w, 'meh'); return; }
    if (k.costume === w.player.costume) { popup(w, k.x, k.y - 44, 'Twins!', '#f2ead8'); ev(w, 'meh'); return; }
    const price = kidPrice(w, k);
    const mine = COSTUME[w.player.costume].name, theirs = COSTUME[k.costume].name;
    w.dialog = { type: 'swap', kid: k, price, text: `Trade your ${mine} for my ${theirs} + ${price} candy?`, options: ['Yes', 'No'], sel: 0 };
    k.faceT = 99;
    ev(w, 'ui');
  }
}

export function answerDialog(w, yes) {
  const d = w.dialog;
  if (!d) return;
  if (d.type === 'swap') {
    d.kid.faceT = 1.5;
    if (!yes) { w.dialog = null; ev(w, 'ui'); return; }
    if (w.candy < d.price) { w.dialog = { type: 'info', text: `Not enough candy: you need ${d.price}. Knock on more doors!` }; ev(w, 'nocandy'); return; }
    w.candy -= d.price;
    const k = d.kid;
    const got = k.costume;
    k.costume = w.player.costume;
    w.player.costume = got;
    w.player.charmNext = false;
    w.player.hop = 1; k.hop = 1;
    burst(w, w.player.x, w.player.y - 20, 10, 'puff');
    burst(w, k.x, k.y - 20, 10, 'puff');
    popup(w, w.player.x, w.player.y - 50, `-${d.price}`, '#ff8a7a');
    if (!w.save.wardrobe.includes(got)) { w.save.wardrobe.push(got); w.newCostumes.push(got); popup(w, w.player.x, w.player.y - 64, `New costume: ${COSTUME[got].name}!`, '#9fe0ff', true); }
    w.player.cd = Math.min(w.player.cd, 1);
    w.dialog = null;
    ev(w, 'swap'); ev(w, 'save');
  } else if (d.type === 'switch') {
    w.dialog = null;
    if (!yes) { ev(w, 'ui'); return; }
    w.player.costume = d.costume;
    if (!w.save.wardrobe.includes(d.costume)) w.save.wardrobe.push(d.costume);
    burst(w, w.player.x, w.player.y - 20, 10, 'puff');
    ev(w, 'swap');
    lightJack(w, d.lot, 5, 'Welcome back!');
  } else {
    w.dialog = null;
  }
}

export function wearFromWardrobe(w, cid) {
  if (w.player.costume !== cid) { w.player.costume = cid; burst(w, w.player.x, w.player.y - 20, 10, 'puff'); w.player.hop = 1; ev(w, 'swap'); }
  w.dialog = null;
}

function lightJack(w, lot, candy, text) {
  const h = HOUSEHOLDS[lot.hid];
  lot.lit = true; lot.flash = 1;
  w.lit++;
  const clue = clueOf(w, lot.hid); clue.exact = true;
  if (!w.save.jacks.includes(lot.hid)) { w.save.jacks.push(lot.hid); w.newJacks.push(lot.hid); }
  const dp = { x: lot.pumpkin.x * TILE, y: lot.pumpkin.y * TILE };
  w.candy += candy;
  lot.refill = REFILL;
  burst(w, dp.x, dp.y - 6, 26, 'spark');
  burst(w, dp.x, dp.y - 6, Math.min(14, candy), 'candy', w.player.x, w.player.y - 20);
  popup(w, dp.x, dp.y - 34, text, '#ffd25e', true);
  popup(w, w.player.x, w.player.y - 50, `+${candy}`, '#ffd25e');
  w.shake = 0.35;
  ev(w, 'jack', { hid: lot.hid }); ev(w, 'save');
  if (!w.reached && w.lit >= w.need) {
    w.reached = true;
    ev(w, 'target');
    if (w.night.finale) w.finaleReady = true;
  }
}

function knock(w, lot) {
  const h = HOUSEHOLDS[lot.hid];
  const wear = COSTUME[w.player.costume], fav = COSTUME[h.fav];
  const full = lot.refill <= 0;
  const dp = { x: lot.door.x * TILE, y: lot.door.y * TILE - 30 };
  if (wear.id === fav.id) {
    if (!lot.lit) return lightJack(w, lot, 15, 'PERFECT!');
    const c = full ? 6 : 0;
    if (c) { w.candy += c; burst(w, dp.x, dp.y, 6, 'candy', w.player.x, w.player.y - 20); popup(w, w.player.x, w.player.y - 50, `+${c}`); ev(w, 'candySmall'); }
    else ev(w, 'empty');
    popup(w, dp.x, dp.y, c ? 'Happy Halloween!' : 'All out, come back soon!', c ? '#ffd25e' : '#b0a8c8');
    if (c) lot.refill = REFILL;
    return;
  }
  const clue = clueOf(w, lot.hid);
  clue.dis = true;
  const dislikes = [h.dislike, ...(lot.picky ? [h.dislike2] : [])];
  const rush = w.player.rushT > 0 ? 2 : 1;
  let candy, text, color = '#f2ead8', sound;
  const cross = () => { if (h.candidates.includes(wear.color) && wear.color !== fav.color && !clue.crossed.includes(wear.color)) clue.crossed.push(wear.color); };
  if (dislikes.includes(wear.kind)) {
    candy = 0; text = `Eww, a ${KIND_NAMES[wear.kind]}!`; color = '#c9a0ff'; sound = 'eww';
    clue.dots = true; cross();
  } else if (wear.kind === fav.kind || wear.color === fav.color) {
    candy = 5 * rush; text = 'Ooh, close!'; color = '#9fe0a0'; sound = 'close';
    clue.exact = true;
  } else {
    candy = 2 * rush; text = 'Cute!'; sound = 'meh';
    clue.dots = true; cross();
  }
  if (!full) { candy = 0; text = 'All out, come back soon!'; color = '#b0a8c8'; sound = 'empty'; }
  w.candy += candy;
  if (candy) { burst(w, dp.x, dp.y + 20, Math.min(8, candy + 1), 'candy', w.player.x, w.player.y - 20); popup(w, w.player.x, w.player.y - 50, `+${candy}`); }
  popup(w, dp.x, dp.y, text, color);
  lot.flash = 0.6;
  if (full) lot.refill = REFILL;
  ev(w, 'knock'); ev(w, sound); ev(w, 'save');
  if (clueExact(w, lot.hid)) ev(w, 'clue', { hid: lot.hid });
}

// ---------- powers ----------
export function usePower(w) {
  const p = w.player;
  const c = COSTUME[p.costume];
  if (p.cd > 0) { ev(w, 'notReady'); return; }
  const pw = POWERS[c.power];
  p.cd = pw.cd; p.cdMax = pw.cd;
  if (c.power === 'dash') { p.dashT = 1; ev(w, 'dash'); }
  else if (c.power === 'float') { p.floatT = 3; p.floatExtra = 0; ev(w, 'float'); }
  else if (c.power === 'boo') {
    for (const k of w.kids) { const d = dist(p, k); if (d < 6 * TILE) { if (k.prankster) { k.flee = 4; } else k.frozen = 4; } }
    w.rings.push({ x: p.x, y: p.y - 16, t: 0, life: 0.7, r: 6 * TILE, color: '#f2ead8' });
    ev(w, 'boo');
  } else if (c.power === 'sniff') {
    let n = 0;
    for (const l of w.town.candyHouses) if (dist(p, doorPt(l)) < 10 * TILE) { const cl = clueOf(w, l.hid); if (!clueExact(w, l.hid)) { cl.exact = true; n++; l.flash = 0.8; } }
    const want = wantedCostumes(w);
    let best = null;
    for (const k of w.kids) if (want.has(k.costume) && (!best || dist(p, k) < dist(p, best))) best = k;
    if (best) w.trail = { kid: best, t: 6 };
    popup(w, p.x, p.y - 56, n ? `Sniffed out ${n} color${n > 1 ? 's' : ''}!` : (best ? 'Sniff sniff… this way!' : 'Sniff sniff…'), '#9fe0a0');
    w.rings.push({ x: p.x, y: p.y - 16, t: 0, life: 0.9, r: 10 * TILE, color: '#9fe0a0' });
    ev(w, 'sniff'); ev(w, 'save');
  } else if (c.power === 'charm') {
    p.charmNext = true;
    for (const k of w.kids) if (dist(p, k) < 8 * TILE && !k.prankster) k.charmT = 4;
    burst(w, p.x, p.y - 30, 10, 'heart');
    popup(w, p.x, p.y - 56, 'Next swap half price!', '#ff9ad0');
    ev(w, 'charm');
  } else if (c.power === 'rush') { p.rushT = 15; ev(w, 'rush'); popup(w, p.x, p.y - 56, 'SUGAR RUSH!', '#ff9ad0'); }
}

// ---------- update ----------
export function updateWorld(w, dt, axis, act, power) {
  w.time += dt;
  const p = w.player;
  const paused = !!w.dialog;
  for (const l of w.town.candyHouses) { if (l.refill > 0) l.refill -= dt; if (l.flash > 0) l.flash -= dt; }
  if (!paused) {
    // player movement
    let sp = PLAYER_SPEED;
    if (p.dashT > 0) { sp *= 2.2; p.dashT -= dt; if (Math.random() < 0.5) w.particles.push({ x: p.x, y: p.y, t: 0, life: 0.25, kind: 'ghost', costume: p.costume, facing: p.facing }); }
    if (p.rushT > 0) { sp *= 1.3; p.rushT -= dt; if (Math.random() < 0.3) w.particles.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y - Math.random() * 30, vx: 0, vy: -20, t: 0, life: 0.6, kind: 'sparkle' }); }
    const floating = p.floatT > 0 || p.floatExtra > 0;
    p.moving = Math.abs(axis.x) + Math.abs(axis.y) > 0.1;
    if (p.moving) {
      if (Math.abs(axis.x) > 0.2) p.facing = axis.x > 0 ? 1 : -1;
      const steps = Math.ceil(sp * dt / 2);
      for (let i = 0; i < steps; i++) moveBox(w, p, axis.x * sp * dt / steps, axis.y * sp * dt / steps, floating);
      p.walkT += dt * 10;
    }
    if (p.floatT > 0) {
      p.floatT -= dt;
      if (p.floatT <= 0) {
        if (boxBlocked(w, p.x, p.y, false)) p.floatExtra = 1.5; else { ev(w, 'land'); burst(w, p.x, p.y, 6, 'puff'); }
      }
    } else if (p.floatExtra > 0) {
      if (!boxBlocked(w, p.x, p.y, false)) { p.floatExtra = 0; ev(w, 'land'); burst(w, p.x, p.y, 6, 'puff'); }
      else { p.floatExtra -= dt; if (p.floatExtra <= 0) { snapToWalkable(w, p); ev(w, 'land'); burst(w, p.x, p.y, 6, 'puff'); } }
    }
    if (p.cd > 0) p.cd -= dt;
    if (p.hop > 0) p.hop -= dt * 3;
    if (p.bumpCd > 0) p.bumpCd -= dt;
    if (power) usePower(w);
    w.target = actTargets(w);
    if (act) doAct(w);
  }
  updateKids(w, dt, paused);
  if (w.trail) { w.trail.t -= dt; if (w.trail.t <= 0) w.trail = null; }
  // particles
  for (const q of w.particles) {
    q.t += dt;
    if (q.kind === 'candy' && q.tx !== null && q.t > 0.25) { const k = Math.min(1, (q.t - 0.25) * 4); q.x += (w.player.x - q.x) * k * 0.25; q.y += (w.player.y - 20 - q.y) * k * 0.25; }
    else if (q.vx !== undefined) { q.x += q.vx * dt; q.y += q.vy * dt; if (q.kind !== 'sparkle' && q.kind !== 'heart') q.vy += 160 * dt; }
  }
  w.particles = w.particles.filter(q => q.t < q.life);
  for (const q of w.popups) q.t += dt;
  w.popups = w.popups.filter(q => q.t < q.life);
  for (const r of w.rings) r.t += dt;
  w.rings = w.rings.filter(r => r.t < r.life);
  if (w.shake > 0) w.shake -= dt;
  if (w.tut) updateTutorial(w, dt);
  // kids seen with "!" for the first time
  const want = wantedCostumes(w);
  for (const k of w.kids) if (want.has(k.costume) && dist(p, k) < 10 * TILE && !w.alertSeen.has(k.id + k.costume)) { w.alertSeen.add(k.id + k.costume); ev(w, 'alert'); }
}

function snapToWalkable(w, e) {
  const sx = Math.floor(e.x / TILE), sy = Math.floor(e.y / TILE);
  const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]];
  for (let i = 0; i < q.length && i < 4000; i++) {
    const [x, y] = q[i];
    if (!SOLID.has(w.town.get(x, y)) && !boxBlocked(w, (x + 0.5) * TILE, (y + 0.5) * TILE, false)) { e.x = (x + 0.5) * TILE; e.y = (y + 0.5) * TILE; return; }
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } }
  }
  e.x = w.town.homeSpawn.x * TILE; e.y = w.town.homeSpawn.y * TILE;
}

function pickKidTarget(w, k) {
  const rng = w.rng;
  const tx = Math.floor(k.x / TILE), ty = Math.floor(k.y / TILE);
  let goal = null, lot = null;
  if (rng.chance(0.55) && w.town.candyHouses.length) {
    const near = w.town.candyHouses.filter(l => Math.abs(l.door.x - tx) + Math.abs(l.door.y - ty) < 32);
    if (near.length) { lot = rng.pick(near); goal = [Math.floor(lot.side.x), Math.floor(lot.side.y)]; }
  }
  if (!goal) {
    for (let i = 0; i < 8 && !goal; i++) { const s = rng.pick(w.town.streetTiles); if (Math.abs(s[0] - tx) + Math.abs(s[1] - ty) < 28) goal = s; }
    if (!goal) goal = rng.pick(w.town.streetTiles);
  }
  const path = findPath(w.town, tx, ty, goal[0], goal[1], 6000);
  if (path && path.length > 1) { k.path = path; k.pi = 1; k.goalLot = lot; k.state = 'walk'; }
  else { k.state = 'idle'; k.t = 0.5 + rng.next(); }
}

function updateKids(w, dt, paused) {
  const p = w.player;
  const want = null;
  let budget = 3;  // paths per frame
  for (const k of w.kids) {
    if (k.hop > 0) k.hop -= dt * 3;
    k.moving = false;
    if (k.bumpCd > 0) k.bumpCd -= dt;
    const d = dist(p, k);
    if (d < 6 * TILE) { k.seenAt = w.time; k.lastX = k.x; k.lastY = k.y; k.inspected = true; }
    if (paused && k.faceT > 50) continue;
    if (d < 18 && d > 0.01 && !k.prankster) { const a = Math.atan2(k.y - p.y, k.x - p.x); moveBox(w, k, Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt, false); }
    if (w.tut && k.forHid === w.town.tutorialHid && w.tut.stage <= 2) { k.facing = p.x > k.x ? 1 : -1; continue; }
    if (k.frozen > 0) { k.frozen -= dt; continue; }
    if (k.faceT > 0) k.faceT -= dt;
    // pranksters chase you and bump you
    if (k.prankster) {
      if (k.flee > 0) {
        k.flee -= dt;
        const a = Math.atan2(k.y - p.y, k.x - p.x);
        moveBox(w, k, Math.cos(a) * k.speed * 1.6 * dt, Math.sin(a) * k.speed * 1.6 * dt, false);
        k.moving = true; k.walkT += dt * 10; k.path = null; continue;
      }
      if (!paused && d < 7 * TILE && k.bumpCd <= 0 && p.floatT <= 0) {
        const a = Math.atan2(p.y - k.y, p.x - k.x);
        moveBox(w, k, Math.cos(a) * k.speed * 1.15 * dt, Math.sin(a) * k.speed * 1.15 * dt, false);
        k.facing = Math.cos(a) > 0 ? 1 : -1; k.moving = true; k.walkT += dt * 10; k.path = null;
        if (d < 12 && p.bumpCd <= 0) {
          const lost = Math.min(3, w.candy);
          w.candy -= lost; p.bumpCd = 1; k.bumpCd = 5; k.flee = 2;
          moveBox(w, p, Math.cos(a) * 14, Math.sin(a) * 14, false);
          if (lost) { popup(w, p.x, p.y - 50, `-${lost}`, '#ff8a7a'); burst(w, p.x, p.y - 20, lost * 2, 'candy'); }
          w.shake = 0.2;
          ev(w, 'bump');
        }
        continue;
      }
    } else {
      if (d < FACE_RANGE && !paused) { k.faceT = Math.max(k.faceT, 1.5); }
      if (k.faceT > 0) { k.facing = p.x > k.x ? 1 : -1; continue; }
      if (k.charmT > 0) {
        k.charmT -= dt;
        if (d > 22) { const a = Math.atan2(p.y - k.y, p.x - k.x); moveBox(w, k, Math.cos(a) * k.speed * dt, Math.sin(a) * k.speed * dt, false); k.facing = Math.cos(a) > 0 ? 1 : -1; k.moving = true; k.walkT += dt * 10; k.path = null; }
        if (Math.random() < dt * 2) w.particles.push({ x: k.x, y: k.y - 44, vx: 0, vy: -16, t: 0, life: 0.8, kind: 'heart' });
        continue;
      }
    }
    if (k.state === 'idle') {
      k.t -= dt;
      if (k.t <= 0 && budget > 0) { budget--; pickKidTarget(w, k); }
      continue;
    }
    if (k.state === 'visit') {
      k.t -= dt;
      if (k.t <= 0) {
        if (k.goalLot && k.goalLot.refill <= 0) k.goalLot.refill = REFILL;
        k.state = 'idle'; k.t = 0.3;
      }
      continue;
    }
    if (k.state === 'walk') {
      if (!k.path || k.pi >= k.path.length) {
        if (k.goalLot) { k.state = 'visit'; k.t = 2; k.facing = 1; } else { k.state = 'idle'; k.t = 0.5 + w.rng.next() * 2; }
        continue;
      }
      const [nx, ny] = k.path[k.pi];
      const gx = (nx + 0.5) * TILE, gy = (ny + 0.5) * TILE;
      const dx = gx - k.x, dy = gy - k.y, m = Math.hypot(dx, dy);
      const step = k.speed * dt;
      if (m <= step) { k.x = gx; k.y = gy; k.pi++; }
      else { k.x += dx / m * step; k.y += dy / m * step; }
      if (Math.abs(dx) > 1) k.facing = dx > 0 ? 1 : -1;
      k.moving = true; k.walkT += dt * 10;
    }
  }
}

// ---------- tutorial ----------
export const TUT_TEXT = [
  'Knock on the pumpkin house: walk up and press A.',
  'Try the next pumpkin house too!',
  'That kid wears what they love: walk up and press A to trade.',
  'Go back and knock!',
  'Light 10 jacks to finish the night. The map (Tab) shows every house.',
];
function updateTutorial(w, dt) {
  const tut = w.tut;
  const ghostLot = w.town.candyHouses.find(l => HOUSEHOLDS[l.hid].fav === 'spooky-white');
  const tutLot = w.town.candyHouses.find(l => l.hid === w.town.tutorialHid);
  const fav = HOUSEHOLDS[w.town.tutorialHid].fav;
  if (tut.stage === 0 && ghostLot && ghostLot.lit) tut.stage = 1;
  if (tut.stage <= 1 && clueExact(w, tutLot.hid)) tut.stage = 2;
  if (tut.stage <= 2 && w.player.costume === fav) tut.stage = 3;
  if (tut.stage <= 3 && tutLot.lit) { tut.stage = 4; tut.t = 0; w.save.firstDone = true; ev(w, 'save'); }
  if (tut.stage === 4) { tut.t += dt; if (tut.t > 8) { w.tut = null; return; } }
  tut.text = TUT_TEXT[tut.stage];
  if (tut.stage === 0) tut.arrow = ghostLot ? { x: ghostLot.door.x * TILE, y: ghostLot.door.y * TILE } : null;
  else if (tut.stage === 3 && w.player.costume !== fav) { tut.text = 'Change back into it at your closet: knock on your own door (home).'; tut.arrow = { x: w.town.home.door.x * TILE, y: w.town.home.door.y * TILE }; }
  else if (tut.stage === 1 || tut.stage === 3) tut.arrow = { x: tutLot.door.x * TILE, y: tutLot.door.y * TILE };
  else if (tut.stage === 2) {
    let k = w.kids.find(k => k.costume === fav);
    tut.arrow = k ? { x: k.x, y: k.y - 20 } : null;
  } else tut.arrow = null;
}

// Finale pointer: when 5 or fewer jacks remain on the big night.
export function finalePointer(w) {
  if (!w.night.finale) return null;
  const left = w.town.candyHouses.filter(l => !l.lit);
  if (left.length === 0 || left.length > 5) return null;
  let best = null;
  for (const l of left) if (!best || dist(w.player, doorPt(l)) < dist(w.player, doorPt(best))) best = l;
  return { x: best.door.x * TILE, y: best.door.y * TILE };
}

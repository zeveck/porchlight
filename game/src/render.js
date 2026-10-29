// Drawing the night: a pre-rendered static town, darkness with warm light pools, characters on top,
// then signs, ribbons, badges and effects above everything.
import { IMG, TILES, canvas, drawKindIcon, drawPumpkin, drawCandy, PAL } from './art.js';
import { T, TILE } from './town.js';
import { HOUSEHOLDS, COSTUME, COSTUMES, COLOR_HEX, KINDS } from './data.js';
import { clueOf, clueExact, wantedCostumes, kidPrice, finalePointer, dist } from './world.js';

const TINTS = ['#eadcc0', '#c8d6ea', '#f0c8b6', '#cfe4c4', '#dccdec', '#f2e2a8', '#f6c890'];

// ---------- sprite caches ----------
export const SPR = { day: {}, night: {}, outline: {} };
function nightVersion(img) {
  const c = canvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data, W = c.width, H = c.height;
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : px[(y * W + x) * 4 + 3];
  const out = new Uint8ClampedArray(px);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!px[i + 3]) continue;
    // slightly dimmed for night, with no color cast, so costumes match the collection
    out[i] = px[i] * 0.92; out[i + 1] = px[i + 1] * 0.92; out[i + 2] = px[i + 2] * 0.92;
  }
  g.putImageData(new ImageData(out, W, H), 0, 0);
  return c;
}
function outlineVersion(img, color = '#ffd25e') {
  const c = canvas(img.width + 2, img.height + 2), g = c.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(img, dx, dy);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
export function buildSpriteCaches() {
  for (const c of COSTUMES) {
    const im = IMG['c-' + c.id];
    if (!im) continue;
    SPR.day[c.id] = im;
    SPR.night[c.id] = nightVersion(im);
    SPR.outline[c.id] = outlineVersion(im);
  }
}

// House variants: style x tint x lit
const houseCache = {};
export function houseSprite(style, tint, lit) {
  const key = style + ':' + tint + ':' + lit;
  if (houseCache[key]) return houseCache[key];
  const base = IMG['house-' + style], wall = IMG['house-' + style + '-wall'], win = IMG['house-' + style + '-win'];
  const c = canvas(base.width, base.height), g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  // tint the walls only
  const t = canvas(base.width, base.height), tg = t.getContext('2d');
  tg.drawImage(wall, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = TINTS[tint % TINTS.length]; tg.fillRect(0, 0, t.width, t.height);
  g.globalCompositeOperation = 'multiply'; g.drawImage(t, 0, 0);
  g.globalCompositeOperation = 'source-over';
  if (lit) {
    const wv = canvas(base.width, base.height), wg = wv.getContext('2d');
    wg.drawImage(win, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#ffcf5a'; wg.fillRect(0, 0, wv.width, wv.height);
    g.drawImage(wv, 0, 0);
  }
  return (houseCache[key] = c);
}

// ---------- static town ----------
export function buildStatic(town) {
  const W = town.W * TILE, H = town.H * TILE;
  const c = canvas(W, H), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  for (let ty = 0; ty < town.H; ty++) for (let tx = 0; tx < town.W; tx++) {
    const t = town.get(tx, ty), h = hash(tx, ty), X = tx * TILE, Y = ty * TILE;
    let img;
    if (t === T.ROAD) img = TILES.road[h % 2];
    else if (t === T.WALK) img = TILES.sidewalk[h % 2];
    else if (t === T.PATH) img = TILES.path[0];
    else if (t === T.HEDGE) img = TILES.hedge[h % 2];
    else if (t === T.PLAZA) img = TILES.plaza[h % 2];
    else img = (h % 11 === 0) ? TILES.grassLeaf[h % 2] : TILES.grass[h % 4];
    g.drawImage(img, X, Y);
    if (t === T.FOREST) { g.fillStyle = 'rgba(10,14,20,0.45)'; g.fillRect(X, Y, TILE, TILE); }
  }
  // road center dashes
  g.fillStyle = 'rgba(230,210,140,0.35)';
  for (let ty = 0; ty < town.H; ty++) for (let tx = 0; tx < town.W; tx++) {
    if (town.get(tx, ty) === T.ROAD && town.get(tx, ty + 1) === T.ROAD && town.get(tx, ty - 1) === T.WALK && town.get(tx - 1, ty) === T.ROAD && town.get(tx + 1, ty) === T.ROAD && tx % 3 === 0) g.fillRect(tx * TILE + 2, ty * TILE + 15, 8, 2);
  }
  // sprites, y-sorted: houses, trees, lamps, tombs, forest border trees, fountain
  const items = [];
  for (const l of town.houses) {
    const lit = l.candy || l.kind === 'home';
    const spr = houseSprite(l.style, l.tint, lit);
    items.push({ y: (l.y + 5) * TILE, draw: () => g.drawImage(spr, Math.round((l.x + 2.5) * TILE - spr.width / 2), (l.y + 5) * TILE - spr.height + 2) });
  }
  for (const d of town.deco) {
    const im = { tree: IMG.oak, oak: IMG.oak, deadtree: IMG.deadtree, lamp: IMG.lamp, tomb: IMG.tomb, bush: null }[d.type];
    if (d.type === 'bush') { items.push({ y: (d.y + 1) * TILE, draw: () => { g.drawImage(TILES.hedge[0], d.x * TILE, d.y * TILE); } }); continue; }
    if (!im) continue;
    items.push({ y: (d.y + 1) * TILE, draw: () => g.drawImage(im, Math.round((d.x + 0.5) * TILE - im.width / 2), (d.y + 1) * TILE - im.height + 2) });
  }
  // fountain in the plaza
  const p = town.plaza;
  if (IMG.fountain) items.push({ y: (p.y + 4) * TILE, draw: () => g.drawImage(IMG.fountain, Math.round((p.x + p.w / 2) * TILE - IMG.fountain.width / 2), (p.y + 4.5) * TILE - IMG.fountain.height) });
  // forest border: trees along the edge
  for (let ty = 0; ty < town.H; ty += 2) for (let tx = 0; tx < town.W; tx += 2) {
    if (town.get(tx, ty) !== T.FOREST) continue;
    const near = tx < 3 || ty < 3 || tx >= town.W - 3 || ty >= town.H - 3;
    if (!near) continue;
    const h = hash(tx, ty);
    const im = h % 3 === 0 ? IMG.deadtree : IMG.oak;
    items.push({ y: (ty + 1) * TILE, draw: () => { g.globalAlpha = 0.85; g.drawImage(im, tx * TILE + (h % 7) - 16, (ty + 1) * TILE - im.height + (h % 5)); g.globalAlpha = 1; } });
  }
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  // home marker: a welcome mat
  const hm = town.home;
  g.fillStyle = '#a8453a'; g.fillRect((hm.x + 2) * TILE + 1, (hm.y + 5) * TILE + 1, 14, 5);
  return c;
}

// static lights: porch lights and lamps
export function buildLights(town) {
  const L = [];
  for (const l of town.houses) if (l.candy || l.kind === 'home') L.push({ x: (l.x + 2.5) * TILE, y: (l.y + 4.6) * TILE, r: 34, warm: 0.25 });
  for (const d of town.deco) if (d.type === 'lamp') L.push({ x: (d.x + 0.5) * TILE, y: (d.y - 1.2) * TILE, r: 52, warm: 0.18 });
  return L;
}

const gradCache = {};
function grad(r, color) {
  const k = r + color;
  if (gradCache[k]) return gradCache[k];
  const c = canvas(r * 2, r * 2), g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(0.55, color.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.6) + ')')); gr.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  return (gradCache[k] = c);
}

// ---------- per-frame world drawing ----------
let darkC = null;
export function drawWorld(g, w, LW, LH, cam) {
  const town = w.town, fog = !!w.night.fog;
  const ox = Math.round(cam.x), oy = Math.round(cam.y);
  g.fillStyle = '#0e0b1c'; g.fillRect(0, 0, LW, LH);
  g.drawImage(w.staticC, -ox, -oy);
  const onScreen = (x, y, m = 80) => x > ox - m && x < ox + LW + m && y > oy - m && y < oy + LH + m;

  // pumpkins and jacks (before darkness, so the darkness dims uncarved ones; lit ones glow after)
  for (const l of town.candyHouses) {
    const px = l.pumpkin.x * TILE, py = l.pumpkin.y * TILE;
    if (!onScreen(px, py)) continue;
    drawPumpkinAt(g, w, l, px - ox, py - oy);
  }

  // darkness
  if (!darkC || darkC.width !== LW || darkC.height !== LH) darkC = canvas(LW, LH);
  const d = darkC.getContext('2d');
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, LW, LH);
  d.fillStyle = fog ? 'rgba(18,14,38,0.84)' : 'rgba(14,10,34,0.72)';
  d.fillRect(0, 0, LW, LH);
  d.globalCompositeOperation = 'destination-out';
  const scale = fog ? 0.75 : 1;
  const lights = [];
  for (const L of w.lights) if (onScreen(L.x, L.y)) lights.push(L);
  for (const l of town.candyHouses) if (l.lit) lights.push({ x: l.pumpkin.x * TILE, y: l.pumpkin.y * TILE - 6, r: 46 + Math.sin(w.time * 9 + l.hid) * 2, warm: 0.4 });
  lights.push({ x: w.player.x, y: w.player.y - 14, r: 60, warm: 0.08 });
  for (const L of lights) { const r = Math.round(L.r * scale); d.drawImage(grad(r, 'rgba(0,0,0,1)'), L.x - ox - r, L.y - oy - r); }
  g.drawImage(darkC, 0, 0);
  // warm glow
  g.globalCompositeOperation = 'lighter';
  for (const L of lights) { const r = Math.round(L.r * 0.8 * scale); g.globalAlpha = L.warm; g.drawImage(grad(r, 'rgba(255,150,40,1)'), L.x - ox - r, L.y - oy - r); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';

  // lit jacks and pumpkins redrawn crisp above the darkness (dimmed if just pumpkins)
  for (const l of town.candyHouses) {
    const px = l.pumpkin.x * TILE, py = l.pumpkin.y * TILE;
    if (!onScreen(px, py)) continue;
    if (l.lit) drawPumpkinAt(g, w, l, px - ox, py - oy);
    else { g.globalAlpha = 0.6; drawPumpkinAt(g, w, l, px - ox, py - oy); g.globalAlpha = 1; }
  }

  // Sniff trail
  if (w.trail) {
    const k = w.trail.kid, p = w.player;
    const n = Math.floor(dist(p, k) / 14);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = p.x + (k.x - p.x) * t, y = p.y + (k.y - p.y) * t - 8 + Math.sin(w.time * 6 + i) * 3;
      g.fillStyle = `rgba(160,230,160,${0.7 * Math.min(1, w.trail.t)})`; g.fillRect(Math.round(x - ox), Math.round(y - oy), 2, 2);
    }
  }

  // characters, y-sorted, drawn on top of the darkness
  const chars = [];
  for (const k of w.kids) if (onScreen(k.x, k.y)) chars.push(k);
  chars.sort((a, b) => a.y - b.y);
  chars.push(w.player);
  for (const e of chars) drawChar(g, w, e, e.x - ox, e.y - oy, e === w.player);

  // particles in world space
  for (const q of w.particles) {
    const x = Math.round(q.x - ox), y = Math.round(q.y - oy), f = 1 - q.t / q.life;
    if (q.kind === 'candy') drawCandy(g, x - 2, y - 2, q.c);
    else if (q.kind === 'spark') { g.fillStyle = f > 0.5 ? '#fff2a0' : '#f08a24'; g.fillRect(x, y, 2, 2); }
    else if (q.kind === 'puff') { g.fillStyle = `rgba(242,234,216,${f * 0.8})`; g.beginPath(); g.arc(x, y, 2 + (1 - f) * 5, 0, 7); g.fill(); }
    else if (q.kind === 'sparkle') { g.fillStyle = `rgba(255,154,208,${f})`; g.fillRect(x, y, 1, 3); g.fillRect(x - 1, y + 1, 3, 1); }
    else if (q.kind === 'heart') { g.fillStyle = `rgba(255,111,168,${f})`; g.fillRect(x - 2, y, 2, 2); g.fillRect(x + 1, y, 2, 2); g.fillRect(x - 2, y + 1, 5, 2); g.fillRect(x - 1, y + 3, 3, 1); g.fillRect(x, y + 4, 1, 1); }
    else if (q.kind === 'ghost') { const im = SPR.night[q.costume]; if (im) { g.globalAlpha = f * 0.4; g.save(); g.translate(x, y); g.scale(q.facing, 1); g.drawImage(im, -im.width / 2, -im.height); g.restore(); g.globalAlpha = 1; } }
  }
  for (const r of w.rings) {
    const f = r.t / r.life;
    g.strokeStyle = r.color; g.globalAlpha = 1 - f; g.lineWidth = 2;
    g.beginPath(); g.arc(Math.round(r.x - ox), Math.round(r.y - oy), r.r * f, 0, 7); g.stroke(); g.globalAlpha = 1;
  }
}

function drawPumpkinAt(g, w, l, x, y) {
  const h = HOUSEHOLDS[l.hid];
  const flash = l.flash > 0 ? l.flash : 0;
  const sq = l.lit && flash > 0 ? 1 + Math.sin(flash * 20) * 0.15 * flash : 1;
  const flick = l.lit && Math.sin(w.time * 13 + l.hid * 3) > 0.6;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(1 / sq, sq);
  if (l.lit || l.known) {
    drawPumpkin(g, -8, -14, { carved: true, lit: l.lit, face: h.face, flicker: flick });
  } else if (IMG.pumpkin) g.drawImage(IMG.pumpkin, -9, -17);
  else drawPumpkin(g, -8, -14, {});
  g.restore();
}

function drawChar(g, w, e, x, y, isPlayer) {
  const im = SPR.night[e.costume];
  if (!im) return;
  const bob = e.moving ? Math.abs(Math.sin(e.walkT)) * 2 : 0;
  const tilt = e.moving ? Math.sin(e.walkT) * 0.08 : 0;
  const hop = e.hop > 0 ? Math.sin(e.hop * Math.PI) * 8 : 0;
  const fl = isPlayer && (w.player.floatT > 0 || w.player.floatExtra > 0) ? 10 + Math.sin(w.time * 5) * 2 : 0;
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(Math.round(x), Math.round(y), fl ? 6 : 8, fl ? 2 : 3, 0, 0, 7); g.fill();
  g.save();
  g.translate(Math.round(x), Math.round(y - bob - hop - fl));
  g.rotate(tilt);
  g.scale(e.facing || 1, 1);
  if (e.frozen > 0) g.globalAlpha = 0.85;
  if (w.target && w.target.obj === e && Math.sin(w.time * 8) > -0.3) { const o = SPR.outline[e.costume]; g.drawImage(o, -o.width / 2, -o.height + 1); }
  g.drawImage(im, -im.width / 2, -im.height);
  g.restore();
  if (e.frozen > 0) { g.fillStyle = 'rgba(180,220,255,0.5)'; g.fillRect(Math.round(x - 6), Math.round(y - 44), 12, 2); }
  if (e.prankster) { g.fillStyle = `rgba(196,140,255,${0.4 + Math.sin(w.time * 6) * 0.2})`; g.fillRect(Math.round(x - 9), Math.round(y - 1), 18, 2); }
}

// ---------- overlays drawn at backing resolution (same logical units) ----------
export function drawOverlays(g, w, LW, LH, cam, ui) {
  const ox = Math.round(cam.x), oy = Math.round(cam.y), town = w.town, p = w.player;
  const fog = !!w.night.fog;
  const onScreen = (x, y, m = 40) => x > ox - m && x < ox + LW + m && y > oy - m && y < oy + LH + m;
  // house signs, ribbons, refill rings
  for (const l of town.candyHouses) {
    const px = l.pumpkin.x * TILE - ox, py = l.pumpkin.y * TILE - oy;
    if (!onScreen(px + ox, py + oy)) continue;
    const h = HOUSEHOLDS[l.hid], fav = COSTUME[h.fav];
    const clue = w.save.clues[l.hid];
    // sign post to the right of the pumpkin
    const sx = Math.round(px + 9), sy = Math.round(py - 22);
    g.fillStyle = '#4a3424'; g.fillRect(sx + 6, sy + 12, 2, 10);
    g.fillStyle = '#140f24'; g.fillRect(sx - 1, sy - 1, 15, 15);
    g.fillStyle = '#c9a77a'; g.fillRect(sx, sy, 13, 13);
    drawKindIcon(g, fav.kind, sx + 1, sy + 1, 1);
    if (clue && clue.dis) {
      const dl = [h.dislike, ...(l.picky ? [h.dislike2] : [])];
      dl.forEach((k, i) => {
        const dx = sx + 15 + i * 9, dy = sy + 1;
        g.fillStyle = '#140f24'; g.fillRect(dx - 1, dy - 1, 9, 9); g.fillStyle = '#5a4060'; g.fillRect(dx, dy, 7, 7);
        g.save(); g.translate(dx, dy); g.scale(7 / 11, 7 / 11); drawKindIcon(g, k, 0, 0, 1); g.restore();
        g.strokeStyle = '#ff5050'; g.lineWidth = 1; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + 7, dy + 7); g.stroke();
      });
    }
    // ribbon: exact color, or candidate dots
    const exact = clueExact(w, l.hid) || l.lit;
    const pop = l.flash > 0 && !l.lit ? 1 + l.flash * 0.6 : 1;
    const rx = sx + 6.5, ry = sy - 9;   // centered above the sign
    g.save(); g.translate(rx, ry); g.scale(pop, pop);
    if (exact) {
      g.fillStyle = '#140f24'; g.fillRect(-9, -4, 18, 8);
      g.fillStyle = COLOR_HEX[fav.color]; g.fillRect(-8, -3, 16, 6);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-8, -3, 16, 1);
    } else if (clue && clue.dots) {
      g.fillStyle = '#140f24'; g.fillRect(-13, -4, 26, 8);
      h.candidates.forEach((c, i) => {
        const cx = -12 + i * 8, cy = -3;
        g.fillStyle = clue.crossed.includes(c) ? '#3a3248' : COLOR_HEX[c]; g.fillRect(cx, cy, 6, 6);
        if (clue.crossed.includes(c)) { g.fillStyle = '#ff5050'; g.fillRect(cx, cy + 2, 6, 2); }
      });
    }
    g.restore();
    if (l.refill > 0 && !(l.lit && false)) {
      const f = l.refill / 25;
      g.strokeStyle = 'rgba(242,234,216,0.7)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(Math.round(px), Math.round(py - 7), 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.stroke();
    }
  }
  // door target bracket
  if (w.target && w.target.type !== 'kid') {
    const l = w.target.obj, x = l.door.x * TILE - ox, y = l.door.y * TILE - oy - 6;
    const a = 0.6 + Math.sin(w.time * 8) * 0.4;
    g.strokeStyle = `rgba(255,210,94,${a})`; g.lineWidth = 1.5;
    g.strokeRect(Math.round(x - 9), Math.round(y - 14), 18, 18);
  }
  // kid badges, "!" bubbles and nameplates
  const want = wantedCostumes(w);
  const badgeR = (fog ? 6 : 10) * TILE;
  for (const k of w.kids) {
    if (!onScreen(k.x, k.y)) continue;
    const d = dist(p, k);
    const x = Math.round(k.x - ox), y = Math.round(k.y - oy - 50 - (k.hop > 0 ? Math.sin(k.hop * Math.PI) * 8 : 0));
    const c = COSTUME[k.costume];
    if (d < badgeR) {
      g.fillStyle = '#140f24'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
      g.fillStyle = COLOR_HEX[c.color]; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
      g.fillStyle = 'rgba(20,15,36,0.55)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      drawKindIcon(g, c.kind, x - 5.5, y - 5.5, 1);
    }
    if (want.has(k.costume) && !k.prankster) {
      const by = y - 16 + Math.sin(w.time * 6) * 1.5;
      g.fillStyle = '#140f24'; g.fillRect(x - 5, by - 7, 10, 13);
      g.fillStyle = '#ffd25e'; g.fillRect(x - 4, by - 6, 8, 11);
      g.fillStyle = '#140f24'; g.fillRect(x - 1, by - 4, 2, 5); g.fillRect(x - 1, by + 2, 2, 2);
    }
    if (w.target && w.target.obj === k && !k.prankster) {
      const price = kidPrice(w, k);
      const ty = Math.round(k.y - oy + 12);
      const label = `${c.name} · ${price} candy`;
      const tw = ui.measure(label, 7) + 8;
      g.fillStyle = 'rgba(20,15,36,0.85)'; g.fillRect(Math.round(x - tw / 2), ty - 7, Math.round(tw), 10);
      ui.text(label, x, ty + 1, 7, '#f2ead8', 'center', false);
    }
  }
  // pop-ups
  for (const q of w.popups) {
    const f = q.t / q.life;
    const y = q.y - oy - f * 18;
    g.globalAlpha = f > 0.75 ? (1 - f) * 4 : 1;
    ui.text(q.text, q.x - ox, y, q.big ? 11 : 8, q.color, 'center', true);
    g.globalAlpha = 1;
  }
  // tutorial / finale arrow
  const arrow = (w.tut && w.tut.arrow) || finalePointer(w);
  if (arrow) drawArrow(g, w, arrow.x - ox, arrow.y - oy, LW, LH);
}

function drawArrow(g, w, x, y, LW, LH) {
  const m = 24;
  const inside = x > m && x < LW - m && y > m && y < LH - m;
  const bob = Math.sin(w.time * 6) * 3;
  g.fillStyle = '#ffd25e'; g.strokeStyle = '#140f24'; g.lineWidth = 1;
  if (inside) {
    const ty = y - 40 + bob;
    g.beginPath(); g.moveTo(x - 6, ty - 8); g.lineTo(x + 6, ty - 8); g.lineTo(x, ty); g.closePath(); g.fill(); g.stroke();
    g.fillRect(x - 2, ty - 16, 4, 8); g.strokeRect(x - 2, ty - 16, 4, 8);
  } else {
    const cx = LW / 2, cy = LH / 2, a = Math.atan2(y - cy, x - cx);
    const ex = Math.max(m, Math.min(LW - m, cx + Math.cos(a) * LW)), ey = Math.max(m, Math.min(LH - m, cy + Math.sin(a) * LH));
    g.save(); g.translate(ex, ey); g.rotate(a);
    g.beginPath(); g.moveTo(10 + bob, 0); g.lineTo(-4 + bob, -8); g.lineTo(-4 + bob, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}

// ---------- the map ----------
export function drawMap(g, w, LW, LH, ui) {
  const town = w.town;
  const pad = 14;
  const k = Math.min((LW - pad * 2) / town.W, (LH - pad * 2 - 22) / town.H);
  const ox = Math.round((LW - town.W * k) / 2), oy = Math.round((LH - town.H * k) / 2) + 8;
  g.fillStyle = 'rgba(14,11,28,0.94)'; g.fillRect(0, 0, LW, LH);
  if (!w.mapC || w.mapK !== k) {
    w.mapK = k;
    const c = canvas(Math.ceil(town.W * k), Math.ceil(town.H * k)), mg = c.getContext('2d');
    const col = { [T.ROAD]: '#4a4560', [T.WALK]: '#6b6680', [T.PATH]: '#6b5a44', [T.HEDGE]: '#1d3a26', [T.HOUSE]: '#2a2240', [T.TREE]: '#1d3a26', [T.PLAZA]: '#7a6a8a', [T.FENCE]: '#3a4a3a', [T.YARD]: '#2a4a32', [T.FOREST]: '#122417', [T.GRASS]: '#24402f' };
    for (let ty = 0; ty < town.H; ty++) for (let tx = 0; tx < town.W; tx++) { mg.fillStyle = col[town.get(tx, ty)] || '#24402f'; mg.fillRect(Math.floor(tx * k), Math.floor(ty * k), Math.ceil(k), Math.ceil(k)); }
    for (const l of town.houses) { mg.fillStyle = l.candy ? '#5a4a70' : '#3a3050'; mg.fillRect(Math.floor((l.x + 0.4) * k), Math.floor((l.y + 1) * k), Math.ceil(4.2 * k), Math.ceil(4 * k)); }
    w.mapC = c;
  }
  g.drawImage(w.mapC, ox, oy);
  // home
  const hm = town.home;
  g.fillStyle = '#ffd25e'; g.fillRect(ox + (hm.x + 1) * k, oy + (hm.y + 1.5) * k, 3 * k, 3 * k);
  ui.text('HOME', ox + (hm.x + 2.5) * k, oy + (hm.y + 0.6) * k, 6, '#ffd25e', 'center', true);
  // candy houses
  const ic = Math.max(5, Math.min(9, k * 2.4));
  for (const l of town.candyHouses) {
    const h = HOUSEHOLDS[l.hid], fav = COSTUME[h.fav];
    const x = ox + (l.x + 2.5) * k, y = oy + (l.y + 3) * k;
    g.fillStyle = '#140f24'; g.beginPath(); g.arc(x, y, ic / 2 + 1.5, 0, 7); g.fill();
    g.fillStyle = l.lit ? '#ffd25e' : (l.known ? '#b0601a' : '#f08a24'); g.beginPath(); g.arc(x, y, ic / 2, 0, 7); g.fill();
    if (l.lit) { g.fillStyle = 'rgba(255,210,94,0.25)'; g.beginPath(); g.arc(x, y, ic, 0, 7); g.fill(); }
    if (!l.lit) {
      g.save(); g.translate(x - ic / 2 + 0.5, y - ic / 2 + 0.5); g.scale((ic - 1) / 11, (ic - 1) / 11); drawKindIcon(g, fav.kind, 0, 0, 1); g.restore();
      const cl = w.save.clues[l.hid];
      if (clueExact(w, l.hid)) { g.fillStyle = '#140f24'; g.fillRect(x + ic / 2 - 1, y - ic / 2 - 3, 5, 5); g.fillStyle = COLOR_HEX[fav.color]; g.fillRect(x + ic / 2, y - ic / 2 - 2, 3, 3); }
      else if (cl && cl.dots) h.candidates.forEach((c, i) => { if (!cl.crossed.includes(c)) { g.fillStyle = COLOR_HEX[c]; g.fillRect(x + ic / 2 + i * 2.5, y - ic / 2 - 2, 2, 2); } });
    }
  }
  // kids: last-seen (fading after 30s), live on the finale for needed costumes
  const want = wantedCostumes(w);
  for (const kd of w.kids) {
    let x, y, a;
    if (w.night.finale && want.has(kd.costume)) { x = kd.x; y = kd.y; a = 1; }
    else if (kd.inspected) { const age = w.time - kd.seenAt; if (age > 30) continue; x = kd.lastX; y = kd.lastY; a = Math.max(0.25, 1 - age / 30); }
    else continue;
    g.globalAlpha = a;
    g.fillStyle = '#140f24'; g.fillRect(ox + x / TILE * k - 2.5, oy + y / TILE * k - 2.5, 5, 5);
    g.fillStyle = COLOR_HEX[COSTUME[kd.costume].color]; g.fillRect(ox + x / TILE * k - 1.5, oy + y / TILE * k - 1.5, 3, 3);
    if (want.has(kd.costume)) { g.fillStyle = '#ffd25e'; g.fillRect(ox + x / TILE * k - 0.5, oy + y / TILE * k - 7, 1, 3); }
    g.globalAlpha = 1;
  }
  // player
  const blink = Math.sin(w.time * 8) > 0;
  const px = ox + w.player.x / TILE * k, py = oy + w.player.y / TILE * k;
  g.fillStyle = blink ? '#ffffff' : '#5fb3b3'; g.beginPath(); g.arc(px, py, 3.5, 0, 7); g.fill();
  g.strokeStyle = '#140f24'; g.lineWidth = 1; g.stroke();
  ui.text(`${w.night.name}: ${w.lit}/${w.need} jacks · ${w.candy} candy`, LW / 2, 12, 9, '#ffd25e', 'center', true);
  ui.text('Kind icon = what they love · colored dots = color clues · yellow = lit', LW / 2, LH - 6, 7, '#b0a8c8', 'center', true);
}

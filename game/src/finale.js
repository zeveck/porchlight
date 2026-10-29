// The Big Night finale: every kid marches into the plaza, forms 5 rows by kind and dances to the beat.
import { COSTUMES, KINDS, COLORS, FINALE } from './data.js';
import { SPR } from './render.js';
import { drawCandy, drawPumpkin, canvas, drawPile } from './art.js';
import { TILE } from './town.js';
import { ui } from './ui.js';

const MOVES = ['Lean', 'Shuffle', 'Spin', 'Claw', 'Freeze!'];

export function createFinale(w, clockNow) {
  const kids = [];
  KINDS.forEach((k, r) => COLORS.forEach((c, i) => kids.push({ costume: `${k}-${c}`, row: r, col: i, sx: Math.random(), sy: Math.random() })));
  return { w, kids, start: clockNow + 0.15, hits: 0, boo: 0, booText: 0, candy: [], pile: 0, done: false, lastBeatHit: -1, spot: Math.random() * 6 };
}

export function updateFinale(f, now, dt, act, skip) {
  const beat = 60 / FINALE.bpm;
  const t = now - f.start - FINALE.offset;
  const b = t / beat;
  f.b = b;
  if (skip) { f.done = true; return; }
  if (act && b > 16 && b < 96) {
    const nearest = Math.round(b);
    if (Math.abs(b - nearest) * beat <= 0.12 && nearest !== f.lastBeatHit) { f.lastBeatHit = nearest; f.hits++; f.boo = 1; f.booText = 1; f.hitSound = true; }
    else f.missSound = true;
  }
  if (f.boo > 0) f.boo -= dt * 2.5;
  if (f.booText > 0) f.booText -= dt;
  // candy rain from bar 24
  if (b > 96 && b < 112) for (let i = 0; i < 4; i++) f.candy.push({ x: Math.random(), y: -0.1, vy: 0.3 + Math.random() * 0.4, c: Math.floor(Math.random() * 6), land: 0.82 + Math.random() * 0.08 });
  for (const c of f.candy) { if (c.y < c.land) c.y += c.vy * dt; else if (!c.landed) { c.landed = true; f.pile = Math.min(1, f.pile + 0.004); } }
  if (b >= 116) f.done = true;
}

export function drawFinale(g, f, LW, LH, w, staticC) {
  const b = f.b || 0;
  // backdrop: the plaza, all porches lit
  const p = w.town.plaza;
  const cx = (p.x + p.w / 2) * TILE, cy = (p.y + 3.5) * TILE;
  g.fillStyle = '#0e0b1c'; g.fillRect(0, 0, LW, LH);
  g.drawImage(staticC, Math.round(LW / 2 - cx), Math.round(LH / 2 - cy));
  g.fillStyle = 'rgba(14,10,34,0.55)'; g.fillRect(0, 0, LW, LH);
  // sweeping colored spotlights on the beat
  g.globalCompositeOperation = 'lighter';
  const cols = ['rgba(240,138,36,0.16)', 'rgba(165,100,224,0.16)', 'rgba(95,179,179,0.14)'];
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(b * Math.PI / 8 + i * 2.1 + f.spot) * 0.6;
    const x0 = LW * (0.2 + i * 0.3);
    g.fillStyle = cols[i];
    g.beginPath(); g.moveTo(x0, -10); g.lineTo(x0 + Math.tan(a) * LH - 60, LH); g.lineTo(x0 + Math.tan(a) * LH + 60, LH); g.closePath(); g.fill();
  }
  if (b > 16 && b < 96) { const pulse = Math.max(0, 1 - (b % 1) * 4); g.fillStyle = `rgba(255,210,94,${pulse * 0.06})`; g.fillRect(0, 0, LW, LH); }
  g.globalCompositeOperation = 'source-over';
  // a garland of glowing jacks strung across the back
  g.strokeStyle = '#140f24'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 24; i++) { const x = LW * i / 24, y = LH * 0.2 - 15 + Math.sin(i / 24 * Math.PI * 6) * -3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 12; i++) drawPumpkin(g, LW * (i + 0.5) / 12 - 8, LH * 0.2 - 14, { carved: true, lit: true, face: { eyes: i % 5, mouth: i % 10 }, flicker: Math.sin(b * 3 + i) > 0.7 });

  // dancers
  const spread = Math.min(LW - 30, 10 * 30);
  const colW = spread / 10;
  const top = LH * 0.36, rowH = Math.min(26, (LH * 0.5) / 5);
  const moveIdx = Math.floor((b - 16) / 16);
  const list = [];
  for (const k of f.kids) {
    const tx = LW / 2 - spread / 2 + colW * (k.col + 0.5) + (k.row % 2 ? colW * 0.25 : -colW * 0.25);
    const ty = top + k.row * rowH;
    let x = tx, y = ty, sx = 1, sy = 1, rot = 0, flip = 1;
    if (b < 16) { // march in from the sides
      const m = Math.min(1, Math.max(0, (b - k.row * 0.6) / 12));
      const fromX = k.col < 5 ? -30 - k.sx * 60 : LW + 30 + k.sx * 60;
      x = fromX + (tx - fromX) * easeOut(m); y = ty + (1 - m) * (k.sy - 0.5) * 40;
      sy = 1 + Math.abs(Math.sin(b * Math.PI)) * 0.05 * (1 - m); y -= Math.abs(Math.sin(b * Math.PI)) * 3 * (m < 1 ? 1 : 0);
      flip = k.col < 5 ? 1 : -1; if (m >= 1) flip = 1;
    } else if (b < 96) {
      const lb = (b - 16) - moveIdx * 16 - k.row * 0.5; // ripple: rows a half-beat apart
      const fr = ((lb % 1) + 1) % 1;
      const mv = Math.min(4, moveIdx);
      if (lb >= 0) {
        if (mv === 0) { x += Math.sin(lb * Math.PI) * 4; rot = Math.sin(lb * Math.PI) * 0.16; }
        else if (mv === 1) { x += (Math.floor(lb) % 2 ? 3 : -3); sy = 1 - 0.16 * Math.exp(-fr * 6); sx = 1 + 0.1 * Math.exp(-fr * 6); y -= (1 - Math.exp(-fr * 6)) * 2; }
        else if (mv === 2) { flip = Math.floor(lb * 2) % 2 ? 1 : -1; y -= Math.abs(Math.sin(lb * Math.PI)) * 3; }
        else if (mv === 3) { sy = 1 + 0.22 * Math.exp(-fr * 5); sx = 1 - 0.08 * Math.exp(-fr * 5); y -= 4 * Math.exp(-fr * 5); rot = (Math.floor(lb) % 2 ? 0.12 : -0.12); }
        else { const beatIn = Math.floor(lb) % 4; if (beatIn === 3) y -= Math.sin(fr * Math.PI) * 9; else rot = (k.col % 2 ? 0.1 : -0.1); }
      }
    } else { y -= Math.abs(Math.sin(b * Math.PI)) * 4; }
    if (f.boo > 0) { sx *= 1 + f.boo * 0.25; sy *= 1 + f.boo * 0.25; }
    list.push({ x, y, sx, sy, rot, flip, costume: k.costume });
  }
  // the player in front, center
  const pc = w.player.costume;
  list.push({ x: LW / 2, y: top + 5 * rowH + 10, sx: 1.2 * (f.boo > 0 ? 1 + f.boo * 0.25 : 1), sy: 1.2 * (f.boo > 0 ? 1 + f.boo * 0.25 : 1) * (b > 16 && b < 96 ? 1 + 0.1 * Math.exp(-(((b % 1) + 1) % 1) * 6) : 1), rot: b > 16 && b < 96 ? Math.sin(b * Math.PI) * 0.12 : 0, flip: 1, costume: pc, me: true });
  list.sort((a, c) => a.y - c.y);
  for (const d of list) {
    const im = SPR.day[d.costume]; if (!im) continue;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(d.x, d.y + 1, 8 * d.sx, 2.5, 0, 0, 7); g.fill();
    g.save(); g.translate(Math.round(d.x), Math.round(d.y)); g.rotate(d.rot); g.scale(d.sx * d.flip, d.sy);
    g.drawImage(im, -im.width / 2, -im.height);
    g.restore();
    if (d.me) { g.fillStyle = '#ffd25e'; g.beginPath(); g.moveTo(d.x - 4, d.y - 56); g.lineTo(d.x + 4, d.y - 56); g.lineTo(d.x, d.y - 51); g.fill(); }
  }
  // candy rain and the pile
  for (const c of f.candy) drawCandy(g, c.x * LW, c.y * LH, c.c);
  if (f.pile > 0) drawPile(g, LW / 2, LH - 6, LW * 0.6, LH * 0.22, f.pile);
}

export function drawFinaleUi(f, LW, LH, S) {
  const b = f.b || 0;
  if (b < 16) ui.text('Everybody, to the plaza!', LW / 2, S.t + 22, 12, '#ffd25e', 'center');
  else if (b < 96) {
    const mv = Math.min(4, Math.floor((b - 16) / 16));
    ui.text(MOVES[mv], LW / 2, S.t + 22, 12, '#ffd25e', 'center');
    ui.text('Press A / Space on the beat: BOO!', LW / 2, S.t + 36, 8, '#f2ead8', 'center');
    ui.text(`BOO hits: ${f.hits}`, LW - S.r - 8, S.t + 18, 8, '#9fe0a0', 'right');
  } else ui.text('Share the haul!', LW / 2, S.t + 22, 12, '#ffd25e', 'center');
  if (f.booText > 0) ui.text('BOO!', LW / 2, LH * 0.3, 18 + f.booText * 8, `rgba(242,234,216,${f.booText})`, 'center');
  return ui.button('fin-skip', 'Skip (Esc)', LW - S.r - 76, LH - S.b - 26, 70, 18, { noPulse: true });
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

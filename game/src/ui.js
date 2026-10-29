// Immediate-mode UI: text, panels, buttons with keyboard focus, and the HUD.
import { input } from './input.js';
import { drawKindIcon, drawPowerIcon, drawCandy, drawPumpkin, drawWrappedCandy } from './art.js';
import { COSTUME, POWERS, KIND_NAMES, COLOR_HEX } from './data.js';

export const ui = {
  g: null, LW: 0, LH: 0, toLogical: null, safe: { l: 0, r: 0, t: 0, b: 0 },
  buttons: [], prevButtons: [], focus: null, keyNav: true, time: 0, consumedTap: false,

  begin(g, LW, LH, toLogical, safe, dt) {
    this.g = g; this.LW = LW; this.LH = LH; this.toLogical = toLogical; this.safe = safe; this.time += dt;
    this.prevButtons = this.buttons; this.buttons = [];
    this.taps = input.pointerTaps.map(t => toLogical(t.x, t.y));
    this.consumedTap = false;
    // keyboard navigation over last frame's buttons
    if (this.keyNav && this.prevButtons.length) {
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      let cur = this.prevButtons.find(b => b.id === this.focus);
      if (!cur) { cur = this.prevButtons.find(b => b.def) || this.prevButtons[0]; this.focus = cur.id; }
      for (const [k, [dx, dy]] of Object.entries(dirs)) {
        if (!input.consume(k)) continue;
        let best = null, bestS = 1e9;
        for (const b of this.prevButtons) {
          if (b === cur) continue;
          const vx = (b.x + b.w / 2) - (cur.x + cur.w / 2), vy = (b.y + b.h / 2) - (cur.y + cur.h / 2);
          const along = vx * dx + vy * dy; if (along <= 2) continue;
          const across = Math.abs(vx * dy - vy * dx);
          const s = along + across * 2.5;
          if (s < bestS) { bestS = s; best = b; }
        }
        if (best) { this.focus = best.id; this.navSound = true; }
      }
    }
  },

  font(size) { return `${size}px Pixelify, monospace`; },
  text(str, x, y, size = 8, color = '#f2ead8', align = 'left', shadow = true, maxW) {
    const g = this.g;
    g.font = this.font(size);
    g.textAlign = align; g.textBaseline = 'alphabetic';
    if (shadow) { g.fillStyle = '#140f24'; for (const [dx, dy] of [[1, 1], [-0.6, 0.6], [0.6, -0.6], [0, 1]]) g.fillText(str, x + dx * size / 10, y + dy * size / 10, maxW); }
    g.fillStyle = color; g.fillText(str, x, y, maxW);
  },
  measure(str, size) { this.g.font = this.font(size); return this.g.measureText(str).width; },
  wrap(str, maxW, size) {
    const words = str.split(' '); const lines = []; let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (this.measure(t, size) > maxW && line) { lines.push(line); line = wd; } else line = t; }
    if (line) lines.push(line);
    return lines;
  },
  panel(x, y, w, h, fill = 'rgba(27,21,51,0.94)', border = '#5a4a80') {
    const g = this.g;
    g.fillStyle = '#140f24'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = fill; g.fillRect(x, y, w, h);
    g.fillStyle = border; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
    g.fillStyle = 'rgba(255,210,94,0.6)'; g.fillRect(x + 1, y + 1, 2, 2); g.fillRect(x + w - 3, y + 1, 2, 2); g.fillRect(x + 1, y + h - 3, 2, 2); g.fillRect(x + w - 3, y + h - 3, 2, 2);
  },
  hit(x, y, w, h) {
    for (let i = 0; i < this.taps.length; i++) { const t = this.taps[i]; if (t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h) { this.taps.splice(i, 1); this.consumedTap = true; return true; } }
    return false;
  },
  // A button. Returns true when clicked (tap, or act while focused).
  button(id, label, x, y, w, h, opts = {}) {
    const g = this.g;
    const b = { id, x, y, w, h, def: opts.def };
    if (!opts.noNav) this.buttons.push(b);
    const focused = this.keyNav && !opts.noNav && this.focus === id;
    const dis = opts.disabled;
    g.fillStyle = '#140f24'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = dis ? '#2a2438' : (focused ? '#f08a24' : (opts.accent ? '#6a3a8a' : '#3b2a5c')); g.fillRect(x, y, w, h);
    g.fillStyle = dis ? '#2a2438' : (focused ? '#ffb24a' : (opts.accent ? '#8a52b0' : '#53407c')); g.fillRect(x, y, w, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + h - 2, w, 2);
    if (opts.draw) opts.draw(x, y, w, h, focused);
    if (label) this.text(label, x + w / 2, y + h / 2 + (opts.size || 9) * 0.36, opts.size || 9, dis ? '#7a7090' : (focused ? '#140f24' : '#f2ead8'), 'center', !focused);
    if (focused && !opts.noPulse) { g.strokeStyle = `rgba(255,242,160,${0.5 + Math.sin(this.time * 6) * 0.3})`; g.lineWidth = 1; g.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5); }
    if (dis) return false;
    if (this.hit(x - 2, y - 2, w + 4, h + 4)) { this.focus = id; return true; }
    if (focused && this.keyNav && input.was('act')) { input.consume('act'); return true; }
    return false;
  },
  costumeSprite(SPR, cid, x, y, scale = 1, dim = false) {
    const im = SPR.day[cid]; if (!im) return;
    const g = this.g;
    g.save(); g.translate(x, y); g.scale(scale, scale);
    if (dim) { g.globalAlpha = 0.9; g.filter = 'brightness(0) opacity(0.5)'; }
    g.drawImage(im, -im.width / 2, -im.height);
    g.restore();
  },
};

// ---------- HUD ----------
export function drawHud(w, SPR, touch, audioOn) {
  const g = ui.g, LW = ui.LW, LH = ui.LH, S = ui.safe;
  const x0 = 6 + S.l, y0 = 6 + S.t;
  // candy + jacks
  ui.panel(x0, y0, 92, 34);
  drawWrappedCandy(g, x0 + 5, y0 + 4);
  ui.text(String(w.candy), x0 + 20, y0 + 14, 11, '#ffd25e');
  drawPumpkin(g, x0 + 4, y0 + 18, { carved: true, lit: true, face: { eyes: 0, mouth: 0 }, scale: 0.9 });
  ui.text(`${w.lit}/${w.need}`, x0 + 20, y0 + 30, 11, w.reached ? '#9fe0a0' : '#f2ead8');
  if (w.hudBump > 0) w.hudBump -= 1 / 60;
  // buttons top-right
  const bs = 24, bx = LW - 6 - S.r - bs, by = 6 + S.t;
  const actions = {};
  actions.sound = ui.button('hud-sound', '', bx, by, bs, bs, { noPulse: true, noNav: true, draw: (x, y) => drawSpeaker(g, x + 5, y + 6, audioOn) });
  actions.pause = ui.button('hud-pause', '', bx - bs - 6, by, bs, bs, { noPulse: true, noNav: true, draw: (x, y) => { g.fillStyle = '#f2ead8'; g.fillRect(x + 8, y + 6, 3, 12); g.fillRect(x + 14, y + 6, 3, 12); } });
  actions.map = ui.button('hud-map', '', bx - (bs + 6) * 2, by, bs, bs, { noPulse: true, noNav: true, draw: (x, y) => { g.fillStyle = '#c9a77a'; g.fillRect(x + 5, y + 6, 14, 12); g.fillStyle = '#7a5a3a'; g.fillRect(x + 9, y + 6, 1, 12); g.fillRect(x + 14, y + 6, 1, 12); g.fillStyle = '#e8423f'; g.fillRect(x + 11, y + 10, 2, 2); } });
  if (w.reached && !w.night.finale) {
    const fw = 92;
    actions.finish = ui.button('hud-finish', 'Finish night', Math.round(LW / 2 - fw / 2), y0, fw, 20, { accent: true, size: 9, noPulse: true, noNav: true });
  }
  // costume card
  const c = COSTUME[w.player.costume], pw = POWERS[c.power];
  const cw = 118, ch = 46;
  const cx = touch ? x0 : 6 + S.l, cy = touch ? y0 + 40 : LH - 6 - S.b - ch;
  ui.panel(cx, cy, cw, ch);
  ui.costumeSprite(SPR, c.id, cx + 18, cy + ch - 3, 1);
  ui.text(c.name, cx + 36, cy + 12, 8, '#f2ead8', 'left', true, cw - 40);
  g.fillStyle = '#140f24'; g.fillRect(cx + 35, cy + 16, 9, 9); g.fillStyle = COLOR_HEX[c.color]; g.fillRect(cx + 36, cy + 17, 7, 7);
  g.save(); g.translate(cx + 47, cy + 15); g.scale(10 / 11, 10 / 11); drawKindIcon(g, c.kind, 0, 0, 1); g.restore();
  ui.text(KIND_NAMES[c.kind], cx + 60, cy + 24, 7, '#b0a8c8');
  drawPowerIcon(g, c.power, cx + 36, cy + 30, 1);
  const p = w.player;
  const ready = p.cd <= 0;
  ui.text(pw.name + (touch ? '' : ' (Shift)'), cx + 50, cy + 39, 7, ready ? '#ffd25e' : '#7a7090');
  if (!ready) { g.fillStyle = '#2a2438'; g.fillRect(cx + 36, cy + 42, cw - 42, 2); g.fillStyle = '#ffd25e'; g.fillRect(cx + 36, cy + 42, (cw - 42) * (1 - p.cd / p.cdMax), 2); }
  if (p.charmNext) ui.text('♥ half price', cx + cw - 4, cy + 12, 6, '#ff9ad0', 'right');
  // tutorial prompt
  if (w.tut && w.tut.text) {
    const land = LW > LH;
    const pwid = touch ? (land ? Math.min(250, LW - 200) : LW - 16) : Math.min(310, LW - 30);
    const msg = touch ? w.tut.text.replace('press A', 'tap A').replace('The map (Tab)', 'The map button (top right)') : w.tut.text.replace('press A', 'press Space');
    const lines = ui.wrap(msg, pwid - 12, 9);
    const ph = lines.length * 12 + 10;
    const px = Math.round(LW / 2 - pwid / 2), py = touch ? LH - S.b - ph - (land ? 6 : 88) : LH - S.b - ph - 60;
    ui.panel(px, py, pwid, ph, 'rgba(27,21,51,0.9)', '#f08a24');
    lines.forEach((ln, i) => ui.text(ln, LW / 2, py + 15 + i * 12, 9, '#ffd25e', 'center'));
  }
  return actions;
}

function drawSpeaker(g, x, y, on) {
  g.fillStyle = '#f2ead8';
  g.fillRect(x, y + 4, 4, 5); g.fillRect(x + 4, y + 2, 2, 9); g.fillRect(x + 6, y, 2, 13);
  if (on) { g.fillRect(x + 10, y + 3, 1, 7); g.fillRect(x + 12, y + 1, 1, 11); }
  else { g.fillStyle = '#ff6060'; for (let i = 0; i < 6; i++) { g.fillRect(x + 9 + i, y + 3 + i, 1, 1); g.fillRect(x + 14 - i, y + 3 + i, 1, 1); } }
}

// ---------- dialogs during play ----------
export function drawDialog(w, SPR, wardrobe) {
  const d = w.dialog; if (!d) return null;
  const LW = ui.LW, LH = ui.LH, S = ui.safe, g = ui.g;
  if (d.type === 'wardrobe') return drawWardrobe(w, SPR, wardrobe, 'Your closet: pick a costume', true);
  const pw = Math.min(330, LW - 20);
  const lines = ui.wrap(d.text, pw - 60, 9);
  const ph = 26 + lines.length * 12 + 26;
  const px = Math.round(LW / 2 - pw / 2), py = LH - S.b - ph - 10;
  ui.panel(px, py, pw, ph);
  if (d.type === 'swap') {
    ui.costumeSprite(SPR, d.kid.costume, px + 22, py + 50, 1);
    ui.text('?', px + 22, py + 12, 8, '#ffd25e', 'center');
  } else if (d.type === 'switch') ui.costumeSprite(SPR, d.costume, px + 22, py + 50, 1);
  lines.forEach((ln, i) => ui.text(ln, px + 44, py + 16 + i * 12, 9, '#f2ead8'));
  if (d.type === 'swap') ui.text(`You have ${w.candy} candy`, px + 44, py + 16 + lines.length * 12, 7, w.candy >= d.price ? '#9fe0a0' : '#ff8a7a');
  const by = py + ph - 24;
  let ans = null;
  if (d.options) {
    const tch = document.body.classList.contains('touch');
    if (ui.button('dlg-yes', tch ? 'Yes' : 'Yes (1)', px + 44, by, 70, 18, { def: true })) ans = true;
    if (ui.button('dlg-no', tch ? 'No' : 'No (2)', px + 122, by, 70, 18)) ans = false;
    if (input.consume('one')) ans = true;
    if (input.consume('two') || input.consume('back')) ans = false;
  } else {
    if (ui.button('dlg-ok', 'OK', px + pw / 2 - 35, by, 70, 18, { def: true })) ans = false;
    if (input.consume('back')) ans = false;
  }
  return ans;
}

// The wardrobe grid (home closet, and the costume pick before a night). Returns {wear: id} or {close:true} or {finish:true}.
export function drawWardrobe(w, SPR, wardrobe, title, inPlay) {
  const LW = ui.LW, LH = ui.LH, S = ui.safe, g = ui.g;
  const pw = Math.min(LW - 16, 420), ph = Math.min(LH - 16 - S.t - S.b, 250);
  const px = Math.round(LW / 2 - pw / 2), py = Math.round(S.t + (LH - S.t - S.b) / 2 - ph / 2);
  ui.panel(px, py, pw, ph);
  const narrow = pw < 300;
  ui.text(title, LW / 2, py + 14, narrow ? 8 : 9, '#ffd25e', 'center', true, pw - (narrow ? 12 : 90));
  const cell = 36, cols = Math.max(1, Math.floor((pw - 16) / cell));
  const rowsVis = Math.max(1, Math.floor((ph - 70) / 42));
  const list = wardrobe.slice().sort((a, b) => COSTUME[a].idx - COSTUME[b].idx);
  const focusIdx = list.findIndex(id => ui.focus === 'wr-' + id);
  const topRow = Math.max(0, Math.min(Math.floor(Math.max(0, focusIdx) / cols) - rowsVis + 1, Math.ceil(list.length / cols) - rowsVis));
  let res = null;
  const gx = px + Math.round((pw - cols * cell) / 2);
  list.forEach((id, i) => {
    const r = Math.floor(i / cols) - topRow, c = i % cols;
    if (r < 0 || r >= rowsVis) return;
    const x = gx + c * cell, y = py + 24 + r * 42;
    const worn = w && w.player && w.player.costume === id;
    if (ui.button('wr-' + id, '', x + 2, y, cell - 4, 40, { def: worn, noPulse: false, draw: (bx, by) => ui.costumeSprite(SPR, id, bx + (cell - 4) / 2, by + 39, 0.9) })) res = { wear: id };
  });
  const f = list.find(id => ui.focus === 'wr-' + id) || (w && w.player ? w.player.costume : list[0]);
  if (f) {
    const c = COSTUME[f], p = POWERS[c.power];
    ui.text(`${c.name} · ${KIND_NAMES[c.kind]} · ${c.color}`, px + 10, py + ph - 30, 8, '#f2ead8');
    drawPowerIcon(g, c.power, px + 10, py + ph - 24, 1);
    ui.text(`${p.name}: ${p.desc}`, px + 24, py + ph - 15, 7, '#ffd25e', 'left', true, pw - 120);
  }
  ui.text(`${list.length}/50 costumes`, px + pw - 10, narrow ? py + ph - 34 : py + 14, 7, '#b0a8c8', 'right');
  if (inPlay) {
    if (w.reached && !w.night.finale && ui.button('wr-finish', 'Finish night', px + pw - 92, py + ph - 26, 84, 18, { accent: true })) res = { finish: true };
    if (ui.button('wr-close', 'Close', px + pw - (w.reached && !w.night.finale ? 160 : 70), py + ph - 26, 60, 18)) res = { close: true };
    if (input.consume('back')) res = { close: true };
  }
  return res;
}

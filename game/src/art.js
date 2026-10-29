// Asset loading plus everything drawn in code: ground tiles, icons, jack faces, candy.
import { COLOR_HEX } from './data.js';

export const IMG = {};
export function loadImages(map) {
  return Promise.all(Object.entries(map).map(([k, url]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; res(); };
    im.onerror = () => { res(); };
    im.src = url;
  })));
}

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export const PAL = {
  night: '#1b1533', violet: '#3b2a5c', teal: '#5fb3b3', pumpkin: '#f08a24', candle: '#ffd25e',
  bone: '#f2ead8', road: '#2a2638', grass: '#2e5236', ink: '#140f24',
};

// ---- Ground tiles (16x16), seeded per tile index for variation ----
function noiseTile(base, specks, seed) {
  const c = canvas(16, 16), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 16, 16);
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (const [col, n] of specks) { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, rnd() < 0.3 ? 2 : 1); }
  return c;
}
export const TILES = {};
export function buildTiles() {
  TILES.grass = [0, 1, 2, 3].map(i => noiseTile('#2e5236', [['#386441', 14], ['#25452d', 10], ['#4a7a4c', 3]], i + 1));
  TILES.grassLeaf = [0, 1].map(i => { const c = noiseTile('#2e5236', [['#386441', 12], ['#25452d', 8]], i + 7), g = c.getContext('2d');
    g.fillStyle = i ? '#c8662a' : '#e0a030'; g.fillRect(5 + i * 4, 6, 2, 1); g.fillRect(6 + i * 4, 5, 1, 3); g.fillStyle = '#a8432a'; g.fillRect(11 - i * 6, 11, 2, 2); return c; });
  TILES.road = [0, 1].map(i => noiseTile('#2b2739', [['#332e44', 12], ['#24202f', 10]], i + 11));
  TILES.sidewalk = [0, 1].map(i => { const c = noiseTile('#6b6680', [['#76718c', 10], ['#5e5a72', 8]], i + 21), g = c.getContext('2d');
    g.fillStyle = '#4f4b63'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); return c; });
  TILES.path = [0].map(i => { const c = noiseTile('#8a7458', [['#9a8466', 10], ['#76644b', 10]], 31), g = c.getContext('2d');
    g.fillStyle = '#6a5842'; g.fillRect(0, 7, 16, 1); g.fillRect(7, 0, 1, 7); g.fillRect(3, 8, 1, 8); g.fillRect(11, 8, 1, 8); return c; });
  TILES.hedge = [0, 1].map(i => { const c = canvas(16, 16), g = c.getContext('2d');
    g.fillStyle = '#1d3a26'; g.fillRect(0, 2, 16, 14); g.fillStyle = '#2a5233'; for (let x = 0; x < 16; x += 4) { g.fillRect(x, 1, 4, 5); g.fillRect(x + 2, 6, 3, 4); }
    g.fillStyle = '#3d6e45'; for (let x = 1; x < 16; x += 4) g.fillRect(x + i, 2, 2, 1);
    g.fillStyle = '#122417'; g.fillRect(0, 14, 16, 2); return c; });
  TILES.plaza = [0, 1].map(i => { const c = noiseTile('#6e6280', [['#7a6e8c', 10], ['#5e5470', 10]], i + 41), g = c.getContext('2d');
    g.fillStyle = '#54496a'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(i ? 4 : 11, 0, 1, 7); g.fillRect(i ? 11 : 4, 8, 1, 7); return c; });
  TILES.fence = (() => { const c = canvas(16, 16), g = c.getContext('2d');
    g.fillStyle = '#2e5236'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#5a4a3a'; g.fillRect(0, 7, 16, 2); g.fillRect(0, 12, 16, 2);
    g.fillStyle = '#d9cfb8'; for (let x = 1; x < 16; x += 5) { g.fillRect(x, 3, 3, 12); g.fillRect(x + 1, 2, 1, 1); }
    g.fillStyle = '#a99f88'; for (let x = 1; x < 16; x += 5) g.fillRect(x + 2, 4, 1, 11);
    return c; })();
}

// ---- Kind icons (11x11) ----
export function drawKindIcon(g, kind, x, y, s = 1) {
  const P = (px, py, w = 1, h = 1) => g.fillRect(x + px * s, y + py * s, w * s, h * s);
  g.save();
  if (kind === 'spooky') { // little ghost
    g.fillStyle = '#f2ead8'; P(3, 1, 5, 1); P(2, 2, 7, 7); P(2, 9, 2, 1); P(5, 9, 2, 1); P(8, 9, 1, 1);
    g.fillStyle = '#140f24'; P(4, 4, 1, 2); P(7, 4, 1, 2); P(5, 7, 2, 1);
  } else if (kind === 'critter') { // paw
    g.fillStyle = '#f0a868'; P(3, 5, 5, 4); P(4, 9, 3, 1); P(1, 3, 2, 2); P(4, 1, 2, 2); P(7, 1, 2, 2); P(9, 3, 2, 2);
  } else if (kind === 'hero') { // star
    g.fillStyle = '#ffd25e'; P(5, 0, 1, 2); P(4, 2, 3, 2); P(0, 4, 11, 1); P(1, 5, 9, 1); P(2, 6, 7, 1); P(3, 7, 5, 1); P(2, 8, 3, 1); P(6, 8, 3, 1); P(1, 9, 2, 1); P(8, 9, 2, 1);
  } else if (kind === 'magic') { // wand
    g.fillStyle = '#c8a0ff'; P(7, 0, 1, 1); P(6, 1, 3, 1); P(5, 2, 5, 1); P(6, 3, 3, 1); P(7, 4, 1, 1);
    g.fillStyle = '#e8e0ff'; P(6, 5, 1, 1); P(5, 6, 1, 1); P(4, 7, 1, 1); P(3, 8, 1, 1); P(2, 9, 1, 1); P(1, 10, 1, 1);
  } else if (kind === 'snack') { // wrapped candy
    g.fillStyle = '#f27fc2'; P(3, 3, 5, 5); P(0, 2, 2, 1); P(0, 8, 2, 1); P(1, 3, 2, 5); P(9, 2, 2, 1); P(9, 8, 2, 1); P(8, 3, 2, 5);
    g.fillStyle = '#fff0f8'; P(4, 4, 2, 1);
  }
  g.restore();
}

// ---- Power icons (11x11) ----
export function drawPowerIcon(g, power, x, y, s = 1) {
  const P = (px, py, w = 1, h = 1) => g.fillRect(x + px * s, y + py * s, w * s, h * s);
  g.save();
  g.fillStyle = '#ffd25e';
  if (power === 'dash') { P(0, 3, 4, 1); P(1, 5, 5, 1); P(0, 7, 4, 1); P(6, 2, 2, 7); P(8, 3, 1, 5); P(9, 4, 1, 3); P(10, 5, 1, 1); }
  else if (power === 'float') { g.fillStyle = '#bfe8ff'; P(1, 3, 3, 1); P(0, 4, 5, 2); P(6, 3, 3, 1); P(6, 4, 5, 2); P(4, 5, 3, 3); g.fillStyle = '#7fb0d0'; P(2, 9, 7, 1); }
  else if (power === 'boo') { g.fillStyle = '#f2ead8'; P(3, 1, 5, 1); P(2, 2, 7, 7); P(2, 9, 2, 1); P(5, 9, 2, 1); P(8, 9, 1, 1); g.fillStyle = '#140f24'; P(4, 3, 1, 2); P(6, 3, 1, 2); P(4, 6, 3, 2); }
  else if (power === 'sniff') { g.fillStyle = '#f0a868'; P(2, 4, 7, 4); P(3, 3, 5, 1); g.fillStyle = '#140f24'; P(3, 6, 2, 1); P(6, 6, 2, 1); g.fillStyle = '#9fd8a0'; P(1, 0, 1, 2); P(5, 0, 1, 2); P(9, 0, 1, 2); }
  else if (power === 'charm') { g.fillStyle = '#ff6fa8'; P(1, 2, 3, 1); P(7, 2, 3, 1); P(0, 3, 11, 3); P(1, 6, 9, 1); P(2, 7, 7, 1); P(3, 8, 5, 1); P(4, 9, 3, 1); P(5, 10, 1, 1); g.fillStyle = '#ffd0e4'; P(2, 3, 1, 1); }
  else if (power === 'rush') { g.fillStyle = '#ff5fa0'; P(4, 0, 3, 1); P(3, 1, 5, 2); g.fillStyle = '#f2ead8'; P(3, 3, 5, 7); g.fillStyle = '#e8423f'; P(3, 5, 5, 1); P(3, 8, 5, 1); }
  g.restore();
}

export function colorHex(c) { return COLOR_HEX[c]; }

// ---- Jack-o'-lantern faces: 5 eye styles x 10 mouths, drawn onto a 16x14 pumpkin ----
export function drawPumpkin(g, x, y, opts = {}) {
  // opts: { carved, lit, face, flicker, scale }
  const s = opts.scale || 1;
  const P = (px, py, w = 1, h = 1) => g.fillRect(Math.round(x + px * s), Math.round(y + py * s), Math.ceil(w * s), Math.ceil(h * s));
  g.fillStyle = '#2a1408'; P(1, 3, 14, 10); P(2, 2, 12, 12); P(4, 1, 8, 14);
  g.fillStyle = opts.lit ? '#ff9a2a' : '#e07a1e'; P(2, 3, 12, 10); P(3, 2, 10, 12); P(5, 2, 6, 12);
  g.fillStyle = opts.lit ? '#ffb24a' : '#f0922e'; P(3, 3, 2, 8); P(7, 2, 2, 11); P(11, 3, 2, 8);
  g.fillStyle = opts.lit ? '#d86a14' : '#b85a12'; P(5, 3, 1, 10); P(10, 3, 1, 10); P(2, 12, 12, 1);
  g.fillStyle = '#3f6a22'; P(7, 0, 2, 3); g.fillStyle = '#5c8f30'; P(8, 0, 2, 1);
  if (!opts.carved) return;
  const f = opts.face || { eyes: 0, mouth: 0 };
  const litGlow = opts.flicker ? '#fff2a0' : '#ffe066';
  const passes = opts.lit ? [['#5a1e04', 0.6], [litGlow, 0]] : [['#3a1a06', 0]];
  for (const [glow, dy] of passes) {
  const P = (px, py, w = 1, h = 1) => g.fillRect(Math.round(x + px * s), Math.round(y + (py + dy) * s), Math.ceil(w * s), Math.ceil(h * s));
  g.fillStyle = glow;
  // eyes
  const eyes = [
    () => { P(4, 5, 3, 1); P(5, 4, 1, 1); P(9, 5, 3, 1); P(10, 4, 1, 1); P(4, 6, 3, 1); P(9, 6, 3, 1); },   // triangles
    () => { P(4, 4, 2, 3); P(10, 4, 2, 3); },                                                              // round
    () => { P(4, 5, 3, 1); P(3, 4, 1, 1); P(9, 5, 3, 1); P(12, 4, 1, 1); },                                // squint/angry
    () => { P(5, 4, 1, 3); P(4, 5, 3, 1); P(10, 4, 1, 3); P(9, 5, 3, 1); },                                // stars/crosses
    () => { P(4, 4, 3, 2); P(10, 5, 2, 1); },                                                              // wink
  ];
  eyes[f.eyes % 5]();
  const mouths = [
    () => { P(4, 9, 8, 1); P(5, 10, 6, 1); P(6, 9, 1, 1); },                    // grin
    () => { P(4, 9, 8, 2); if (dy) return; g.fillStyle = opts.lit ? '#ff9a2a' : '#e07a1e'; P(6, 9, 1, 1); P(9, 10, 1, 1); g.fillStyle = glow; }, // toothy
    () => { P(7, 8, 2, 3); },                                                    // O
    () => { P(3, 9, 10, 1); P(4, 10, 1, 1); P(11, 10, 1, 1); },                  // fangs
    () => { P(4, 10, 1, 1); P(5, 9, 1, 1); P(6, 10, 1, 1); P(7, 9, 1, 1); P(8, 10, 1, 1); P(9, 9, 1, 1); P(10, 10, 1, 1); P(11, 9, 1, 1); }, // zigzag
    () => { P(5, 9, 6, 1); P(4, 8, 1, 1); P(11, 8, 1, 1); },                    // smile
    () => { P(5, 10, 6, 1); P(4, 11, 1, 1); P(11, 11, 1, 1); },                 // frown
    () => { P(6, 9, 4, 2); P(5, 9, 1, 1); P(10, 9, 1, 1); },                    // ooh
    () => { P(4, 9, 3, 1); P(9, 9, 3, 1); P(7, 10, 2, 1); },                    // smirk
    () => { P(4, 9, 8, 1); P(5, 10, 1, 1); P(7, 10, 1, 1); P(9, 10, 1, 1); },   // stitched
  ];
  mouths[f.mouth % 10]();
  if (f.eyes === 0 || f.eyes === 3) P(7, 7, 2, 1); // nose
  }
}

// ---- Candy pieces for particles ----
export function drawWrappedCandy(g, x, y) {
  const P = (px, py, w = 1, h = 1) => g.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  g.fillStyle = '#140f24'; P(3, 1, 6, 8); P(0, 2, 3, 6); P(9, 2, 3, 6);
  g.fillStyle = '#e8423f'; P(4, 2, 4, 6); g.fillStyle = '#ff8a7a'; P(4, 2, 2, 2);
  g.fillStyle = '#ffd25e'; P(1, 3, 2, 1); P(1, 6, 2, 1); P(9, 3, 2, 1); P(9, 6, 2, 1); P(2, 4, 1, 2); P(9, 4, 1, 2);
}
export function drawCandy(g, x, y, kind) {
  const P = (px, py, w = 1, h = 1) => g.fillRect(Math.round(x + px), Math.round(y + py), w, h);
  const cols = ['#e8423f', '#4f8fe8', '#5cc25a', '#ffd25e', '#f27fc2', '#a564e0'];
  g.fillStyle = cols[kind % cols.length];
  if (kind % 3 === 0) { P(1, 1, 3, 3); P(0, 0, 1, 1); P(4, 4, 1, 1); P(0, 4, 1, 1); P(4, 0, 1, 1); }
  else if (kind % 3 === 1) { P(1, 0, 3, 5); P(0, 1, 5, 3); }
  else { P(0, 1, 5, 3); g.fillStyle = '#f2ead8'; P(1, 1, 1, 3); P(3, 1, 1, 3); }
}

export function drawColorDot(g, color, x, y, r = 3) {
  g.fillStyle = '#140f24'; g.beginPath(); g.arc(x, y, r + 1, 0, Math.PI * 2); g.fill();
  g.fillStyle = COLOR_HEX[color]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

// A heaped mound of candy: base centered at (cx, by), width w, height h; f = how full (0..1).
export function drawPile(g, cx, by, w, h, f = 1, n = 700) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const count = Math.floor(n * f);
  const hh = h * Math.sqrt(f);
  g.fillStyle = 'rgba(10,8,20,0.5)'; g.beginPath(); g.ellipse(cx, by + 2, w / 2 + 6, 6, 0, 0, 7); g.fill();
  g.fillStyle = '#3a2440'; g.beginPath(); g.moveTo(cx - w / 2 + 4, by);
  for (let i = 0; i <= 20; i++) { const u = i / 10 - 1; g.lineTo(cx + u * (w / 2 - 4), by - hh * 0.92 * (1 - u * u)); }
  g.closePath(); g.fill();
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, v = rnd();
    const top = hh * (1 - u * u);                    // parabolic mound
    const y = by - v * top;
    drawCandy(g, cx + u * w / 2 - 2, y - 2, Math.floor(rnd() * 6));
  }
}

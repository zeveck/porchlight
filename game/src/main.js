// Porchlight: boot, scaling, the loop, screens, sound and saving.
import { input, initInput, setTouchMode } from './input.js';
import { audio, initAudio, loadSounds, sfx, playMusic, stopMusic, applyVolumes, duckMusic, audioCtx, playAmbience, stopAmbience, hasBuffer } from './audio.js';
import { loadSave, writeSave, freshSave } from './save.js';
import { loadImages, IMG, buildTiles, canvas, drawKindIcon, drawPowerIcon, drawPumpkin, drawCandy, drawPile } from './art.js';
import { COSTUMES, COSTUME, HOUSEHOLDS, NIGHTS, POWERS, KIND_NAMES, KINDS, COLORS, COLOR_HEX, FINALE } from './data.js';
import { generateTownSafe, findPath, TILE } from './town.js';
import { createWorld, updateWorld, answerDialog, wearFromWardrobe, clueExact, wantedCostumes, kidPrice } from './world.js';
import { buildSpriteCaches, buildStatic, buildLights, drawWorld, drawOverlays, drawMap, SPR } from './render.js';
import { ui, drawHud, drawDialog, drawWardrobe } from './ui.js';
import { createFinale, updateFinale, drawFinale, drawFinaleUi } from './finale.js';

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

const G = {
  screen: 'loading', save: loadSave(), world: null, finale: null, night: 1, pick: null,
  audioStarted: false, howPage: 0, collTab: 'jacks', returnTo: 'title', fade: 0, timeScale: 1, finaleDelay: 0,
  error: null, complete: null,
};
let dpr = 1, s = 2, LW = 640, LH = 360, worldC = canvas(640, 360), safe = { l: 0, r: 0, t: 0, b: 0 };

// ---------- scaling ----------
function resize() {
  dpr = window.devicePixelRatio || 1;
  const cw = window.innerWidth, ch = window.innerHeight;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const short = Math.min(cw, ch);
  const target = short < 500 ? 230 : 330;
  s = Math.max(1, Math.round(Math.min(cv.width, cv.height) / target));
  LW = Math.ceil(cv.width / s); LH = Math.ceil(cv.height / s);
  if (worldC.width !== LW || worldC.height !== LH) { worldC = canvas(LW, LH); }
  const r = document.getElementById('safeInner').getBoundingClientRect();
  const k = dpr / s;
  safe = { l: r.left * k, t: r.top * k, r: (cw - r.right) * k, b: (ch - r.bottom) * k };
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const toLogical = (x, y) => ({ x: x * dpr / s, y: y * dpr / s });

// ---------- audio ----------
const SFX = ['knock', 'candy-small', 'candy-big', 'jack-light', 'close', 'meh', 'eww', 'empty-bowl', 'swap', 'not-enough-candy', 'dash', 'float', 'float-land', 'boo', 'sniff', 'charm', 'sugar-rush', 'power-not-ready', 'prankster-bump', 'kid-alert', 'target-reached', 'star-ding', 'ui-click', 'map-open', 'wardrobe', 'night-complete', 'ambience'];
function setupAudio() {
  const m = {};
  for (const n of ['title', 'night-a', 'night-b', 'finale']) m[n] = `assets/audio/music/music-${n}.mp3`;
  for (const n of SFX) m[n] = `assets/audio/sfx/${n}.mp3`;
  loadSounds(m);
  audio.muted = !!G.save.settings.muted; audio.musicOn = G.save.settings.music; audio.sfxOn = G.save.settings.sfx;
}
function startAudio() {
  if (G.audioStarted) return;
  G.audioStarted = true;
  initAudio(); applyVolumes();
  musicForScreen();
}
function musicForScreen() {
  if (!G.audioStarted) return;
  const sc = G.screen;
  if (sc === 'play' || sc === 'pause' || sc === 'map' || (sc === 'howto' && G.returnTo === 'pause')) { playMusic(G.world.night.music); playAmbience('ambience'); }
  else if (sc === 'finale') { stopAmbience(); }
  else { playMusic('title'); stopAmbience(); }
}
function toggleMute() { audio.muted = !audio.muted; G.save.settings.muted = audio.muted; applyVolumes(); if (G.screen === 'pause' || G.screen === 'howto') duckMusic(true); writeSave(G.save); if (!audio.muted) sfx('ui-click'); }

const EVENT_SFX = { knock: 'knock', close: 'close', meh: 'meh', eww: 'eww', empty: 'empty-bowl', swap: 'swap', nocandy: 'not-enough-candy', dash: 'dash', float: 'float', land: 'float-land', boo: 'boo', sniff: 'sniff', charm: 'charm', rush: 'sugar-rush', notReady: 'power-not-ready', bump: 'prankster-bump', alert: 'kid-alert', target: 'target-reached', ui: 'ui-click', wardrobe: 'wardrobe', candySmall: 'candy-small' };

// ---------- screens ----------
function go(screen) {
  G.screen = screen; G.fade = 1; ui.focus = null;
  document.body.classList.toggle('playing', screen === 'play');
  input.stickEnabled = screen === 'play';
  document.body.classList.remove('dialog');
  if (screen !== 'play') { input.stick.active = false; input.stick.x = input.stick.y = 0; }
  musicForScreen();
}

function startNight(n, costume, seed, opts = {}) {
  const night = NIGHTS[n - 1];
  if (seed === undefined) { G.save.runs = (G.save.runs || 0) + 1; seed = G.save.runs * 7919 + n * 101; }
  const town = generateTownSafe(night, G.save, seed);
  if (!town) { G.error = { n, costume }; go('error'); return; }
  const w = createWorld(town, G.save, { costume });
  w.staticC = buildStatic(town); w.lights = buildLights(town);
  G.world = w; G.night = n; G.finale = null; G.finaleDelay = 0;
  if (!G.save.wardrobe.includes(w.player.costume)) G.save.wardrobe.push(w.player.costume);
  writeSave(G.save);
  go('play');
}

function stars(n, candy, need) { return candy >= need * 10 ? 3 : candy >= need * 6 ? 2 : 1; }
function endNight(cleared) {
  const w = G.world, n = w.night.n, sv = G.save;
  const st = cleared ? stars(n, w.candy, w.need) : 0;
  const rec = sv.nights[n] || { cleared: false, best: 0, stars: 0 };
  if (cleared) { rec.cleared = true; rec.best = Math.max(rec.best, w.candy); rec.stars = Math.max(rec.stars, st); sv.unlocked = Math.max(sv.unlocked, Math.min(8, n + 1)); }
  sv.nights[n] = rec;
  sv.lifetime = (sv.lifetime || 0) + w.candy;
  sv.firstDone = true;
  writeSave(sv);
  G.complete = { n, cleared, candy: w.candy, stars: st, newCostumes: w.newCostumes.slice(), newJacks: w.newJacks.slice(), lit: w.lit, need: w.need, t: 0, dinged: 0 };
  if (cleared) sfx('night-complete');
  go(cleared ? 'complete' : 'select');
}

// ---------- update ----------
function update(dt) {
  if (input.consume('mute')) toggleMute();
  if (ui.navSound) { ui.navSound = false; sfx('ui-click', { vol: 0.5 }); }
  const w = G.world;
  if (G.screen === 'play') {
    input.stickEnabled = !w.dialog;
    if (w.dialog) input.stick.active = false;
    if (!w.dialog) {
      if (input.consume('back') || input.consume('pause')) { go('pause'); duckMusic(true); return; }
      if (input.consume('map')) { go('map'); sfx('map-open'); return; }
    }
    const act = !w.dialog && input.consume('act');
    const power = !w.dialog && input.consume('power');
    const axis = w.dialog ? { x: 0, y: 0 } : input.axis();
    updateWorld(w, dt, axis, act, power);
    for (const e of w.events) {
      if (e.type === 'save') writeSave(G.save);
      else if (e.type === 'jack') { sfx('jack-light'); sfx('candy-big', { vol: 0.8 }); }
      else if (EVENT_SFX[e.type]) sfx(EVENT_SFX[e.type]);
    }
    w.events.length = 0;
    if (w.finaleReady) { G.finaleDelay += dt; if (G.finaleDelay > 1.8 && !w.dialog) startFinale(); }
  } else if (G.screen === 'map') {
    if (input.consume('map') || input.consume('back') || input.consume('act')) { go('play'); }
    G.world.time += dt;
  } else if (G.screen === 'finale') {
    const f = G.finale;
    f.clock += dt;
    updateFinale(f, f.clock, dt, input.consume('act'), input.consume('back'));
    if (f.hitSound) { f.hitSound = false; sfx('boo', { vol: 0.7 }); }
    if (f.missSound) { f.missSound = false; }
    if (f.b > 96 && !f.rainSound) { f.rainSound = true; sfx('candy-big'); }
    if (f.done) finishFinale();
  } else if (G.screen === 'complete') {
    const c = G.complete; c.t += dt;
    if (c.dinged < c.stars && c.t > 0.8 + c.dinged * 0.45) { c.dinged++; sfx('star-ding'); }
  }
}

function clockNow() { const a = audioCtx(); return a && a.state === 'running' ? a.currentTime : performance.now() / 1000; }
function startFinale() {
  const w = G.world;
  G.save.finaleDone = true;
  go('finale');
  stopAmbience();
  if (G.audioStarted && hasBuffer('finale')) playMusic('finale', true, false); else stopMusic();
  G.finale = createFinale(w, 0);
  G.finale.clock = 0;
}
function finishFinale() {
  const w = G.world;
  endNightSilently(w);
  go('victory');
}
function endNightSilently(w) {
  const sv = G.save, n = w.night.n;
  const rec = sv.nights[n] || { cleared: false, best: 0, stars: 0 };
  rec.cleared = true; rec.best = Math.max(rec.best, w.candy); rec.stars = Math.max(rec.stars, stars(n, w.candy, w.need));
  sv.nights[n] = rec; sv.lifetime = (sv.lifetime || 0) + w.candy; sv.finaleDone = true; sv.firstDone = true;
  writeSave(sv);
}

// ---------- drawing ----------
function camFor(w) {
  const p = w.player;
  const mw = w.town.W * TILE, mh = w.town.H * TILE;
  let x = p.x - LW / 2, y = p.y - 16 - LH * (input.touchMode ? 0.42 : 0.5);
  x = mw <= LW ? (mw - LW) / 2 : Math.max(0, Math.min(mw - LW, x));
  y = mh <= LH ? (mh - LH) / 2 : Math.max(0, Math.min(mh - LH, y));
  if (w.shake > 0) { x += (Math.random() - 0.5) * 6 * w.shake / 0.35; y += (Math.random() - 0.5) * 6 * w.shake / 0.35; }
  return { x, y };
}

function blitWorld() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(worldC, 0, 0, LW * s, LH * s);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function draw(dt) {
  const wg = worldC.getContext('2d');
  wg.imageSmoothingEnabled = false;
  ui.keyNav = true;
  const sc = G.screen;
  if (sc === 'play' || sc === 'pause' || sc === 'map') {
    const w = G.world;
    const cam = camFor(w);
    drawWorld(wg, w, LW, LH, cam);
    blitWorld();
    ui.begin(ctx, LW, LH, toLogical, safe, dt);
    drawOverlays(ctx, w, LW, LH, cam, ui);
    if (sc === 'play') drawPlayUi(w);
    else if (sc === 'map') { ui.keyNav = false; drawMap(ctx, w, LW, LH, ui); if (ui.button('m-close', 'Close ✕', LW - safe.r - 66, safe.t + 4, 60, 18, { noNav: true }) || ui.taps.length) { ui.taps.length = 0; go('play'); } }
    else drawPause();
  } else if (sc === 'finale') {
    drawFinale(wg, G.finale, LW, LH, G.world, G.world.staticC);
    blitWorld();
    ui.begin(ctx, LW, LH, toLogical, safe, dt);
    ui.keyNav = false;
    if (drawFinaleUi(G.finale, LW, LH, safe)) G.finale.done = true;
  } else {
    drawBackdrop(wg, dt);
    blitWorld();
    ui.begin(ctx, LW, LH, toLogical, safe, dt);
    ({ title: drawTitle, select: drawSelect, intro: drawIntro, complete: drawComplete, collection: drawCollection, howto: drawHowto, victory: drawVictory, error: drawError, loading: drawLoading })[sc]?.();
  }
  // fade
  if (G.fade > 0) { ctx.fillStyle = `rgba(14,11,28,${G.fade})`; ctx.fillRect(0, 0, LW, LH); G.fade = Math.max(0, G.fade - dt * 4); }
  // update the touch power button label
  if (G.screen === 'play' && input.touchMode) {
    const p = G.world.player, pw = POWERS[COSTUME[p.costume].power];
    const label = p.cd > 0 ? Math.ceil(p.cd) + 's' : pw.name;
    if (btnB.textContent !== label) btnB.textContent = label;
    btnB.style.opacity = p.cd > 0 ? 0.55 : 1;
  }
}

function drawPlayUi(w) {
  if (w.dialog !== G.lastDialog) { G.lastDialog = w.dialog; ui.focus = null; }
  ui.keyNav = !!w.dialog;
  const acts = drawHud(w, SPR, input.touchMode, !audio.muted);
  if (acts.sound) toggleMute();
  if (acts.pause) { go('pause'); duckMusic(true); return; }
  if (acts.map) { go('map'); sfx('map-open'); return; }
  if (acts.finish) { endNight(true); return; }
  if (w.dialog) {
    ctx.fillStyle = 'rgba(14,11,28,0.35)'; ctx.fillRect(0, 0, LW, LH);
    if (w.dialog.type === 'wardrobe') {
      const r = drawWardrobe(w, SPR, G.save.wardrobe, 'Your closet: pick a costume', true);
      if (r?.wear) { wearFromWardrobe(w, r.wear); sfx('swap'); }
      else if (r?.close) { w.dialog = null; sfx('ui-click'); }
      else if (r?.finish) { w.dialog = null; endNight(true); }
    } else {
      const ans = drawDialog(w, SPR);
      if (ans !== null && ans !== undefined) { answerDialog(w, ans); for (const e of w.events) { if (e.type === 'save') writeSave(G.save); else if (e.type === 'jack') { sfx('jack-light'); sfx('candy-big', { vol: 0.8 }); } else if (EVENT_SFX[e.type]) sfx(EVENT_SFX[e.type]); } w.events.length = 0; }
    }
  } else if (input.touchMode && w.target) {
    // on touch, show what A will do
    const lbl = { light: 'Light!', knock: 'Knock', switch: 'Switch', home: 'Closet', dark: 'Knock', kid: 'Trade' }[w.target.type];
    if (btnA.textContent !== lbl) { btnA.textContent = lbl; btnA.style.fontSize = lbl.length > 1 ? '15px' : ''; }
  } else if (btnA.textContent !== 'A') { btnA.textContent = 'A'; btnA.style.fontSize = ''; }
  document.body.classList.toggle('dialog', !!w.dialog);
}

function drawPause() {
  ctx.fillStyle = 'rgba(14,11,28,0.7)'; ctx.fillRect(0, 0, LW, LH);
  const pw = 190, items = 6, ph = 30 + items * 24;
  const px = Math.round(LW / 2 - pw / 2), py = Math.round(LH / 2 - ph / 2);
  ui.panel(px, py, pw, ph);
  ui.text('Paused', LW / 2, py + 18, 12, '#ffd25e', 'center');
  let y = py + 28;
  const B = (id, label, opts) => { const r = ui.button(id, label, px + 15, y, pw - 30, 19, opts); y += 24; return r; };
  if (B('p-resume', 'Resume', { def: true }) || input.consume('back') || input.consume('pause')) { go('play'); duckMusic(false); return; }
  if (B('p-how', 'How to play')) { G.returnTo = 'pause'; G.howPage = 0; go('howto'); return; }
  if (B('p-music', `Music: ${audio.musicOn ? 'on' : 'off'}`)) { audio.musicOn = !audio.musicOn; G.save.settings.music = audio.musicOn; applyVolumes(); duckMusic(true); writeSave(G.save); }
  if (B('p-sfx', `Sounds: ${audio.sfxOn ? 'on' : 'off'}`)) { audio.sfxOn = !audio.sfxOn; G.save.settings.sfx = audio.sfxOn; applyVolumes(); duckMusic(true); writeSave(G.save); sfx('ui-click'); }
  if (B('p-home', 'Head home early')) { duckMusic(false); endNight(false); return; }
  if (B('p-quit', 'Quit to title')) { duckMusic(false); writeSave(G.save); go('title'); return; }
}

// title-style backdrop with the generated art and a few costumed kids strolling
const strollers = [];
function drawBackdrop(g, dt) {
  const im = IMG.title;
  g.fillStyle = '#1b1533'; g.fillRect(0, 0, LW, LH);
  if (im) {
    const k = Math.max(LW / im.width, LH / im.height);
    const w = im.width * k, h = im.height * k;
    g.imageSmoothingEnabled = true;
    g.drawImage(im, (LW - w) / 2, (LH - h) / 2, w, h);
    g.imageSmoothingEnabled = false;
    if (!strollers.length) for (let i = 0; i < 7; i++) strollers.push({ c: COSTUMES[(i * 7 + 3) % 50].id, x: Math.random(), sp: 0.02 + Math.random() * 0.02, dir: Math.random() < 0.5 ? 1 : -1, t: Math.random() * 6 });
    const roadY = (LH - h) / 2 + h * 0.86;
    strollers.sort((a, b) => a.dir - b.dir);
    for (const st of strollers) {
      st.x += st.sp * st.dir * dt; st.t += dt * 8;
      if (st.x > 1.1) st.x = -0.1; if (st.x < -0.1) st.x = 1.1;
      const sp = SPR.day[st.c]; if (!sp) continue;
      const y = roadY + (st.dir > 0 ? 6 : -4) - Math.abs(Math.sin(st.t)) * 2;
      g.save(); g.translate(Math.round(st.x * LW), Math.round(y)); g.scale(st.dir, 1); g.drawImage(sp, -sp.width / 2, -sp.height); g.restore();
    }
  }
  if (G.screen !== 'title') { g.fillStyle = 'rgba(14,11,28,0.55)'; g.fillRect(0, 0, LW, LH); }
}

function drawLoading() { ui.text('Carving pumpkins…', LW / 2, LH / 2, 12, '#ffd25e', 'center'); }

function drawTitle() {
  const t = ui.time;
  const big = Math.min(44, LW / 7);
  const ty = safe.t + Math.max(38, LH * 0.2);
  ctx.save();
  ctx.shadowColor = 'rgba(240,138,36,0.8)'; ctx.shadowBlur = 10 + Math.sin(t * 2) * 3;
  ui.text('Porchlight', LW / 2, ty, big, '#ffd25e', 'center');
  ctx.restore();
  ui.text('Match the costume. Light the jack.', LW / 2, ty + 14, 9, '#f2ead8', 'center');
  if (!G.audioStarted) {
    const msg = input.touchMode ? 'Tap to start' : 'Press any key or click to start', mw = ui.measure(msg, 11) + 20;
    ctx.fillStyle = 'rgba(20,15,36,0.8)'; ctx.fillRect(Math.round(LW / 2 - mw / 2), Math.round(ty + 26), Math.round(mw), 18);
    if (Math.sin(t * 4) > -0.4) ui.text(msg, LW / 2, ty + 39, 11, '#ffd25e', 'center');
    if (ui.taps.length || input.anyKey) { startAudio(); ui.taps.length = 0; input.pressed.clear(); sfx('ui-click'); }
    return;
  }
  const bw = 120, bh = 20;
  let y = Math.max(ty + 28, LH * 0.48);
  const x = Math.round(LW / 2 - bw / 2);
  if (ui.button('t-play', G.save.firstDone ? 'Play' : 'Start trick-or-treating!', x - 20, y, bw + 40, bh, { def: true })) {
    sfx('ui-click');
    if (!G.save.firstDone) startNight(1, 'spooky-white'); else go('select');
    return;
  }
  y += bh + 6;
  if (ui.button('t-coll', 'Collection', x, y, bw, bh)) { sfx('ui-click'); go('collection'); }
  y += bh + 6;
  if (ui.button('t-how', 'How to play', x, y, bw, bh)) { sfx('ui-click'); G.returnTo = 'title'; G.howPage = 0; go('howto'); }
  const jacks = G.save.jacks.length, cos = G.save.wardrobe.length;
  const cl = `Jacks ${jacks}/50 · Costumes ${cos}/50`, cw2 = ui.measure(cl, 8) + 12;
  ctx.fillStyle = 'rgba(20,15,36,0.75)'; ctx.fillRect(Math.round(LW / 2 - cw2 / 2), LH - safe.b - 17, Math.round(cw2), 12);
  ui.text(cl, LW / 2, LH - safe.b - 8, 8, '#b0a8c8', 'center');
  if (ui.button('t-sound', audio.muted ? 'Sound: off' : 'Sound: on', LW - safe.r - 70, safe.t + 6, 64, 16, { size: 7, noPulse: true })) toggleMute();
}

function drawSelect() {
  ui.text('Pick a night', LW / 2, safe.t + 22, 14, '#ffd25e', 'center');
  const cols = LW > LH * 1.2 ? 4 : 2, rows = 8 / cols;
  const cw = Math.min(110, (LW - 20 - safe.l - safe.r) / cols - 6), ch = Math.min(64, (LH - 70 - safe.t - safe.b) / rows - 6);
  const gx = LW / 2 - (cols * (cw + 6)) / 2 + 3, gy = safe.t + 34;
  for (let i = 0; i < 8; i++) {
    const n = NIGHTS[i], r = Math.floor(i / cols), c = i % cols;
    const x = Math.round(gx + c * (cw + 6)), y = Math.round(gy + r * (ch + 6));
    const locked = n.n > G.save.unlocked;
    const rec = G.save.nights[n.n];
    const clicked = ui.button('n-' + n.n, '', x, y, cw, ch, { disabled: locked, def: n.n === Math.min(G.save.unlocked, 8), draw: (bx, by, bw, bh, f) => {
      const col = f ? '#140f24' : (locked ? '#6a6080' : '#f2ead8');
      ui.text(`Night ${n.n}`, bx + bw / 2, by + 13, 9, f ? '#140f24' : '#ffd25e', 'center', !f);
      ui.text(locked ? 'Locked' : n.name, bx + bw / 2, by + 25, 8, col, 'center', !f, bw - 6);
      if (!locked) {
        ui.text(`Light ${n.need} jacks`, bx + bw / 2, by + 36, 7, col, 'center', !f);
        for (let k = 0; k < 3; k++) drawStar(ctx, bx + bw / 2 - 12 + k * 12, by + 46, rec && rec.stars > k);
        if (rec && rec.best) ui.text(`Best ${rec.best}`, bx + bw / 2, by + bh - 3, 6, col, 'center', !f);
      }
    } });
    if (clicked) { sfx('ui-click'); G.night = n.n; G.pick = null; go('intro'); return; }
  }
  if (ui.button('s-back', 'Back', safe.l + 8, LH - safe.b - 24, 60, 18) || input.consume('back')) { sfx('ui-click'); go('title'); }
}

function drawStar(g, x, y, on) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.2 : 5.2; pts.push([x + Math.cos(a) * r, y + 0.5 + Math.sin(a) * r]); }
  g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.fillStyle = on ? '#ffd25e' : '#3a3248'; g.fill();
  g.strokeStyle = '#140f24'; g.lineWidth = 1; g.stroke();
}

function drawIntro() {
  const n = NIGHTS[G.night - 1];
  const fake = { player: { costume: G.pick || (G.save.wardrobe.includes('spooky-white') ? 'spooky-white' : G.save.wardrobe[0]) } };
  const r = drawWardrobe(fake, SPR, G.save.wardrobe, `Night ${n.n}: ${n.name}. Light ${n.need} jacks. Pick your costume:`, false);
  if (r?.wear) { G.pick = r.wear; sfx('swap'); startNight(n.n, r.wear); return; }
  if (ui.button('i-back', 'Back', safe.l + 8, LH - safe.b - 24, 60, 18) || input.consume('back')) { sfx('ui-click'); go('select'); }
}

function drawComplete() {
  const c = G.complete;
  const pw = Math.min(LW - 20, 320), ph = Math.min(LH - 20, 230);
  const px = Math.round(LW / 2 - pw / 2), py = Math.round(LH / 2 - ph / 2);
  ui.panel(px, py, pw, ph);
  ui.text(`Night ${c.n} solved!`, LW / 2, py + 22, 15, '#ffd25e', 'center');
  for (let k = 0; k < 3; k++) { const on = k < c.dinged; ctx.save(); ctx.translate(LW / 2 - 24 + k * 24, py + 40); ctx.scale(2, 2); drawStar(ctx, 0, 0, on); ctx.restore(); }
  ui.text(`Candy kept: ${c.candy}`, LW / 2, py + 64, 10, '#f2ead8', 'center');
  ui.text(`Jacks lit: ${c.lit}/${c.need} · Lifetime haul: ${G.save.lifetime}`, LW / 2, py + 77, 8, '#b0a8c8', 'center');
  let y = py + 90;
  if (c.newCostumes.length) {
    ui.text('New costumes:', px + 12, y + 6, 8, '#9fe0ff');
    c.newCostumes.slice(0, 8).forEach((id, i) => ui.costumeSprite(SPR, id, px + 90 + i * 26, y + 34, 0.7));
    y += 40;
  }
  if (c.newJacks.length) {
    ui.text(`New jacks: ${c.newJacks.length}`, px + 12, y + 8, 8, '#ffd25e');
    c.newJacks.slice(0, 10).forEach((hid, i) => drawPumpkin(ctx, px + 90 + i * 21, y - 4, { carved: true, lit: true, face: HOUSEHOLDS[hid].face, scale: 1.25 }));
    y += 22;
  }
  const by = py + ph - 26;
  const hasNext = c.n < 8 && G.save.unlocked > c.n;
  if (hasNext && ui.button('c-next', c.n + 1 === 8 ? 'The Big Night!' : 'Next night', px + 10, by, 96, 18, { def: true, accent: c.n + 1 === 8 })) { sfx('ui-click'); G.night = c.n + 1; go('intro'); return; }
  if (ui.button('c-replay', 'Replay', px + pw / 2 - 40 + (hasNext ? 14 : -50), by, 70, 18, { def: !hasNext })) { sfx('ui-click'); G.night = c.n; go('intro'); return; }
  if (ui.button('c-title', 'Title', px + pw - 70, by, 60, 18)) { sfx('ui-click'); go('title'); }
}

function drawCollection() {
  ui.text('Collection', LW / 2, safe.t + 18, 13, '#ffd25e', 'center');
  if (ui.button('co-jacks', `Jacks ${G.save.jacks.length}/50`, LW / 2 - 104, safe.t + 24, 100, 16, { size: 8, accent: G.collTab === 'jacks' })) G.collTab = 'jacks';
  if (ui.button('co-cos', `Costumes ${G.save.wardrobe.length}/50`, LW / 2 + 4, safe.t + 24, 100, 16, { size: 8, accent: G.collTab === 'costumes' })) G.collTab = 'costumes';
  const top = safe.t + 46, bottom = LH - safe.b - 44;
  const cell = Math.min((LW - 20 - safe.l - safe.r) / 10, (bottom - top) / 5);
  const gx = LW / 2 - cell * 5;
  let focusInfo = null;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) {
    const cost = COSTUMES[r * 10 + c];
    const x = Math.round(gx + c * cell), y = Math.round(top + r * cell);
    if (G.collTab === 'jacks') {
      const h = HOUSEHOLDS.find(hh => hh.fav === cost.id);
      const own = G.save.jacks.includes(h.id);
      const id = 'cj-' + h.id;
      ui.button(id, '', x + 1, y + 1, cell - 2, cell - 2, { noPulse: false, draw: (bx, by, bw, bh) => {
        const sc = Math.max(1, Math.floor((Math.min(bw, bh) - 8) / 16 * 2) / 2);
        const jx = bx + bw / 2 - 8 * sc, jy = by + bh / 2 - 7 * sc;
        if (own) drawPumpkin(ctx, jx, jy, { carved: true, lit: true, face: h.face, flicker: Math.sin(ui.time * 9 + h.id) > 0.7, scale: sc });
        else { ctx.globalAlpha = 0.35; drawPumpkin(ctx, jx, jy, { carved: true, lit: false, face: h.face, scale: sc }); ctx.globalAlpha = 1; }
      } });
      if (ui.focus === id) {
        const cl = G.save.clues[h.id];
        focusInfo = own ? `${cap(h.name)} love the ${cost.name}. Jack collected!` : `${cap(h.name)}: ${cl ? 'love something ' + KIND_NAMES[cost.kind] + (clueExact({ save: G.save }, h.id) ? ', ' + cost.color : '') : 'a mystery so far'}.`;
      }
    } else {
      const own = G.save.wardrobe.includes(cost.id);
      const id = 'cc-' + cost.id;
      ui.button(id, '', x + 1, y + 1, cell - 2, cell - 2, { draw: (bx, by, bw, bh) => {
        ctx.fillStyle = COLOR_HEX[cost.color]; ctx.globalAlpha = 0.25; ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4); ctx.globalAlpha = 1;
        ui.costumeSprite(SPR, cost.id, bx + bw / 2, by + bh - 2, Math.min(1, (bh - 4) / 40), !own);
      } });
      if (ui.focus === id) focusInfo = own ? `${cost.name} (${KIND_NAMES[cost.kind]}, ${cost.color}): ${POWERS[cost.power].name}, ${POWERS[cost.power].desc}` : `??? A ${cost.color} ${KIND_NAMES[cost.kind]} costume. Trade for it on a night!`;
    }
  }
  if (focusInfo) ui.text(focusInfo, LW / 2, bottom + 12, 8, '#f2ead8', 'center', true, LW - 20);
  if (ui.button('co-back', 'Back', safe.l + 8, LH - safe.b - 24, 60, 18) || input.consume('back')) { sfx('ui-click'); go('title'); }
}
const cap = s2 => s2.charAt(0).toUpperCase() + s2.slice(1);

const HOW = [
  { title: '1. Read the sign, knock', lines: ['Houses with a pumpkin have candy. The sign shows the KIND of costume they love.', 'Knock in any costume: close ones reveal the COLOR; others leave 3 color dots.'] },
  { title: '2. Find the kid, trade', lines: ['Kids wear badges: kind icon + color. A "!" means a house you solved wants that costume.', 'Walk up and press A to trade outfits for candy. It stays in your closet forever.'] },
  { title: '3. Light the jack', lines: ['Knock in the favorite costume and the pumpkin becomes a jack-o\'-lantern.', 'Light enough jacks to finish the night. Shift / PWR uses your costume\'s power.'] },
];
function drawHowto() {
  const pg = HOW[G.howPage];
  const pw = Math.min(LW - 20, 360), ph = Math.min(LH - 20, 210);
  const px = Math.round(LW / 2 - pw / 2), py = Math.round(LH / 2 - ph / 2);
  ui.panel(px, py, pw, ph);
  ui.text(pg.title, LW / 2, py + 20, 12, '#ffd25e', 'center');
  // little scene with real sprites, drawn at 1.8x
  const sy = py + 92, cx = LW / 2;
  ctx.save(); ctx.translate(cx, sy); ctx.scale(1.8, 1.8);
  if (G.howPage === 0) {
    drawPumpkin(ctx, -30, -16, {}); ctx.fillStyle = '#140f24'; ctx.fillRect(-13, -31, 15, 15); ctx.fillStyle = '#c9a77a'; ctx.fillRect(-12, -30, 13, 13); drawKindIcon(ctx, 'critter', -11, -29);
    ['pink', 'orange', 'brown'].forEach((c, i) => { ctx.fillStyle = '#140f24'; ctx.fillRect(-33 + i * 7, -27, 6, 6); ctx.fillStyle = COLOR_HEX[c]; ctx.fillRect(-32 + i * 7, -26, 4, 4); });
    ui.costumeSprite(SPR, 'spooky-white', 22, 2, 1);
  } else if (G.howPage === 1) {
    ui.costumeSprite(SPR, 'spooky-white', -22, 2, 1);
    ui.costumeSprite(SPR, 'critter-pink', 22, 2, 1);
    ctx.fillStyle = '#140f24'; ctx.beginPath(); ctx.arc(22, -46, 8, 0, 7); ctx.fill();
    ctx.fillStyle = COLOR_HEX.pink; ctx.beginPath(); ctx.arc(22, -46, 7, 0, 7); ctx.fill(); drawKindIcon(ctx, 'critter', 16.5, -51.5);
  } else {
    drawPumpkin(ctx, -36, -18, { carved: true, lit: true, face: { eyes: 0, mouth: 1 }, scale: 1.4 });
    ui.costumeSprite(SPR, 'critter-pink', 22, 2, 1);
  }
  ctx.restore();
  pg.lines.forEach((ln, i) => ui.wrap(ln, pw - 30, 8).forEach((l2, j) => ui.text(l2, LW / 2, py + 116 + i * 28 + j * 11, 8, '#f2ead8', 'center')));
  const by = py + ph - 26;
  if (G.howPage > 0 && ui.button('h-prev', 'Back', px + 10, by, 60, 18)) { G.howPage--; sfx('ui-click'); }
  const last = G.howPage === HOW.length - 1;
  if (ui.button('h-next', last ? 'Got it!' : 'Next', px + pw - 80, by, 70, 18, { def: true })) {
    sfx('ui-click');
    if (last) { G.save.seenHowTo = true; writeSave(G.save); go(G.returnTo === 'pause' ? 'pause' : 'title'); if (G.returnTo === 'pause') duckMusic(true); } else G.howPage++;
  }
  if (input.consume('back')) go(G.returnTo === 'pause' ? 'pause' : 'title');
}

function drawVictory() {
  const t = ui.time;
  ctx.fillStyle = 'rgba(14,11,28,0.45)'; ctx.fillRect(0, 0, LW, LH);
  ui.text('You lit every porch on the block!', LW / 2, safe.t + 30, Math.min(16, LW / 22), '#ffd25e', 'center');
  ui.text(`Lifetime candy haul: ${G.save.lifetime}`, LW / 2, safe.t + 46, 11, '#f2ead8', 'center');
  ui.text(`Jacks ${G.save.jacks.length}/50 · Costumes ${G.save.wardrobe.length}/50`, LW / 2, safe.t + 58, 8, '#b0a8c8', 'center');
  const by = LH - safe.b - 34;
  drawPile(ctx, LW / 2, by, Math.min(LW * 0.5, 300), LH * 0.3, 1, 900);
  // kids cheering around the haul
  for (let i = 0; i < 10; i++) {
    const side = i < 5 ? -1 : 1, k = i % 5;
    const x = LW / 2 + side * (Math.min(LW * 0.25, 150) + 16 + k * 22), y = by + 2 - Math.abs(Math.sin(t * 5 + i)) * 7;
    ui.costumeSprite(SPR, COSTUMES[(i * 11 + 3) % 50].id, x, y, 1);
  }
  ui.costumeSprite(SPR, G.world ? G.world.player.costume : 'spooky-white', LW / 2, by - LH * 0.3 - 2 - Math.abs(Math.sin(t * 4)) * 5, 1.2);
  if (ui.button('v-title', 'Play again', LW / 2 - 50, LH - safe.b - 24, 100, 18, { def: true })) { sfx('ui-click'); go('title'); }
}

function drawError() {
  ui.text("Couldn't build the town.", LW / 2, LH / 2 - 20, 12, '#ffd25e', 'center');
  if (ui.button('e-retry', 'Retry', LW / 2 - 70, LH / 2, 64, 18, { def: true })) { startNight(G.error.n, G.error.costume, Date.now() & 0xffff); return; }
  if (ui.button('e-title', 'Title', LW / 2 + 6, LH / 2, 64, 18)) go('title');
}

// ---------- loop ----------
const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  let dt = Math.min(0.25, (now - last) / 1000); last = now;
  acc += dt * G.timeScale;
  let steps = 0;
  while (acc >= STEP && steps < 8 * G.timeScale) { update(STEP); acc -= STEP; steps++; if (steps === 1) { /* keep latched presses for draw */ } }
  if (acc > STEP * 8) acc = 0;
  draw(dt);
  input.endFrame(steps > 0);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.screen === 'play') { go('pause'); duckMusic(true); } audioCtx()?.suspend?.(); }
  else if (G.audioStarted) audioCtx()?.resume?.();
});
addEventListener('blur', () => { if (G.screen === 'play') { go('pause'); duckMusic(true); } });

// ---------- boot ----------
const btnA = document.getElementById('btnA'), btnB = document.getElementById('btnB');
async function boot() {
  resize();
  initInput(cv, [[btnA, 'act'], [btnB, 'power']]);
  input.onFirstInput = () => { if (G.screen !== 'title' && G.screen !== 'loading') startAudio(); };
  setupAudio();
  buildTiles();
  const imgs = { title: 'assets/bg/title.jpg', pumpkin: 'assets/world/pumpkin.png', oak: 'assets/world/oak.png', deadtree: 'assets/world/deadtree.png', lamp: 'assets/world/lamp.png', tomb: 'assets/world/tomb.png', fountain: 'assets/world/fountain.png' };
  for (let i = 0; i < 4; i++) { imgs['house-' + i] = `assets/world/house-${i}.png`; imgs[`house-${i}-wall`] = `assets/world/house-${i}-wall.png`; imgs[`house-${i}-win`] = `assets/world/house-${i}-win.png`; }
  for (const c of COSTUMES) imgs['c-' + c.id] = `assets/sprites/costumes/${c.id}.png`;
  await Promise.all([loadImages(imgs), document.fonts.load('10px Pixelify').catch(() => {})]);
  buildSpriteCaches();
  document.getElementById('loading').remove();
  go('title');
  requestAnimationFrame(t => { last = t; frame(t); });
}
boot();

// offline play
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || params.has('sw'))) navigator.serviceWorker.register('sw.js');

// ---------- debug hook (read state, jump to a night; never plays for you) ----------
window.__game = {
  state: () => {
    const w = G.world;
    const base = { screen: G.screen, audioStarted: G.audioStarted, touch: input.touchMode, view: { LW, LH, s } };
    if (!w) return base;
    return {
      ...base, night: w.night.n, need: w.need, lit: w.lit, candy: w.candy, reached: w.reached,
      player: { x: w.player.x, y: w.player.y, tx: Math.floor(w.player.x / TILE), ty: Math.floor(w.player.y / TILE), costume: w.player.costume, cd: w.player.cd, floating: w.player.floatT > 0 || w.player.floatExtra > 0 },
      actTarget: w.target ? { type: w.target.type, id: w.target.type === 'kid' ? w.target.obj.id : (w.target.obj.hid ?? 'home') } : null,
      dialog: w.dialog ? { type: w.dialog.type, options: w.dialog.options || null, text: w.dialog.text || null } : null,
      prompt: w.tut ? w.tut.text : null, tutStage: w.tut ? w.tut.stage : null,
      levelComplete: G.screen === 'complete', gameWon: G.screen === 'victory', finale: G.finale ? { b: G.finale.b, hits: G.finale.hits } : null,
      wardrobe: G.save.wardrobe.length, jacks: G.save.jacks.length,
    };
  },
  levels: () => NIGHTS.length,
  goToLevel: (n, seed, opts = {}) => {
    if (opts.wardrobe === 'full') G.save.wardrobe = COSTUMES.map(c => c.id);
    else if (opts.wardrobe === 'starter') G.save.wardrobe = ['spooky-white', 'critter-black', 'hero-red'];
    else if (Array.isArray(opts.wardrobe)) G.save.wardrobe = opts.wardrobe.slice();
    if (opts.jacks === 'all') G.save.jacks = HOUSEHOLDS.map(h => h.id);
    else if (opts.jacks === 'none') { G.save.jacks = []; G.save.clues = {}; }
    else if (Array.isArray(opts.jacks)) G.save.jacks = opts.jacks.slice();
    if (opts.firstDone !== undefined) G.save.firstDone = opts.firstDone;
    G.save.unlocked = Math.max(G.save.unlocked, n);
    startAudio();
    startNight(n, opts.costume || G.save.wardrobe[0], seed ?? 1000 + n);
    return window.__game.state();
  },
  audioState: () => ({ context: audioCtx()?.state || 'none', muted: audio.muted, musicOn: audio.musicOn, sfxOn: audio.sfxOn }),
  town: () => {
    const w = G.world; if (!w) return null;
    const want = wantedCostumes(w);
    return {
      W: w.town.W, H: w.town.H, home: { x: Math.floor(w.town.home.door.x), y: Math.floor(w.town.home.door.y) },
      houses: w.town.candyHouses.map(l => ({ id: l.hid, door: { x: Math.floor(l.door.x), y: Math.floor(l.door.y) }, fav: HOUSEHOLDS[l.hid].fav, lit: l.lit, known: l.known, refill: Math.max(0, l.refill), exact: clueExact(w, l.hid) })),
      kids: w.kids.map(k => ({ id: k.id, tx: Math.floor(k.x / TILE), ty: Math.floor(k.y / TILE), x: k.x, y: k.y, costume: k.costume, price: kidPrice(w, k), frozen: k.frozen > 0, prankster: k.prankster, wanted: want.has(k.costume) })),
    };
  },
  pathTo: (x, y) => { const w = G.world; if (!w) return null; return findPath(w.town, Math.floor(w.player.x / TILE), Math.floor(w.player.y / TILE), x, y); },
  setTimeScale: n => { if (DEBUG) G.timeScale = n; return G.timeScale; },
  showScreen: name => { if (DEBUG) go(name); return G.screen; },   // test aid: screenshots of end screens
  save: () => JSON.parse(JSON.stringify(G.save)),
  reset: () => { G.save = freshSave(); writeSave(G.save); go('title'); },
};

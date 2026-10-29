// Web Audio: decoded buffers, looping music on its own gain, effects that overlap.
let ctx = null, master, musicGain, sfxGain;
const buffers = {};
let current = null, currentName = null;
export const audio = { musicOn: true, sfxOn: true, muted: false, wanted: null };

export function audioCtx() { return ctx; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
  applyVolumes();
  for (const [name, url] of pending) decode(name, url);
  pending.length = 0;
  if (audio.wanted) playMusic(audio.wanted, true);
}

const pending = [];
const raw = {};
export function loadSounds(map) {
  for (const [name, url] of Object.entries(map)) {
    raw[name] = fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    if (ctx) decode(name, url); else pending.push([name, url]);
  }
}
function decode(name) {
  raw[name].then(ab => {
    if (!ab) return;
    ctx.decodeAudioData(ab.slice(0), b => {
      buffers[name] = b;
      if (audio.wanted === name && currentName !== name) playMusic(name, true, audio.loop);
      if (name === audio.wantAmbience && !ambience) playAmbience(name);
    }, () => {});
  });
}

export function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(audio.muted ? 0 : 1, t, 0.02);
  musicGain.gain.setTargetAtTime(audio.musicOn ? 0.55 : 0, t, 0.05);
  sfxGain.gain.setTargetAtTime(audio.sfxOn ? 0.8 : 0, t, 0.02);
}

const lastPlayed = {};
export function sfx(name, { vol = 1, rate = 1, throttle = 40 } = {}) {
  if (!ctx || !buffers[name] || audio.muted || !audio.sfxOn) return;
  const now = performance.now();
  if (lastPlayed[name] && now - lastPlayed[name] < throttle) return;
  lastPlayed[name] = now;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g); g.connect(sfxGain);
  src.start();
}

let ambience = null;
export function playAmbience(name) {
  audio.wantAmbience = name;
  if (!ctx || !buffers[name] || ambience) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name]; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0.35;
  src.connect(g); g.connect(sfxGain); src.start();
  ambience = { src, g };
}
export function stopAmbience() {
  audio.wantAmbience = null;
  if (!ambience) return;
  const a = ambience; ambience = null;
  a.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  setTimeout(() => { try { a.src.stop(); } catch (e) {} }, 800);
}

export function playMusic(name, force = false, loop = true) {
  audio.wanted = name; audio.loop = loop;
  if (!ctx) return;
  if (currentName === name && !force && current) return;
  stopMusic(0.6);
  if (!buffers[name]) return;   // starts when decoded
  const src = ctx.createBufferSource();
  src.buffer = buffers[name]; src.loop = audio.loop !== false;
  if (src.loop) { const t = trimInfo(buffers[name]); src.loopStart = t.start; src.loopEnd = t.end; }
  const g = ctx.createGain(); g.gain.value = 0;
  g.gain.setTargetAtTime(1, ctx.currentTime, src.loop ? 0.3 : 0.01);
  src.connect(g); g.connect(musicGain); src.start();
  current = { src, g }; currentName = name;
  audio.musicStartedAt = ctx.currentTime;
}

export function stopMusic(fade = 0.4) {
  if (!current || !ctx) { current = null; currentName = null; return; }
  const c = current; current = null; currentName = null;
  c.g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
  setTimeout(() => { try { c.src.stop(); } catch (e) {} }, fade * 1000 + 300);
}

export function duckMusic(on) {
  if (!ctx) return;
  musicGain.gain.setTargetAtTime(!audio.musicOn ? 0 : (on ? 0.12 : 0.55), ctx.currentTime, 0.1);
}

// Skip leading/trailing near-silence so loops don't stall at the seam.
const trimCache = new WeakMap();
function trimInfo(b) {
  if (trimCache.has(b)) return trimCache.get(b);
  const d = b.getChannelData(0), sr = b.sampleRate, th = 0.01;
  let s = 0, e = d.length - 1;
  while (s < d.length && Math.abs(d[s]) < th) s++;
  while (e > s && Math.abs(d[e]) < th) e--;
  // fade-out tails: cut the last 0.4 s where the level drops off
  const r = { start: s / sr, end: Math.max(s / sr + 1, e / sr - 0.05) };
  trimCache.set(b, r);
  return r;
}
export function musicTime() { return ctx && audio.musicStartedAt !== undefined ? ctx.currentTime - audio.musicStartedAt : null; }
export function hasBuffer(name) { return !!buffers[name]; }

// One input layer: keyboard, touch thumbstick and buttons, all turned into the same actions.
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'act', KeyE: 'act', Enter: 'act', NumpadEnter: 'act',
  ShiftLeft: 'power', ShiftRight: 'power', KeyQ: 'power',
  Tab: 'map', KeyN: 'map', Escape: 'back', KeyP: 'pause', KeyM: 'mute',
  Digit1: 'one', Digit2: 'two', Digit3: 'three', KeyC: 'collection',
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Enter']);

export const input = {
  held: new Set(),
  pressed: new Set(),     // latched "just pressed", cleared after each update reads them
  stick: { active: false, x: 0, y: 0, ox: 0, oy: 0, cx: 0, cy: 0, id: null },
  touchMode: false,
  anyKey: false,
  onFirstInput: null,
  pointerTaps: [],        // {x,y} in CSS px, consumed by UI
  press(a) { this.pressed.add(a); },
  isDown(a) { return this.held.has(a); },
  was(a) { return this.pressed.has(a); },
  consume(a) { const had = this.pressed.has(a); this.pressed.delete(a); return had; },
  endFrame(clearPressed = true) { if (clearPressed) { this.pressed.clear(); this.anyKey = false; } this.pointerTaps.length = 0; },
  axis() {
    let x = 0, y = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.held.has('up')) y -= 1;
    if (this.held.has('down')) y += 1;
    if (this.stick.active) {
      const dx = this.stick.x, dy = this.stick.y;
      const m = Math.hypot(dx, dy);
      if (m > 0.2) { x = dx / Math.max(1, m); y = dy / Math.max(1, m); }
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  },
};

function first() {
  if (input.onFirstInput) { const f = input.onFirstInput; input.onFirstInput = null; f(); }
}

export function initInput(canvas, buttons) {
  addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (PREVENT.has(e.code)) e.preventDefault();
    first();
    input.anyKey = true;
    if (input.touchMode && !e.repeat) setTouchMode(false);
    if (!a) return;
    if (!e.repeat) input.pressed.add(a);
    input.held.add(a);
  });
  addEventListener('keyup', e => {
    const a = KEYMAP[e.code];
    if (a) input.held.delete(a);
  });
  addEventListener('blur', () => { input.held.clear(); input.stick.active = false; });

  // Pointer: taps for UI, thumbstick on the left part of the screen when in touch mode.
  canvas.addEventListener('pointerdown', e => {
    first();
    if (e.pointerType === 'touch' && !input.touchMode) setTouchMode(true);
    if (input.touchMode && input.stickEnabled && e.clientX < innerWidth * 0.45 && !input.stick.active) {
      const s = input.stick;
      s.active = true; s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY; s.cx = e.clientX; s.cy = e.clientY; s.x = 0; s.y = 0;
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    input.pointerTaps.push({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    const s = input.stick;
    if (s.active && e.pointerId === s.id) {
      const R = 46;
      let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
      const m = Math.hypot(dx, dy);
      if (m > R) { s.ox += dx * (1 - R / m); s.oy += dy * (1 - R / m); dx = e.clientX - s.ox; dy = e.clientY - s.oy; }
      s.cx = e.clientX; s.cy = e.clientY; s.x = dx / R; s.y = dy / R;
    }
  });
  const endStick = e => { if (input.stick.active && e.pointerId === input.stick.id) { input.stick.active = false; input.stick.x = input.stick.y = 0; } };
  canvas.addEventListener('pointerup', endStick);
  canvas.addEventListener('pointercancel', endStick);
  for (const [el, action] of buttons) {
    el.addEventListener('pointerdown', e => {
      first();
      if (e.pointerType === 'touch' && !input.touchMode) setTouchMode(true);
      input.pressed.add(action); input.held.add(action);
      el.classList.add('down');
      e.preventDefault(); e.stopPropagation();
    });
    const up = e => { input.held.delete(action); el.classList.remove('down'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  }
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'dblclick', 'contextmenu'])
    document.addEventListener(ev, e => { if (e.target.closest?.('canvas, .tbtn, #touch')) e.preventDefault(); }, { passive: false });
  if (matchMedia('(pointer: coarse)').matches) setTouchMode(true);
}

export function setTouchMode(on) {
  input.touchMode = on;
  document.body.classList.toggle('touch', on);
}

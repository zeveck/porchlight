// Progress saved in localStorage as small, versioned JSON.
const KEY = 'porchlight-save';
const VERSION = 1;

export function freshSave() {
  return {
    v: VERSION,
    wardrobe: ['spooky-white', 'critter-black', 'hero-red'],
    jacks: [],              // household ids whose jack you own
    clues: {},              // hid -> { color: true }
    nights: {},             // n -> { cleared, best, stars }
    unlocked: 1,
    runs: 0,
    finaleDone: false,
    settings: { music: true, sfx: true, muted: false },
    seenHowTo: false,
    firstDone: false,
    lifetime: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return freshSave();
    // future versions: migrate here instead of resetting (only v1 exists so far)
    if (s.v !== VERSION) s.v = VERSION;
    for (const k of ['wardrobe', 'jacks']) if (!Array.isArray(s[k])) s[k] = freshSave()[k];
    s.wardrobe = s.wardrobe.filter(x => typeof x === 'string');
    if (!s.wardrobe.length) s.wardrobe = freshSave().wardrobe;
    for (const k of ['clues', 'nights']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
    return Object.assign(freshSave(), s, { settings: Object.assign(freshSave().settings, s.settings || {}) });
  } catch (e) {
    return freshSave();
  }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage full or blocked: keep playing */ }
}

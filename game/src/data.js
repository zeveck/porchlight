// Costumes (5 kinds x 10 colors), households, nights.
export const KINDS = ['spooky', 'critter', 'hero', 'magic', 'snack'];
export const KIND_NAMES = { spooky: 'Spooky', critter: 'Critter', hero: 'Hero', magic: 'Magic', snack: 'Snack' };
export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black', 'brown'];
export const COLOR_HEX = {
  red: '#e8423f', orange: '#f08a24', yellow: '#ffd25e', green: '#5cc25a', blue: '#4f8fe8',
  purple: '#a564e0', pink: '#f27fc2', white: '#f2ead8', black: '#3a3248', brown: '#9a6a43',
};

const NAMES = {
  spooky: ['Little Devil', 'Pumpkinhead', "Will-o'-Wisp", 'Zombie', 'Banshee', 'Witch', 'Sugar Skeleton', 'Ghost', 'Vampire', 'Werewolf'],
  critter: ['Ladybug', 'Fox', 'Bumblebee', 'Frog', 'Bluebird', 'Octopus', 'Flamingo', 'Bunny', 'Black Cat', 'Owl'],
  hero: ['Super Kid', 'Astronaut', 'Lightning Racer', 'Forest Archer', 'Knight', 'Space Ranger', 'Pop Star', 'Lab Scientist', 'Ninja', 'Cowboy'],
  magic: ['Dragon', 'Phoenix', 'Genie', 'Forest Elf', 'Mermaid', 'Wizard', 'Fairy', 'Unicorn', 'Shadow Mage', 'Gnome'],
  snack: ['Strawberry', 'Candy Corn', 'Banana', 'Pickle', 'Blueberry', 'Grape Popsicle', 'Cupcake', 'Marshmallow', 'Burnt Toast', 'Chocolate Bar'],
};
const POWERS_TABLE = {
  spooky: ['boo', 'boo', 'float', 'boo', 'boo', 'float', 'boo', 'float', 'boo', 'boo'],
  critter: ['float', 'sniff', 'float', 'sniff', 'float', 'sniff', 'sniff', 'sniff', 'sniff', 'sniff'],
  hero: ['float', 'dash', 'dash', 'dash', 'dash', 'dash', 'charm', 'sniff', 'dash', 'dash'],
  magic: ['float', 'float', 'charm', 'charm', 'charm', 'charm', 'float', 'charm', 'boo', 'charm'],
  snack: Array(10).fill('rush'),
};

export const POWERS = {
  dash:  { name: 'Dash',       desc: 'A quick burst of speed.',                     cd: 4,  price: 12 },
  float: { name: 'Float',      desc: 'Float over hedges, fences and yards.',         cd: 8,  price: 20 },
  boo:   { name: 'Boo!',       desc: 'Nearby kids freeze; pranksters run.',          cd: 10, price: 12 },
  sniff: { name: 'Sniff',      desc: 'Reveals the colors nearby houses love.',       cd: 15, price: 8 },
  charm: { name: 'Charm',      desc: 'Your next swap costs half.',                   cd: 20, price: 15 },
  rush:  { name: 'Sugar Rush', desc: 'Double candy from close and plain knocks.',    cd: 30, price: 8 },
};

export const COSTUMES = [];
KINDS.forEach((kind, ki) => COLORS.forEach((color, ci) => {
  const power = POWERS_TABLE[kind][ci];
  COSTUMES.push({ id: `${kind}-${color}`, kind, color, ki, ci, idx: ki * 10 + ci, name: NAMES[kind][ci], power, price: POWERS[power].price });
}));
export const COSTUME = Object.fromEntries(COSTUMES.map(c => [c.id, c]));

// 50 households, one per costume. Shuffled once with a fixed seed so the pairing feels arbitrary.
const FAMILY = ['Moonbeam', 'Hollowell', 'Crowley', 'Pepperidge', 'Ashgrove', 'Bramble', 'Nightingale', 'Fennimore',
  'Gourdon', 'Thistlewood', 'Marrow', 'Quill', 'Cobweb', 'Duskin', 'Lanternby', 'Pumpernickel', 'Wicker', 'Oakhart',
  'Sprocket', 'Vandersnoot', 'Grimsby', 'Featherstone', 'Barnaby', 'Candlewick', 'Mossberry', 'Rattlebone', 'Tumble',
  'Whistler', 'Hazelnut', 'Butterfield', 'Plumtree', 'Shiverton', 'Gloaming', 'Cinders', 'Bixby', 'Starling', 'Muddle',
  'Ravensworth', 'Toffee', 'Brightwater', 'Puddington', 'Elderberry', 'Snickett', 'Hobble', 'Juniper', 'Mapleton',
  'Creakley', 'Fogg', 'Spindle', 'Honeycutt'];

function lcg(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; }
const r = lcg(1031);
const order = COSTUMES.map(c => c.id);
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

export const HOUSEHOLDS = FAMILY.map((fam, i) => {
  const fav = COSTUME[order[i]];
  const others = KINDS.filter(k => k !== fav.kind);
  const dislike = others[Math.floor(r() * others.length)];
  let dislike2 = others.filter(k => k !== dislike)[Math.floor(r() * 3)];
  const otherColors = COLORS.filter(c => c !== fav.color);
  const d1 = otherColors.splice(Math.floor(r() * otherColors.length), 1)[0];
  const d2 = otherColors[Math.floor(r() * otherColors.length)];
  const candidates = [fav.color, d1, d2].sort((a, b) => COLORS.indexOf(a) - COLORS.indexOf(b));
  return {
    id: i, name: `the ${fam}s`, family: fam, fav: fav.id, dislike, dislike2, candidates,
    style: Math.floor(r() * 4), tint: Math.floor(r() * 6),
    face: { eyes: i % 5, mouth: Math.floor(i / 5) % 10, brow: Math.floor(r() * 3) },
  };
});
export const HOUSEHOLD_BY_FAV = Object.fromEntries(HOUSEHOLDS.map(h => [h.fav, h]));

export const NIGHTS = [
  { n: 1, name: 'Porch Lights',      cols: 4, rows: 3, candy: 14, need: 10, kids: 16, music: 'night-a' },
  { n: 2, name: 'Leaf Piles',        cols: 5, rows: 3, candy: 17, need: 12, kids: 20, music: 'night-a' },
  { n: 3, name: 'Fog Rolls In',      cols: 5, rows: 4, candy: 20, need: 14, kids: 24, music: 'night-a', fog: true },
  { n: 4, name: 'Hollow Lane',       cols: 6, rows: 4, candy: 24, need: 17, kids: 28, music: 'night-b', pranksters: 2 },
  { n: 5, name: 'Full Moon',         cols: 6, rows: 5, candy: 28, need: 20, kids: 32, music: 'night-b', kidSpeedMul: 1.2 },
  { n: 6, name: 'The Witching Hour', cols: 7, rows: 5, candy: 32, need: 24, kids: 36, music: 'night-b', pranksters: 4, picky: 3 },
  { n: 7, name: 'Midnight Market',   cols: 7, rows: 6, candy: 38, need: 28, kids: 40, music: 'night-b', pranksters: 4, picky: 3, priceMul: 1.3 },
  { n: 8, name: 'The Big Night',     cols: 7, rows: 5, candy: 50, need: 50, kids: 50, music: 'night-b', finale: true },
];

// Finale track timing (measured from the generated track; see design/ASSETS.md).
export const FINALE = { bpm: 116, offset: 0.04 };   // measured: 116.0 BPM, first beat at 0.04 s

export const PLAYER_SPEED = 5 * 16;   // px per second
export const KID_SPEED = 2.2 * 16;
export const START_CANDY = 20;
export const REFILL = 25;

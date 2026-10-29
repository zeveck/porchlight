// Town generation: blocks of house lots facing south onto east-west streets,
// north-south streets between block columns, parks, a plaza and your home.
import { makeRng } from './rng.js';
import { HOUSEHOLDS, COSTUME, COSTUMES, HOUSEHOLD_BY_FAV, KINDS, COLORS } from './data.js';

export const T = { GRASS: 0, ROAD: 1, WALK: 2, PATH: 3, HEDGE: 4, HOUSE: 5, TREE: 6, PLAZA: 7, FENCE: 8, WATER: 9, YARD: 10, FOREST: 11 };
export const SOLID = new Set([T.HEDGE, T.HOUSE, T.TREE, T.FENCE, T.WATER, T.FOREST]);
export const TILE = 16;
const LOT_W = 5, BLOCK_H = 7, STREET = 4, MARGIN = 3;

export function generateTown(night, save, seed) {
  const rng = makeRng(seed);
  // Column widths in lots (3 or 4), per column.
  const colLots = Array.from({ length: night.cols }, () => rng.int(3, 4));
  const colX = [];
  let x = MARGIN + STREET;
  for (const n of colLots) { colX.push(x); x += n * LOT_W + STREET; }
  const W = x + MARGIN - STREET + STREET;
  const H = MARGIN * 2 + STREET + night.rows * (BLOCK_H + STREET);
  const grid = new Uint8Array(W * H).fill(T.GRASS);
  const deco = [];      // {type, x, y} props in tile coords (trees drawn as sprites, lamps, tombstones)
  const set = (tx, ty, v) => { if (tx >= 0 && ty >= 0 && tx < W && ty < H) grid[ty * W + tx] = v; };
  const get = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? T.FOREST : grid[ty * W + tx];

  // Border forest.
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++)
    if (tx < MARGIN || ty < MARGIN || tx >= W - MARGIN || ty >= H - MARGIN) set(tx, ty, T.FOREST);

  const streetRowY = r => MARGIN + r * (BLOCK_H + STREET);           // top of horizontal street r (0..rows)
  const blockY = r => streetRowY(r) + STREET;                        // top of block row r
  const fillStreetH = (y0, x0, x1) => { for (let tx = x0; tx < x1; tx++) { set(tx, y0, T.WALK); set(tx, y0 + 1, T.ROAD); set(tx, y0 + 2, T.ROAD); set(tx, y0 + 3, T.WALK); } };
  const fillStreetV = (x0, y0, y1) => { for (let ty = y0; ty < y1; ty++) { const top = get(x0, ty); set(x0, ty, T.WALK); set(x0 + 1, ty, T.ROAD); set(x0 + 2, ty, T.ROAD); set(x0 + 3, ty, T.WALK); } };

  for (let r = 0; r <= night.rows; r++) fillStreetH(streetRowY(r), MARGIN, W - MARGIN);
  // Vertical streets: always at the outer edges; inner ones can be skipped per block row for variety.
  const vStreetX = [MARGIN, ...colX.slice(1).map(cx => cx - STREET), W - MARGIN - STREET];
  const skipped = new Set();
  for (let r = 0; r < night.rows; r++) {
    for (let i = 0; i < vStreetX.length; i++) {
      const inner = i > 0 && i < vStreetX.length - 1;
      if (inner && rng.chance(0.22)) { skipped.add(`${r},${i}`); continue; }
      fillStreetV(vStreetX[i], blockY(r), blockY(r) + BLOCK_H);
    }
  }
  // Re-draw horizontal street centers over crossings so roads look continuous.
  for (let r = 0; r <= night.rows; r++) { const y0 = streetRowY(r); for (let tx = MARGIN; tx < W - MARGIN; tx++) { set(tx, y0 + 1, T.ROAD); set(tx, y0 + 2, T.ROAD); } }
  for (let r = 0; r < night.rows; r++) for (let i = 0; i < vStreetX.length; i++) {
    if (skipped.has(`${r},${i}`)) continue;
    for (const y0 of [streetRowY(r), streetRowY(r + 1)]) for (let k = 0; k < 4; k++) { set(vStreetX[i] + 1, y0 + k, T.ROAD); set(vStreetX[i] + 2, y0 + k, T.ROAD); }
  }

  // Lots: each block row r, column c. A skipped street between columns becomes extra lots.
  const lots = [];
  for (let r = 0; r < night.rows; r++) {
    const by = blockY(r);
    for (let i = 0; i < vStreetX.length - 1; i++) {
      const x0 = vStreetX[i] + STREET;
      let x1 = vStreetX[i + 1];
      // A skipped street to the right: lots continue across it (fill the street width with a lot-ish gap of hedge + yard).
      for (let tx = x0; tx < x1; tx++) set(tx, by, T.HEDGE);
      const n = Math.floor((x1 - x0) / LOT_W);
      for (let k = 0; k < n; k++) lots.push({ x: x0 + k * LOT_W, y: by, r, c: i });
      if (skipped.has(`${r},${i + 1}`)) {
        // fill the merged street gap: hedge top, then a little garden (grass + tree)
        const gx = x1;
        for (let tx = gx; tx < gx + STREET; tx++) { set(tx, by, T.HEDGE); for (let ty = by + 1; ty < by + BLOCK_H; ty++) set(tx, ty, T.GRASS); }
        deco.push({ type: 'tree', x: gx + 1, y: by + 3 });
        set(gx + 1, by + 3, T.TREE); set(gx + 2, by + 3, T.TREE);
      }
    }
  }

  // Plaza (finale venue) near the middle; home lot next to it.
  const midR = Math.floor((night.rows - 1) / 2);
  const rowLots = lots.filter(l => l.r === midR);
  const midIdx = Math.floor(rowLots.length / 2);
  const plazaLots = [rowLots[midIdx - 1], rowLots[midIdx]].filter(Boolean);
  const homeLot = rowLots[midIdx + 1] || rowLots[midIdx - 2];
  for (const l of plazaLots) { l.kind = 'plaza'; for (let tx = l.x; tx < l.x + LOT_W; tx++) for (let ty = l.y; ty < l.y + BLOCK_H; ty++) set(tx, ty, T.PLAZA); }
  const plaza = { x: plazaLots[0].x, y: plazaLots[0].y, w: plazaLots.length * LOT_W, h: BLOCK_H };
  deco.push({ type: 'lamp', x: plaza.x, y: plaza.y + 1 }, { type: 'lamp', x: plaza.x + plaza.w - 1, y: plaza.y + 1 });
  homeLot.kind = 'home';

  // Parks and graveyards on ~12% of other lots.
  const free = lots.filter(l => !l.kind);
  rng.shuffle(free);
  const nPark = Math.round(lots.length * 0.12);
  for (let i = 0; i < nPark && i < free.length; i++) {
    const l = free[i];
    l.kind = rng.chance(0.4) ? 'grave' : 'park';
    for (let ty = l.y + 1; ty < l.y + BLOCK_H; ty++) for (let tx = l.x; tx < l.x + LOT_W; tx++) set(tx, ty, T.GRASS);
    if (l.kind === 'park') {
      const tx = l.x + rng.int(0, 3), ty = l.y + rng.int(2, 4);
      set(tx, ty, T.TREE); deco.push({ type: rng.chance(0.5) ? 'tree' : 'oak', x: tx, y: ty });
      if (rng.chance(0.6)) { const tx2 = l.x + rng.int(0, 4), ty2 = l.y + 2; if (get(tx2, ty2) === T.GRASS) { set(tx2, ty2, T.TREE); deco.push({ type: 'bush', x: tx2, y: ty2 }); } }
    } else {
      for (let k = 0; k < 4; k++) { const tx = l.x + (k % 2) * 2 + 1, ty = l.y + 2 + Math.floor(k / 2) * 2; deco.push({ type: 'tomb', x: tx, y: ty }); set(tx, ty, T.FENCE); }
      deco.push({ type: 'deadtree', x: l.x + 4, y: l.y + 2 }); set(l.x + 4, l.y + 2, T.TREE);
    }
  }

  // Houses on remaining lots (plus home).
  const houseLots = lots.filter(l => !l.kind || l.kind === 'home');
  for (const l of houseLots) {
    if (!l.kind) l.kind = 'house';
    for (let ty = l.y + 1; ty < l.y + 5; ty++) for (let tx = l.x; tx < l.x + LOT_W; tx++) set(tx, ty, T.HOUSE);
    for (let ty = l.y + 5; ty < l.y + 7; ty++) for (let tx = l.x; tx < l.x + LOT_W; tx++) set(tx, ty, T.YARD);
    set(l.x + 2, l.y + 5, T.PATH); set(l.x + 2, l.y + 6, T.PATH);
    // little fence between neighbouring yards: the rightmost yard column, top row only
    l.door = { x: l.x + 2.5, y: l.y + 5.5 };          // tile coords of the knock spot (center)
    l.side = { x: l.x + 1.2, y: l.y + 6.3 };          // where visiting kids wait
    l.pumpkin = { x: l.x + 3.7, y: l.y + 5.7 };
  }

  // Street lamps along sidewalks.
  for (let r = 0; r <= night.rows; r++) for (let tx = MARGIN + 6; tx < W - MARGIN; tx += 14) {
    const ty = streetRowY(r) + 3;
    if (get(tx, ty) === T.WALK && get(tx, ty + 1) !== T.PATH) deco.push({ type: 'lamp', x: tx, y: ty });
  }

  // ---- Households: which take part, which have candy, which costumes are worn ----
  const houses = houseLots.filter(l => l.kind === 'house');
  rng.shuffle(houses);
  const owned = new Set(save.wardrobe);
  const jacks = new Set(save.jacks);
  const nCandy = Math.min(night.candy, houses.length, 50);
  if (houses.length < nCandy) throw new Error('not enough house lots');
  const home = homeLot;
  const distHome = l => Math.abs(l.x - home.x) + Math.abs(l.y - home.y) * 2;

  let chosen;   // household ids for candy houses
  const all = HOUSEHOLDS.map(h => h.id);
  let tutorialHid = null;
  if (night.finale) chosen = all.slice();
  else {
    const unlit = rng.shuffle(all.filter(id => !jacks.has(id)));
    const lit = rng.shuffle(all.filter(id => jacks.has(id)));
    const minNew = Math.ceil(0.4 * night.need);
    let knownCap = unlit.length >= minNew ? night.need - minNew : nCandy;
    knownCap = Math.max(knownCap, nCandy - unlit.length);
    const nKnown = Math.min(lit.length, knownCap, nCandy);
    chosen = [...lit.slice(0, nKnown), ...unlit.slice(0, nCandy - nKnown)];
    if (night.n === 1 && !save.firstDone) {
      // Tutorial: the Ghost-loving house, plus one that loves a Spooky or white costume you don't own.
      const ghostH = HOUSEHOLD_BY_FAV['spooky-white'].id;
      const catH = HOUSEHOLD_BY_FAV['critter-black'].id;
      const tut = HOUSEHOLDS.filter(h => { const c = COSTUME[h.fav]; return !owned.has(h.fav) && (c.kind === 'spooky' || c.color === 'white') && c.power !== 'float'; });
      tutorialHid = rng.pick(tut).id;
      for (const hid of [ghostH, catH, tutorialHid]) if (!chosen.includes(hid)) {
        const k = chosen.findIndex(id => id !== ghostH && id !== catH && id !== tutorialHid);
        chosen[k] = hid;
      }
    } else if (night.n === 1) {
      for (const cid of ['spooky-white', 'critter-black']) {
        const hid = HOUSEHOLD_BY_FAV[cid].id;
        if (owned.has(cid) && !chosen.includes(hid)) chosen[chosen.findIndex(id => !HOUSEHOLDS[id].fav.startsWith('spooky-white') && HOUSEHOLDS[id].fav !== 'critter-black')] = hid;
      }
    }
  }

  // Solvable households: known ones (instant switch) and owned favorites count; then guarantee kids.
  const target = night.finale ? chosen.length : Math.min(night.need + 2, chosen.length);
  let solvable = chosen.filter(id => jacks.has(id) || owned.has(HOUSEHOLDS[id].fav));
  const kidCostumes = [];
  const needed = [];   // [costume, hid] for kids that must exist
  const rest = rng.shuffle(chosen.filter(id => !solvable.includes(id)));
  if (tutorialHid !== null) { rest.splice(rest.indexOf(tutorialHid), 1); rest.unshift(tutorialHid); }
  for (const hid of rest) {
    if (solvable.length >= target && !night.finale) break;
    needed.push([HOUSEHOLDS[hid].fav, hid]); solvable.push(hid);
  }
  if (night.finale) {
    const have = new Set(needed.map(n => n[0]));
    for (const c of COSTUMES) if (!have.has(c.id)) kidCostumes.push(c.id);
  }
  if (solvable.length < Math.min(target, chosen.length)) throw new Error('not solvable');
  // Decoys: distinct and not owned on nights 1-2; a few duplicates later.
  const used = new Set([...needed.map(n => n[0]), ...kidCostumes]);
  const pool = rng.shuffle(COSTUMES.map(c => c.id).filter(id => !used.has(id) && (night.n > 2 || !owned.has(id))));
  while (needed.length + kidCostumes.length < night.kids) {
    if (night.n > 2 && rng.chance(0.12) && kidCostumes.length) kidCostumes.push(rng.pick(kidCostumes));
    else if (pool.length) kidCostumes.push(pool.pop());
    else kidCostumes.push(rng.pick(COSTUMES).id);
  }

  // Assign households to lots. Night 1 tutorial: Ghost house nearest home, tutorial house within 2 lots.
  houses.sort((a, b) => distHome(a) - distHome(b));
  const pinned = [];
  if (night.n === 1) {
    const ghostH = HOUSEHOLD_BY_FAV['spooky-white'].id;
    pinned.push(ghostH);
    if (tutorialHid !== null) pinned.push(tutorialHid);
  }
  const order = [...pinned, ...rng.shuffle(chosen.filter(id => !pinned.includes(id)))];
  const lotsForCandy = [...houses.slice(0, pinned.length), ...rng.shuffle(houses.slice(pinned.length))];
  const candyLotIds = new Set();
  order.forEach((hid, i) => {
    const l = lotsForCandy[i];
    const h = HOUSEHOLDS[hid];
    l.hid = h.id; l.candy = true; l.style = h.style; l.tint = h.tint; l.known = jacks.has(h.id);
    candyLotIds.add(l);
  });
  for (const l of houses) {
    if (!candyLotIds.has(l)) { l.candy = false; l.style = rng.int(0, 3); l.tint = rng.int(0, 5); }
    l.lit = false; l.refill = 0; l.picky = false;
  }
  if (night.picky) rng.shuffle(houses.filter(l => l.candy)).slice(0, night.picky).forEach(l => { l.picky = true; });
  home.style = 1; home.tint = 6;

  // Kid spawns: street tiles. Needed kids on night 1 (tutorial) and the finale spawn near their house.
  const streetTiles = [];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (grid[ty * W + tx] === T.WALK) streetTiles.push([tx, ty]);
  const lotOf = hid => houses.find(l => l.hid === hid);
  const kids = [];
  const nearSpawn = (lot, r) => {
    const c = streetTiles.filter(([x, y]) => Math.abs(x - lot.door.x) + Math.abs(y - lot.door.y) <= r && Math.abs(x - home.x - 2) + Math.abs(y - home.y - 7) > 4);
    return c.length ? rng.pick(c) : rng.pick(streetTiles);
  };
  const farSpawn = () => {
    let p, tries = 0;
    do { p = rng.pick(streetTiles); tries++; } while (tries < 50 && Math.abs(p[0] - home.x) + Math.abs(p[1] - home.y) < 10);
    return p;
  };
  for (const [cid, hid] of needed) {
    const lot = lotOf(hid);
    const sp = (night.finale || hid === tutorialHid) ? nearSpawn(lot, hid === tutorialHid ? 12 : 15) : farSpawn();
    kids.push({ costume: cid, spawn: sp, forHid: hid });
  }
  for (const cid of kidCostumes) kids.push({ costume: cid, spawn: farSpawn() });
  rng.shuffle(kids);
  if (night.pranksters) kids.filter(k => k.forHid === undefined).slice(0, night.pranksters).forEach(k => { k.prankster = true; });

  const town = {
    W, H, grid, deco, lots, houses: houseLots, candyHouses: houses.filter(l => l.candy), home, plaza,
    kids, seed, night, tutorialHid, streetTiles,
    get, isSolid: (tx, ty) => SOLID.has(get(tx, ty)),
    homeSpawn: { x: home.x + 2.5, y: home.y + 7.6 },
  };
  town.spawns = kids.map(k => k.spawn);
  if (!checkReachable(town)) throw new Error('unreachable');
  return town;
}

export function generateTownSafe(night, save, seed) {
  for (let i = 0; i < 20; i++) {
    try { return generateTown(night, save, seed + i); } catch (e) { /* try the next seed */ }
  }
  return null;
}

// BFS over walkable tiles. Returns a list of [tx, ty] from start to goal (inclusive), or null.
export function findPath(town, sx, sy, gx, gy, maxNodes = 40000) {
  const { W, H } = town;
  sx |= 0; sy |= 0; gx |= 0; gy |= 0;
  if (town.isSolid(gx, gy)) return null;
  const prev = new Int32Array(W * H).fill(-1);
  const start = sy * W + sx, goal = gy * W + gx;
  const q = [start]; prev[start] = start;
  let head = 0;
  while (head < q.length && head < maxNodes) {
    const cur = q[head++];
    if (cur === goal) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (prev[ni] !== -1 || SOLID.has(town.grid[ni])) continue;
      prev[ni] = cur; q.push(ni);
    }
  }
  if (prev[goal] === -1) return null;
  const path = [];
  for (let c = goal; c !== start; c = prev[c]) path.push([c % W, (c / W) | 0]);
  path.push([sx, sy]);
  return path.reverse();
}

// Every door and kid spawn must be reachable from home.
export function checkReachable(town) {
  const { W, H } = town;
  const seen = new Uint8Array(W * H);
  const s = Math.floor(town.homeSpawn.y) * W + Math.floor(town.homeSpawn.x);
  const q = [s]; seen[s] = 1;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ni] || SOLID.has(town.grid[ni])) continue;
      seen[ni] = 1; q.push(ni);
    }
  }
  for (const l of town.houses) if (!seen[Math.floor(l.door.y) * W + Math.floor(l.door.x)]) return false;
  for (const [x, y] of town.spawns) if (!seen[y * W + x]) return false;
  return true;
}

# Porchlight

*Match the costume. Light the jack.*

## Pitch

You're a kid on Halloween night in a big, sprawling pixel-art neighborhood. Every house with
a pumpkin in the yard loves one costume above all others. Read the sign, knock, narrow down
what they want, then find (and bribe) the kid wearing it. Wear the right costume to the
door and the pumpkin bursts into a glowing jack-o'-lantern for your collection. It's a cozy
deduction-and-trading puzzle with a growing wardrobe of 50 costumes, each with a playful
power, and it ends with the whole neighborhood dancing with you in the plaza.

## Settings

- Platform: both (desktop and phone). Landscape preferred; portrait also works (the view shows more height).
- Target: web (plain HTML + ES modules, no build step)
- Scope: medium (content-heavy: 50 costumes are made 10 to a sheet)
- Budget: $20 for generated art and audio
- Tools available: imagegen2 + anim8gen (OpenAI), nanogen (Gemini), audiogen (ElevenLabs, plan unknown), Pillow, playwright-cli
- Decisions made on the player's behalf:
  - 50 costumes = 5 **kinds** (Spooky, Critter, Hero, Magic, Snack) × 10 **colors** (red, orange, yellow, green, blue, purple, pink, white, black, brown). Every costume is a unique kind + color pair, so a house's taste is two clues.
  - 50 **households** persist across nights, one per costume (each loves exactly one). Jack collection = 50 jacks.
  - "Costumes repeat a bit": from night 3 on, two or three kids may wear the same costume. Recolors are *not* used, since color is part of a costume's identity.
  - Swapping: you pay candy, and you and the kid trade outfits (they wear your old one). Every costume you ever wear stays in your wardrobe, so a swap never costs you a costume, only candy.
  - No losing: a night can always be finished; the challenge is finishing with the most candy kept.
  - Your bag resets to 20 candy each night (so every night's score is comparable); all candy you keep adds to a lifetime haul shown in the finale.
  - Costumes are single drawn poses animated in code (bob, waddle, squash, flip), not generated walk cycles.

## The player's fantasy

The kid who figures out the whole neighborhood: who knows that the Moonbeams on the corner
melt for a purple Wizard, who sweet-talks the Ninja kid out of his outfit for a handful of
candy, and who leaves a trail of glowing jack-o'-lanterns behind them.

## Core loop

- **10 seconds:** walk down the sidewalk (5 tiles/s), glance at pumpkin signs and kids' badges,
  step up to a door and knock, watch the candy fly and read the reaction.
- **1 minute:** spot a house's kind sign (a paw: it loves a Critter), knock in your Ghost: "Cute!"
  and three color dots appear on the ribbon (pink, orange or brown). You remember a Flamingo kid
  two streets back: pink is a candidate. Sniff, or knock again in something pink to make sure, or
  gamble. Chase her down (she stops and turns to you), bribe her for 8 candy, go back and light the jack.
- **Session:** each night needs a target number of jacks. Clearing a night unlocks the next
  (bigger town, more houses, more kids, higher target). Costumes, jacks and clues stay forever,
  so later nights are faster in familiar places and harder in new ones, building to the final
  night where all 50 costumes meet all 50 houses.
- **The make-or-break mechanic:** knock → narrow the color → find the matching kid → swap →
  light the jack. It must be quick to read (signs, ribbons, kid badges, the map) and satisfying
  to pay off (the jack lighting moment).

## Controls

Desktop:

| Action | Keyboard | Mouse |
|---|---|---|
| Move | Arrows / WASD | — |
| Act (light, offer a swap, knock, switch, wardrobe at home, confirm) | Space / E / Enter | click dialog buttons |
| Use costume power | Shift / Q | — |
| Map | Tab / N | map button |
| Pause | Esc / P | pause button |
| Mute | M | sound button |
| Dialog choices | ←/→ or 1/2, Space to pick, Esc to back out | click |
| Skip the finale dance | Esc | skip button |

Touch (shown only on touch devices):

| Action | Touch | Where |
|---|---|---|
| Move | floating thumbstick | appears under your left thumb anywhere in the left 45% of the screen |
| Act | big round "A" button (76 px) | bottom-right, inside the safe area |
| Power | round power button (64 px) showing the power icon and cooldown ring | above-left of A |
| Map / Pause / Sound | 44 px buttons | top-right row |
| Dialog choices | tap buttons (min 48 px tall) | dialog panel, bottom-center |

**Act rules** (same on every device):
- Range: 1.4 tiles from the player's feet to a door's knock spot or a kid's feet.
- Priority when several targets are in range: (1) a candy door where you wear its favorite (light it, or revisit),
  (2) a kid (swap offer), (3) a door: known unlit jack → switch offer; home → wardrobe; other → knock.
- The selected target gets a 1-px pulsing outline, so you always see what A will do.
- Kids within 2 tiles of you stop and face you (they walk on 1.5 s after you leave). Kids visiting a
  house wait one tile beside the door, never on the knock spot.

The camera keeps the player slightly above center on touch, so thumbs never cover them.
Orientation: either; landscape is best (wider view of the street). No rotate overlay is needed.

## Structure and difficulty

Each night is a freshly generated town (seeded). Nights unlock in order and can be replayed with a new layout.

| Night | Name | Blocks (cols × rows) | Candy houses | Jacks needed | Kids | Music | Twist |
|---|---|---|---|---|---|---|---|
| 1 | Porch Lights | 4 × 3 | 14 | 10 | 16 | night-a | tutorial |
| 2 | Leaf Piles | 5 × 3 | 17 | 12 | 20 | night-a | prices, busy bowls |
| 3 | Fog Rolls In | 5 × 4 | 20 | 14 | 24 | night-a | fog |
| 4 | Hollow Lane | 6 × 4 | 24 | 17 | 28 | night-b | 2 pranksters |
| 5 | Full Moon | 6 × 5 | 28 | 20 | 32 | night-b | kids 20% faster |
| 6 | The Witching Hour | 7 × 5 | 32 | 24 | 36 | night-b | 4 pranksters, 3 picky households |
| 7 | Midnight Market | 7 × 6 | 38 | 28 | 40 | night-b | 4 pranksters, 3 picky, prices +30% |
| 8 | The Big Night (finale) | 7 × 5 | 50 | 50 | 50 | night-b, then finale | every costume |

**Town layout** (as built in `town.js`): each block row = 1 hedge row + 4 house rows + 2 yard rows
(7 tiles). Lots are 5 tiles wide; 3 to 4 lots per block column. Streets are 4 tiles (sidewalk,
road, road, sidewalk). Inner north-south street segments are skipped at random (22% each; the gap
becomes a small garden), outer ones always exist. About 12% of lots are parks or graveyards. A plaza
of 2 lots sits near the center with your home beside it. Night 1 is about 96 × 43 tiles (~30 houses);
night 7 about 160 × 76 (~125 houses); the finale about 160 × 65 (~100 houses). Houses without candy
are dark (no pumpkin, porch light off).

What's new each night:
1. Learn the loop (see "First launch"). Two of your three starter costumes are favorites of candy houses. Kids at 2.2 tiles/s.
2. More kids visit houses and empty bowls, so timing matters. Bribe prices matter now.
3. Fog: darker overlay, light pools smaller, kid badges readable within 6 tiles instead of 10. Sniff and the map matter more.
4. Pranksters: 2 kids are pranksters (purple glow); bumping into one makes you drop 3 candy. Boo! scares them off.
5. Full moon: kids move 20% faster (2.64 tiles/s), so catching them takes planning; Boo! and Charm shine.
6. More pranksters (4); 3 "picky" households dislike two kinds.
7. Market: kids' prices are 30% higher.
8. Finale: every household, every costume, 50 kids, target 50, in a slightly smaller town (7 × 5). Known jacks switch instantly, so returning players sweep. When the 50th jack lights, the finale dance starts.

**Costumes in play:** night 1 has at least 20 distinct costumes in play (worn by you or a kid, or
loved by a candy house): on nights 1 and 2 decoy kids wear distinct costumes not in your wardrobe.

Avoiding frustration:
- No timer and no losing. Bowls refill 25 s after a visit, so candy can always be earned.
- Clues persist across nights (a household's favorite never changes), on the map and the sign.
- The map (Tab) shows every candy house with its kind icon, color clue (exact or 3 dots), lit state, your home, and kids you've inspected at their last-seen spot (fading after 30 s).
- A kid wearing the favorite of a house whose color you know exactly, which is unlit and whose costume you don't own, shows a "!" bubble.
- Jacks you've earned before start the night unlit; Act at the door offers "Wear the <costume> and light it?" (free, instant; you already own it, since you wore it to light that jack).

**Finale help:** the map shows every unlit candy house and the *live* positions of kids wearing a
needed costume; when 5 or fewer jacks remain, an edge-of-screen arrow points at the nearest one.
Needed kids spawn within ~15 tiles of their houses. Time estimate: a returning player who knows
~45 of 50 jacks needs about 6 s walking + 1 s per switch (≈ 6 min) plus ~45 s per unknown house
(≈ 4 min): about 10 minutes.

**Solvability guarantee.** The generator:
1. Picks the night's candy households. While never-lit households remain, it limits known
   (previously lit) households so that at least ceil(0.4 × need) of the target must come from
   never-lit ones: known ≤ need − ceil(0.4 × need), unless there aren't enough never-lit households
   left to fill the candy count (then known ones fill the rest). *(Change from the current
   `town.js`, which only puts ≥ 40% of the target among the candy houses; with many known
   households a player could still clear on known jacks alone.)*
2. Counts known households as solvable (instant switch), then guarantees favorites for never-lit
   households, worn by at least one kid unless already in your wardrobe, until
   min(need + 2, candy houses) households are solvable. Those kids are assigned first; the rest are decoys.
3. Checks every door and kid spawn is reachable from home (flood fill), and that there are enough house
   lots for the candy count. If any check fails, `generateTown` **throws**; the caller retries with
   seed + 1, up to 20 seeds, then shows an error screen (never loops forever).

Night 1 placement: the Ghost-loving house is the nearest house to home (already in `town.js`); a
second "tutorial" household whose favorite is Spooky or white (so a Ghost knock is close) sits within
2 lots of home, and its kid spawns within 12 tiles. *(Code change: add the tutorial household.)*

## First launch

The first time you press Play you go straight into night 1 wearing Ghost (no menus). A bouncing
arrow points at the Ghost-loving house next to home. Four one-line prompts appear, each once,
at the bottom of the screen, and fade when done:
1. "Knock on the pumpkin house: press A." (lights the first jack)
2. After the close knock at the tutorial house: "That kid is wearing what they love: press A next to them."
3. After the swap: "Go back and knock!"
4. After the second jack: "Light 10 jacks to finish the night. The map shows the houses." (the target)

From the second play on, Play opens night select, then the night intro with the costume pick.

## Houses, clues and candy

Each household has: a name ("the Moonbeams"), a favorite costume (kind + color), one disliked kind
(never its favorite's kind; picky households have two), 2 decoy colors (fixed per household, for the
3-dot clue), a house style and tint, and a jack face.

Clues:
- The pumpkin's **sign** shows the favorite's kind icon (visible from afar, drawn above the night overlay).
- A **neutral or disliked knock** shows 3 candidate colors as 3 dots on the ribbon (the true color + the household's 2 decoys, in a fixed order). Knocking again in one of the candidate colors either confirms it (that's a close knock) or crosses it off.
- A **close knock** (same kind or same color) or **Sniff** reveals the exact color: the ribbon turns that color.
- Any knock shows the disliked kind(s) as a small crossed-out icon on the sign.
- Clues are saved and persist across nights.

Candy:

| Situation | Candy | Reaction |
|---|---|---|
| First lighting (wearing the favorite, jack never lit tonight) | 15, bowl full or empty; the jack lights | "PERFECT!" big candy burst |
| Known jack: instant switch | 5; the jack lights | "Welcome back!" |
| Revisit after the jack is lit | 6 if the bowl is full, else 0 | "Happy Halloween!" |
| Same kind or same color | 5 (bowl full) | "Ooh, close!" + exact color |
| Neither | 2 (bowl full) | "Cute!" + 3 color dots |
| A disliked kind | 0 | "Eww, a Snack!" (a playful raspberry) + 3 color dots |
| Any knock on an empty bowl | 0 | "All out, come back soon!" (clues still given) |

After any visit (yours or a kid's), the bowl is empty for 25 s (a refill ring over the pumpkin).

## Kids and swapping

- Kids walk the streets at 2.2 tiles/s (night 5: 2.64), visit candy-house doors for 2 s (emptying
  the bowl, waiting one tile beside the door), and wander on. On nights 4+, some are pranksters.
- Every kid wears an always-on small **badge** above the head: the kind icon on a disc of the
  costume's color (readable within ~10 tiles, 6 in fog). Within 2 tiles a slim **nameplate** adds the
  costume name and price. Act next to a kid opens the swap offer: "Trade your Ghost for my Flamingo + 8 candy?" Yes / No.
- Price tiers by power: Sugar Rush 8, Sniff 8, Dash 12, Boo! 12, Charm 15, Float 20. Night 7: +30% (rounded up).
- Starting candy 20 each night, so the first swap is affordable right away.
- After a swap you wear the new costume, the kid wears your old one, and the new costume joins your wardrobe for good.
- **Home** (porch light on, no pumpkin; you start there): Act at the door opens the wardrobe to
  change into any costume you own, for free. Walking home takes time, which is the cost.
- Score for the night = candy in your bag when you finish. Finish any time after reaching the
  target (a "Finish night" button appears, or Act at home). Stars: 1 for clearing, 2 for candy ≥ 6 × need,
  3 for candy ≥ 10 × need (tuned in play-test). Night 1 estimate: 20 start + 10 lights × 15 + ~30 from
  knocks − ~8 swaps × ~11 ≈ 110.

## Costumes (5 kinds × 10 colors)

Powers (Shift/Q or the power button; one per costume; cooldown shown as a ring; pressing during
cooldown plays "power-not-ready" and shakes the ring):
- **Dash** (Heroes): 1 s burst at 2.2× speed with afterimages. Cooldown 4 s.
- **Float** (winged and flying costumes): 3 s floating over everything except the forest border, with a
  shadow below you. If it ends over a blocked tile it extends up to 1.5 s more, then snaps to the
  nearest walkable tile (BFS). Cooldown 8 s.
- **Boo!** (most Spooky): kids within 6 tiles freeze for 4 s (easy to catch); pranksters flee. Cooldown 10 s.
- **Sniff** (most Critters): reveals the exact color of every candy house within 10 tiles and draws a
  glowing scent trail (6 s) to the nearest "!" kid. Cooldown 15 s.
- **Charm** (most Magic): kids within 8 tiles walk toward you for 4 s (hearts float up), and your next swap costs half. Cooldown 20 s.
- **Sugar Rush** (Snacks): for 15 s, +30% speed and double candy from close and neutral knocks (sparkle trail). Cooldown 30 s.

| Color | Spooky | Critter | Hero | Magic | Snack |
|---|---|---|---|---|---|
| red | Little Devil (Boo!) | Ladybug (Float) | Super Kid (Float) | Dragon (Float) | Strawberry (Sugar Rush) |
| orange | Pumpkinhead (Boo!) | Fox (Sniff) | Astronaut (Dash) | Phoenix (Float) | Candy Corn (Sugar Rush) |
| yellow | Will-o'-Wisp (Float) | Bumblebee (Float) | Lightning Racer (Dash) | Genie (Charm) | Banana (Sugar Rush) |
| green | Zombie (Boo!) | Frog (Sniff) | Forest Archer (Dash) | Forest Elf (Charm) | Pickle (Sugar Rush) |
| blue | Banshee (Boo!) | Bluebird (Float) | Knight (Dash) | Mermaid (Charm) | Blueberry (Sugar Rush) |
| purple | Witch (Float) | Octopus (Sniff) | Space Ranger (Dash) | Wizard (Charm) | Grape Popsicle (Sugar Rush) |
| pink | Sugar Skeleton (Boo!) | Flamingo (Sniff) | Pop Star (Charm) | Fairy (Float) | Cupcake (Sugar Rush) |
| white | Ghost (Float) | Bunny (Sniff) | Lab Scientist (Sniff) | Unicorn (Charm) | Marshmallow (Sugar Rush) |
| black | Vampire (Boo!) | Black Cat (Sniff) | Ninja (Dash) | Shadow Mage (Boo!) | Burnt Toast (Sugar Rush) |
| brown | Werewolf (Boo!) | Owl (Sniff) | Cowboy (Dash) | Gnome (Charm) | Chocolate Bar (Sugar Rush) |

Starter wardrobe: Ghost, Black Cat, Super Kid. (Matches `data.js`.)

## Collision

- Walkable: road, sidewalk, path, yard, grass, plaza.
- Blocked: hedge, fence, tombstone (stored as fence tiles), house, tree, water.
- Float passes over every tile except the forest border (a separate `FOREST` tile type for the
  border; *code change: `town.js` currently uses `TREE` for both*).
- Player and kids: 10 × 6 px hitbox at the feet; axis-separated movement with corner sliding.

## Win, lose and progress

- Win a night: light the target number of jacks, then finish. The night complete screen shows
  candy kept, stars, new costumes, new jacks and the lifetime haul.
- No losing. From pause you can "Head home early" (keeps costumes, jacks and clues gained, no clear).
- Saved (localStorage `porchlight-save`, versioned JSON): wardrobe, jack collection, clues per household
  (exact color or remaining candidates, disliked kinds known), per-night cleared / best candy / stars,
  highest unlocked night, lifetime candy, first-launch-done flag, settings, run counter (seed).
  The finale is unlocked after night 7.
- Finale: when the 50th jack lights, the dance plays; then a "You lit every porch on the block"
  victory screen with the lifetime haul as a giant candy pile, and the collection marked complete.

## Screens

- **Title:** title art with real costume sprites drawn over it in code, "Porchlight" in the pixel font, Play / Collection / How to Play, mute. "Tap or press any key" starts audio.
- **Night select** (from the second play): cards for nights 1 to 8 (locked ones dark), stars and best candy each.
- **Night intro + costume pick** (from the second play): "Night 3: Fog Rolls In. Light 14 jacks." plus the wardrobe grid.
- **Gameplay HUD:** top-left candy count and jacks lit/needed; top-right map, pause, sound buttons; bottom-left (desktop) or top-left under candy (touch) the worn costume card: sprite, name, kind, color, power and cooldown. First-launch prompts bottom-center.
- **Dialogs:** knock result, swap offer, wardrobe, known-jack switch. Bottom-center panel.
- **Map:** full-screen overlay of the town, legend, close with Tab/Esc/tap.
- **Pause:** Resume, How to Play, Sound/Music toggles, Head home early, Quit to title.
- **Night complete:** candy, stars (with star-ding), new costumes and jacks, lifetime haul, Next night / Replay / Title.
- **Collection:** two tabs: Jacks (5 × 10 grid, lit/silhouette, household name and its clues) and Costumes (5 × 10 grid by kind and color, owned/locked, power).
- **How to play:** three short code-drawn scenes using the real sprites (sign + knock + dots; find the kid + swap; light the jack).
- **Finale stage and victory:** the dance (skippable), candy rain, then the haul and "Play again".
- **Error:** shown only if 20 seeds fail generation ("Couldn't build the town", Retry / Title).
- **Settings** live in pause and title: music and sound toggles (M mutes all).

## Finale dance

Its own stage scene, in the plaza at night (the plaza, its lamps and the surrounding lit jacks).
- Music: music-finale, 116 BPM four-on-the-floor; BPM and first-downbeat offset measured after generation and stored in `data.js`. All moves are driven by the audio clock (`ctx.currentTime`), not frame counts.
- 4 bars: the 50 kids march in from the edges and form 5 rows by kind (10 colors each, red to brown), the player front-center. Row spacing adapts to the view width (min 22 px, max 28 px apart; slight overlap in portrait), y-sorted.
- 20 bars (4 per move): lean (side to side on the beat), shuffle squash-hop, spin (sprite flip every half beat), claw stretch on the beat, freeze pose. Rows start a beat apart for a ripple.
- Total ≈ 24 bars ≈ 50 s. Act on the beat (± 120 ms) triggers a group "BOO!" pose with a puff and a pop-up; a counter shows hits.
- Then 4 bars of candy rain into a giant pile in the middle while music fades and crossfades to the title waltz for the victory screen.
- Esc / skip button jumps to the victory screen.
- **Never-cut fallback:** a 5 × 10 grid of kids doing 2 bounce moves (hop, sway) to the track, then the victory screen.

## Juice

Must-haves:
- Jack lighting: pumpkin squash-and-stretch, flame flicker on, light radius blooms, orange spark burst, short screen shake, "PERFECT!" pop-up, a jack icon flying to the HUD counter.
- Candy burst: candy pieces arc from the door to the player; HUD counter ticks up with a bounce.
- Number pop-ups (+15, −3).
- Character bob while walking, waddle tilt, little hop on swap, swap puff cloud.
- Target selection outline; kids turning to face you.
- Night lighting: darkness overlay with warm light pools (porch lights, jacks, street lamps, the player's small lantern glow).
- Power visuals: dash afterimages, float shadow and landing puff, Boo! ring, Sniff scent trail, Charm hearts, Sugar Rush sparkles.
- Sound for every action. Screen fades between screens.

Nice:
- Falling leaves, a moon with clouds on the map edge, "!" bubble pop, footstep dust puffs, prankster bump knockback.

## Art direction

- **Style line (paste into every image prompt):** "Cozy 16-bit pixel art, 3/4 top-down view, Halloween night, chunky readable shapes with crisp 1-pixel dark purple-black outlines, limited palette: deep indigo, violet, moonlit teal, warm pumpkin orange, candle yellow, bone white; soft top-left lighting; no text, no watermark."
- **Style anchor:** the Ghost costume kid (white sheet, little shoes, orange candy bucket), standing, front 3/4 view. Made first with imagegen2 (native transparency), reused as the reference for every costume sheet, the house sheet, props and title art.
- **Camera:** 3/4 top-down (see roofs and house fronts); all houses face the camera (doors at the bottom).
- **Resolution:** tile = 16 logical px. Integer device-pixel scale chosen so the logical short side is ~230 on touch or small screens (CSS short side < 500) and ~330 otherwise: `s = max(1, round(shortSideDevicePx / target))`. Examples: iPhone 15 landscape (2556 × 1179 device px) → s = 5 → 511 × 236; desktop 1280 × 720 → s = 2 → 640 × 360; 800 × 600 → s = 2 → 400 × 300. Characters at most 40 × 40 px (feet on a shared baseline); houses 80 px wide (one lot), 64 px tall plus up to 16 px roof overhang into the hedge row; pumpkin 16 × 14.
- **Palette:** night indigo #1b1533, violet #3b2a5c, moon teal #5fb3b3, pumpkin #f08a24, candle #ffd25e, bone #f2ead8, road #2a2638, grass #24402f. Costume colors as in `data.js` `COLOR_HEX`.
- **Readability at night:** world → darkness pass (destination-out light pools) → warm "lighter" glow pass → characters drawn on top at ~85% light with a 1-px moon-teal rim → signs, ribbons, refill rings, bubbles and kid badges above everything.
- **Costume sprite pipeline:** 10 costumes per sheet as a 4 × 3 grid of cells on 1536 × 1024 (2 cells empty), imagegen2 native transparency, the anchor as reference. Slice by connected components (not a fixed grid). One scale for all 50, from the anchor's body height; feet on a shared baseline; max 40 × 40. Quantize to one shared master palette (~48 colors) with a reserved 3-step ramp per costume color, plus neutrals and skin tones. Redraw a 1-px #1b1533 outline in code (Pillow). Check each sprite's dominant hue against its assigned color with Pillow (white, black and brown by lightness and saturation); hue-shift the costume pixels if close, regenerate if far off. Before finishing, build a 50-sprite contact sheet drawn under the night overlay and check every kind and color reads. Fallback: per-costume images at 1024 × 1024 for any costume that fails twice.
- **Houses:** one 1536 × 1024 sheet with all 4 styles (cottage, two-story, bungalow, Victorian), door centered and the house filling its width, dark windows, light-grey walls. Each is scaled to 80 px wide. Window and porch glow are drawn in code (on for candy houses and home, off for dark houses); wall tint applied through a grey-match mask (walls only).
- **Tiles:** grass, road, sidewalk, path, hedge, fence are drawn in code only, with shades sampled from the generated art. Park bushes use the code hedge style. Test a 6 × 6-tile street with a house, pumpkin and lamp under the overlay before making the rest.
- **Consistency:** every image uses the anchor as a reference; sprites are downscaled the same way (area downscale, master-palette quantize, hard alpha threshold, code outline), so every pixel is the same size. Icons, UI panels, candy, jack faces, badges and dots are drawn in code from the palette.

## Audio direction

- **Title:** whimsical spooky waltz, harpsichord, celesta and pizzicato (60 s loop). Also plays on the victory screen.
- **Nights 1 to 3 (night-a):** playful sneaky pizzicato strings, bassoon, music box, light brushed percussion, cozy. 120 s, prompted "no intro, no ending, constant energy".
- **Nights 4 to 8 (night-b):** brisker and more mysterious: theremin melody, plucky upright bass, toy piano, ticking percussion. 120 s, same loop prompt.
- **Finale:** original funky 80s-style spooky dance groove at 116 BPM, four-on-the-floor kick, synth bass, claps, organ stabs, brassy synth hits, instrumental. 75 s. BPM and downbeat measured after generation.
- Music has no native seamless loop: trim silence and set `loopStart`/`loopEnd` on the Web Audio source at bar boundaries; short crossfade if a seam is audible.
- **Effects (27):** knock, candy-small, candy-big, jack-light, close (pleased "ooh"), meh (neutral), eww (disliked), empty-bowl, swap, not-enough-candy, dash, float, float-land, boo, sniff, charm, sugar-rush, power-not-ready, prankster-bump, kid-alert ("!" bubble), target-reached, star-ding, ui-click, map-open, wardrobe, night-complete fanfare, ambience loop (crickets, gentle wind; `--loop`, should).

## Asset list

| ID | What it is | Tool | Size and format | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| anchor | Ghost kid (style anchor) | imagegen2 | 1024 sq → ≤40×40 PNG | yes (native) | code | must |
| costumes-spooky | 10 Spooky costumes, 4×3 cells (2 empty) | imagegen2 (+anchor ref) | 1536×1024 → 10 × ≤40×40 | yes (native) | code | must |
| costumes-critter | 10 Critter costumes | imagegen2 (+anchor ref) | same | yes | code | must |
| costumes-hero | 10 Hero costumes | imagegen2 (+anchor ref) | same | yes | code | must |
| costumes-magic | 10 Magic costumes | imagegen2 (+anchor ref) | same | yes | code | must |
| costumes-snack | 10 Snack costumes | imagegen2 (+anchor ref) | same | yes | code | must |
| costume-fallback | single costumes that fail the sheet twice | imagegen2 (+anchor ref) | 1024 sq → ≤40×40 | yes | code | must (only if needed) |
| houses | 4 house styles on one sheet: door centered, dark windows, light-grey walls | imagegen2 (+anchor ref) | 1536×1024 → 4 × 80 px wide | yes | code glow + wall-mask tint | must |
| props | pumpkin, lit-jack base (glowing hollow, no face), oak tree, dead tree, street lamp, tombstone, scarecrow | imagegen2 (sheet, +anchor ref) | 1536×1024 → per prop | yes | — | must (scarecrow nice) |
| title-bg | moonlit pixel neighborhood street with pumpkins and porch lights, no figures, focus in the center third | nanogen `--style pixel-16bit`, anchor + house sheet as refs | 16:9, 2K → downscaled + quantized | no | — | must |
| app-icon | glowing jack-o'-lantern pixel icon | imagegen2 | 1024 sq → icons | no (dark bg) | — | must |
| tiles | grass, sidewalk, road, path, hedge, fence | code (shades sampled from art) | 16×16 | — | — | must |
| ui | panels, buttons, kind icons, power icons, candy, jack faces, color dots, badges, outline, arrows | code | — | — | — | must |
| finale-stage | plaza stage scene, rows, 5 moves, BOO pose, candy rain and pile | code (real sprites) | — | — | code | must (minimal fallback never cut) |
| how-to-play | 3 scenes | code (real sprites) | — | — | code | must |
| font | Pixelify Sans (OFL), bundled locally, or a code bitmap font fallback | download | TTF + OFL.txt | — | — | must |
| music-title | title / victory waltz | audiogen music | 60 s mp3 | — | loop | must |
| music-night-a | nights 1 to 3 | audiogen music | 120 s mp3 | — | loop (loopStart/End) | must |
| music-night-b | nights 4 to 8 | audiogen music | 120 s mp3 | — | loop (loopStart/End) | should |
| music-finale | 116 BPM dance groove | audiogen music | 75 s mp3 | — | once | must |
| sfx × 26 | effects listed above | audiogen sfx | 0.5 to 2 s mp3 (fanfare 3 s) | — | — | must |
| ambience | crickets and gentle wind | audiogen sfx `--loop` | 20 s mp3 | — | loop | should |
| social-card | 1200×630 from title art + logo text | code (playwright screenshot) | JPG | — | — | must |

## Tech plan

Files (`game/`): `index.html`, `src/main.js` (boot, loop, screen manager), `src/data.js` (costumes,
households, nights, names, finale BPM), `src/rng.js` (seeded RNG), `src/town.js` (generation, tile grid,
collision, pathing), `src/entities.js` (player, kids, powers), `src/render.js` (world, y-sort, lighting,
sprites, particles), `src/ui.js` (HUD, dialogs, screens, touch controls), `src/input.js`, `src/audio.js`,
`src/save.js`, `src/finale.js`, `src/art.js` (asset loading, code-drawn tiles/icons/jack faces/badges),
`manifest.webmanifest`, `sw.js`, icons, `fonts/`, `assets/`.

Changes to code already written:
- `data.js`: kid counts 16/20/24/28/32/36/40/50; night 5 `kidSpeedMul: 1.2`; night 8 `cols: 7, rows: 5`; add 2 decoy colors per household; add finale BPM/offset after the track is measured.
- `town.js`: separate `FOREST` border tile; known-household cap and guaranteed set as in "Solvability guarantee"; distinct decoys on nights 1 and 2; night 1 tutorial household and kid; finale needed kids spawn within ~15 tiles of their houses; `generateTown` throws on failed checks (caller retries up to 20 seeds).

- **Loop:** rAF with fixed 60 Hz update and accumulator; frame gap clamped to 250 ms; auto-pause on `visibilitychange`/blur. `?debug=1` enables a time scale (`__game.setTimeScale(n)`).
- **Scaling:** canvas backing = window CSS size × devicePixelRatio. Integer scale `s` as in Art direction; the world and lights render at logical resolution into an offscreen canvas, then are drawn integer-scaled (smoothing off). HUD and text are drawn at backing resolution for sharpness. Recompute on resize/orientationchange. HUD honors `env(safe-area-inset-*)` (read via a CSS probe element).
- **Rendering performance:** static ground layer pre-rendered in 256 × 256 px chunks; cull everything off-screen; light gradients cached as sprites; darkness via `destination-out`, warm glow via `lighter`.
- **Kids AI:** waypoint graph on street intersections + door side spots; BFS paths; simple separation; stop-and-face within 2 tiles of the player.
- **Input:** one input layer (keys, pointer thumbstick, buttons) with just-pressed latching.
- **Audio:** Web Audio, buffers decoded on load; music sources with `loop=true` and `loopStart`/`loopEnd`; separate music/sfx gain; mute saved; finale moves read `ctx.currentTime`.
- **Saving:** `localStorage['porchlight-save']`, `{v:1, ...}`; try/catch; save on every jack, swap, clue and night end.
- **Install/offline:** manifest + sw.js per web-target (registered only off localhost or with `?sw=1`).
- **Debug hook:** `window.__game = { state(), levels(), goToLevel(n, seed?, {wardrobe: 'starter'|'full'|[ids], jacks: 'none'|'all'|[ids]}), audioState(), town(), pathTo(x, y), setTimeScale(n) }`.
  - `state()`: screen, night, need, lit, candy, player tile, worn costume, actTarget (type + id), power cooldown, dialog (type + options), prompt, levelComplete, gameWon, finale phase.
  - `town()`: candy houses (id, door tile, favorite, lit, known, bowl full/refill time, clue state) and kids (id, tile, costume, price, frozen).
  - `pathTo(x, y)`: tile path from the player.
- **Play-test (closed-loop driver):** one `run-code` per goal: read `town()` and `pathTo()`, hold arrow keys tile to tile checking the player's tile, re-path every tile when chasing a moving kid, press Space at the target, check `state()`. Covers nights 1, 4 and 8 for 2 seeds each (night 8 with `goToLevel(8, seed, {wardrobe:'full', jacks:'all'})` for the sweep, and one with `jacks:'none'`), plus the first-launch flow from a clean save. Seeds and scripts saved under `design/solutions/`.

## Cut list

In order:
1. Night-7 market prices (night 7 is just bigger).
2. Ambience loop and nice-to-have juice.
3. Float simplified: walk through hedges and fences only (no shadow, no landing BFS).
4. Charm and Sugar Rush become passive (half price always for Charm costumes; +30% speed always for Snacks).
5. music-night-b (reuse night-a everywhere).
6. Pranksters.
7. Fog effect on night 3.

Never cut: the knock / clue / swap / jack loop, the map, persistent wardrobe, jacks and clues, and the minimal finale (a grid of kids doing 2 bounce moves to the track, then victory).

## Budget estimate

imagegen2 reports token usage, not prices: the image figures below are assumptions, replaced
by the real cost measured from reported usage after the anchor plus the first costume sheet
(OpenAI's price and the date noted in `ASSETS.md`). If the measured cost would push the total
past $15 before the reserve, later retries drop to medium quality.

- Style anchor: 3 tries, high ≈ $0.75
- Costume sheets: 5 sheets + 5 retries, high ≈ $3.00
- House sheet (1 + 2 retries) ≈ $0.90; props sheet (1 + 1) ≈ $0.60; app icon ≈ $0.25
- Title art: nanogen pro 2K, 2 tries ≈ $0.30 (+ a flash try ≈ $0.05)
- Music: 60 + 120 + 120 + 75 = 375 s ≈ $1.90, + one 120 s retry ≈ $0.60
- Effects: 27 × $0.12 ≈ $3.25, + 6 retries ≈ $0.70
- **Expected ≈ $12.30.** Reserve **$5** for per-costume fallback images. **Expected + reserve ≈ $17.30**, under the $20 budget with ~$2.70 slack.

## Definition of done

- [ ] Loads with no console errors at 1280×720, 800×600, iPhone 15 landscape (852×393) and portrait; logical short side ≈ 330 on desktop and ≈ 230 on the phone.
- [ ] First launch from a clean save: Play → night 1 as Ghost, arrow to the Ghost house, the 4 prompts appear in order; second launch shows night select and the costume pick.
- [ ] Title → night select → costume pick → play works by keyboard, mouse and touch.
- [ ] Knocking gives the right candy and clue for favorite / close / neutral / disliked / empty bowl (3 dots, exact color, crossing off); first lighting always lights and pays 15; known-jack switch pays 5.
- [ ] Act picks the outlined target by the priority rule; kids stop and face the player within 2 tiles and never block a door.
- [ ] Swapping with a kid works; the costume joins the wardrobe and persists after reload.
- [ ] Lighting the target finishes nights 1, 4 and 8 (driven by real inputs through the closed-loop driver) for at least 2 seeds each.
- [ ] Generation never hangs: 200 seeds per night generate or throw-and-retry within 20 seeds; night 1 always has ≥ 20 costumes in play; the ≥ 40% never-lit rule holds while never-lit households remain.
- [ ] Known jacks offer the instant switch; home wardrobe works.
- [ ] Every power works, shows its cooldown and its visual; Float never leaves the player on a blocked tile.
- [ ] The map shows candy houses, clues, lit state, last-seen kids and the player; in the finale, live needed kids and the ≤ 5 pointer.
- [ ] Contact sheet: all 50 costumes read correctly (kind and color) under the night overlay; badges readable at ~10 tiles; a 6 × 6 street sample looks consistent.
- [ ] The finale dance plays with all 50 kids in 5 rows in time with the track, the on-beat BOO works, Esc skips, and it leads to the victory screen with the lifetime haul.
- [ ] Music and effects play after the first input; loops have no audible gap; mute and the music/sound toggles work and persist.
- [ ] Progress (wardrobe, jacks, clues, nights, lifetime candy) is saved and restored.
- [ ] Pausing, tab switching and resizing mid-night work.
- [ ] Installs as an app and works offline (`?sw=1` check).

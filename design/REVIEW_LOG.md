# Design review log

## Round 1: findings (condensed)

### Player
1. MUST: Candy economy undefined (start candy, speed, does the bag reset?). The first swap must be affordable within ~60 s.
2. MUST: Does the jack light if a kid just emptied the bowl? It should always light; only the candy waits.
3. SHOULD: Known jacks make nights 5 to 7 trivial (free walk-up lights). Require ~40% of the target from never-lit households, and give known-jack lights less candy.
4. SHOULD: Deduction is one knock (sign = kind, knock = color), so there's no "aha". Make color take a little work (a neutral knock narrows it, a close knock confirms it, Sniff reveals it).
5. SHOULD: First minute is three menus plus a blind costume pick. First launch goes straight into night 1 as Ghost, with the Ghost house next to home, an arrow and 3 to 4 contextual prompts. Show the costume pick from the second play on.
6. SHOULD: Finale is 50/50 with no slack in a 140-house town. Estimate the time, show all unlit houses and live "!" kids on the map in the finale, add a pointer when ≤5 remain, seed needed kids near their houses.
7. SHOULD: The finale dance is unspecified. Specify the venue, rows, 60 to 90 s of 4 to 6 code moves in time with the track, an on-beat Act for a group BOO pose, and a candy pile at the end.
8. SHOULD: Catching moving kids on a phone is fiddly, and kid vs door is ambiguous. Kids stop and face you within 2 tiles; Act radius ~1.5 tiles with a priority rule and a target outline; slim the nameplate.
9. NICE: Powers are mostly small economy tweaks. Make them visibly playful (e.g. Sniff draws a scent trail, Charm draws kids toward you, Sugar Rush adds speed).
10. NICE: Night 1 has too few costumes in play (brief says 20 to 50). Raise the kid counts.

### Builder
1. MUST: Costume sheets won't slice cleanly (5×2 cells are the wrong aspect); colors won't survive the downscale or the night overlay. Use connected-component slicing, a common scale and baseline, a shared palette with reserved color ramps, and a code color ring at kids' feet; test a 50-sprite contact sheet under the overlay early.
2. MUST: Night 8 contradictions: need+2 = 52 > 50 would loop the generator forever; the finale is unspecified. Use min(need+2, candy), fail loudly, state the speed, make the finale its own stage scene (5×10 kids, 30 to 45 s, skippable).
3. MUST: Act behavior undefined for empty bowls, range and overlapping targets. The jack always lights; range 1.25 tiles; priority: favorite door > kid > knock; kids wait beside doors, not on them.
4. SHOULD: Scaling formula makes phones show a huge view with tiny sprites. Target ~200 to 260 logical px short side on phones; render world and lights at logical res into an offscreen canvas then integer-scale; cached gradient sprites, a "lighter" warm pass, culling, chunked static tile layer.
5. SHOULD: Houses need per-style metadata; baked window glow can't be switched off. Dark windows in the art, code-drawn window and porch glow, tint walls via a mask, door centered.
6. SHOULD: Collision classes and Float undefined (yards? landing?). Define walkable vs Float-passable vs blocking; 10×6 feet hitbox; Float landing BFS; drop the "bigger blocks" claim for night 5.
7. SHOULD: The real-input completion test needs a closed-loop driver (path, hold keys, re-path), explicit `goToLevel(n, seed, {wardrobe})`, more state (actTarget, bowls, cooldown, kid ids), a `?debug=1` time scale.
8. SHOULD: Economy numbers missing (start candy, bag reset, speed, night-7 sell-back undefined, map kid positions live or last-seen).
9. SHOULD: Cut list cuts cheap things first. Reorder: sell-back/market, juice/ambience, simplify Float, passive Charm/Rush, night-b music, pranksters, fog; add a never-cut minimal finale fallback.
10. NICE: imagegen2 prices are guesses. Measure the real cost after the anchor plus one sheet; keep $5 in reserve for the per-costume fallback.

### Art and sound director
1. MUST: Kids' kinds and colors can't be read at night under a multiply overlay (black costumes vanish; purple/blue, pink/red, brown/orange merge). Draw characters after the darkness pass at ~80 to 85% light with a teal rim; signs, ribbons, rings and bubbles above the overlay; an always-on kind + color marker per kid; contact-sheet test.
2. MUST: The sheet pipeline can't promise one scale, crisp outlines or the right color. Use 4×3 cells on 1536×1024, connected components, one scale from the anchor's body height, a shared master palette, a code-redrawn 1-px outline, a Pillow hue check against the assigned color.
3. SHOULD: Baked window glow and full-sprite tint break houses. One sheet with all 4 houses, dark windows, flat light-grey walls; code glow; tint walls only.
4. SHOULD: Code tiles vs generated props mismatch; hedge and fence are made twice. One source per object (code hedge and fence; drop them from the props sheet); sample tile colors from the generated art; test a 6×6-tile street early.
5. SHOULD: The finale, the jack moment and how-to-play have no assets. Add a finale row (code choreography, venue), a "pumpkin-lit" base prop for the faces, how-to-play as code scenes from real sprites.
6. SHOULD: Finale music has no tempo. Prompt 116 BPM four-on-the-floor; measure BPM/offset; drive moves from the audio clock; 45 to 60 s dance; crossfade to the title waltz for victory.
7. SHOULD: Music loops will seam and repeat. 120 s night tracks with "no intro, no ending"; trim plus loopStart/loopEnd; ambience under music moved to should.
8. SHOULD: Missing sounds: empty bowl, power not ready, target reached, star ding, kid alert, float land; separate close vs neutral.
9. SHOULD: Nanogen title art won't match and crops in portrait. Use the pixel-16bit style with the anchor/house refs, no figures, center-third focus; downscale/quantize; draw real sprites over it in code.
10. NICE: Budget misses the additions; measure real prices.

## Round 1: outcomes

| Finding | Severity | Evidence | Outcome |
|---|---|---|---|
| P1 Candy economy undefined | must | Verified: old design had no start candy, speed or bag rule | Fixed: bag resets to 20 each night (first swap affordable at once), candy kept = night score, lifetime haul saved; player 5 tiles/s, kids 2.2; night-1 candy estimate added |
| P2 Jack vs empty bowl | must | Verified: candy table only covered "bowl full" | Fixed: first lighting always lights and pays 15 whatever the bowl; empty-bowl row and sound added |
| P3 Known jacks trivialize late nights | should | Verified: `town.js` only puts ≥40% of the target among candy houses; night 5 (28 candy, need 20) can be 8 new + 20 known, so the target is clearable on known jacks alone | Fixed: known-jack lights pay 5, revisits 6; generator caps known households at need − ceil(0.4·need) while never-lit ones remain, and the guarantee fills from never-lit households (code change listed) |
| P4 Deduction is one knock | should | Verified: old design revealed the color on any knock | Fixed: neutral/disliked knock gives 3 fixed candidate dots; knocking in a candidate color confirms or crosses it off; close knock or Sniff gives the exact color; "!" only for exactly solved, unlit, unowned favorites |
| P5 First minute is menus + blind pick | should | Verified: old flow title → night select → intro + pick | Fixed: new "First launch" section (straight into night 1 as Ghost, Ghost house next to home with an arrow, tutorial household, 4 prompts); pick screen from the second play |
| P6 Finale has no slack | should | Verified: 50/50 in an 8×6 town (~140 houses) with no help | Fixed: finale town 7×5 (~100 houses), map shows unlit houses and live needed kids, pointer at ≤5, needed kids spawn within ~15 tiles, time estimate ~10 min |
| P7 Finale dance unspecified | should | Verified | Fixed: "Finale dance" section: plaza stage, 5 rows by kind, player front-center, 4-bar march + 5 moves × 4 bars (~50 s), audio clock, on-beat BOO, candy rain, skippable; ~50 s chosen inside the reviewers' range overlap |
| P8 Catching kids / kid vs door ambiguity | should | No device test yet; follows from the undefined Act rules (verified) | Fixed: kids stop and face within 2 tiles, wait beside doors; Act range 1.4 tiles, priority rule, target outline; nameplate slimmed to name + price within 2 tiles |
| P9 Powers are small economy tweaks | nice | Verified: Charm, Sniff, Sugar Rush were numbers only | Fixed: Sniff scent trail to nearest "!" kid, Charm pulls nearby kids, Sugar Rush +30% speed |
| P10 Too few costumes on night 1 | nice | Verified: brief says 20 to 50 per night; old night 1 had 12 kids + 3 starters (≤15). Raising kids to 16 alone still gives ≤19 | Fixed: kids 16/20/…/40/50, plus distinct decoys on nights 1–2 so ≥20 costumes are in play (worn or loved by a candy house); DoD check added |
| B1 Costume sheets won't slice; colors lost | must | Verified: 5×2 cells on 1536×1024 are 307×512 (aspect 0.6) for sprites up to 1:1 | Fixed: 4×3 cells, connected-component slicing, one scale and baseline, master palette with reserved ramps, contact sheet under the overlay; the feet ring is replaced by the always-on badge (see A1) |
| B2 Night 8 contradictions | must | Verified: design text said need+2 = 52 > 50; `town.js` already uses min() but never throws/retries | Fixed: guarantee = min(need+2, candy houses); `generateTown` throws, caller tries the next seed up to 20, then an error screen; kid speed stated; finale is its own stage scene |
| B3 Act behavior undefined | must | Verified | Fixed: jack always lights; range 1.4 tiles (builder's call, close to the suggested 1.25); priority favorite door > kid > door; kids wait beside doors |
| B4 Phone scaling too zoomed out | should | Verified: old `round(short/360)` on iPhone 15 landscape (1179 device px) → s=3 → 852×393 logical, a 40-px kid is ~10% of the height | Fixed: target short side ~230 on touch/small, ~330 otherwise (iPhone → 511×236); offscreen logical render, integer scale, HUD at backing res, cached gradients, lighter pass, culling, chunked ground |
| B5 House metadata / baked glow | should | Verified: asset list asked for baked window glow and whole-sprite tint | Fixed: one sheet, door centered, dark windows, code glow, wall-mask tint, 80 px wide + overhang |
| B6 Collision and Float undefined | should | Verified: no walkable list; "bigger blocks" on night 5 contradicts `town.js` fixed lot/block sizes; border and in-town trees share `TREE` | Fixed: "Collision" section, 10×6 hitbox, Float over all but the forest border (new `FOREST` tile), +1.5 s then BFS snap; night 5 twist is now faster kids |
| B7 Test needs a closed-loop driver | should | Verified: playtest-guide requires real input; old hook lacked seed options and state fields | Fixed: closed-loop driver in one run-code; `goToLevel(n, seed, {wardrobe, jacks})`; `state()` adds actTarget, cooldown, dialog; `town()` adds bowls and kid ids; `?debug=1` time scale |
| B8 Economy numbers missing | should | Verified | Fixed: start candy, bag reset, speeds, sell-back removed, map kids last-seen fading after 30 s (live in finale) |
| B9 Cut list order | should | Verified: old list cut cheap twists before expensive Float/Charm work and had no finale fallback | Fixed: new order (market, ambience/nice juice, simple Float, passive Charm/Rush, night-b, pranksters, fog); minimal finale never cut |
| B10 imagegen2 prices are guesses | nice | Verified: imagegen2 reference.md says avoid hardcoding prices; asset-guide says it reports usage only | Fixed: image figures marked as assumptions, measured after anchor + first sheet, $5 fallback reserve, quality drop rule |
| A1 Kinds/colors unreadable at night | must | Verified by reasoning: black #3a3248 under an indigo multiply overlay lands next to #1b1533; similar hues merge when darkened (no render test yet) | Fixed: characters after the darkness pass at ~85% with a teal rim; signs/ribbons/rings/bubbles/badges above the overlay; badge per kid; contact-sheet test in DoD |
| A2 Sheet pipeline can't promise scale/outline/color | must | Verified: imagegen2 native alpha confirmed in SKILL.md; old pipeline had no shared palette, outline or color check | Fixed: 4×3 on 1536×1024, components, anchor-height scale, master palette, code outline #1b1533, Pillow hue check (lightness/saturation for white/black/brown), per-costume fallback |
| A3 Baked glow and full tint break houses | should | Verified (same as B5) | Fixed: as B5 |
| A4 Code tiles vs props mismatch; hedge/fence twice | should | Verified: props listed hedge bush and picket fence while tiles also had hedge and fence | Fixed: hedge/fence/ground code-only with sampled shades, props sheet trimmed, park bushes use code hedge, 6×6 street test |
| A5 Finale, jack moment, how-to-play lack assets | should | Verified | Fixed: finale-stage and how-to-play rows (code, real sprites), lit-jack base prop added |
| A6 Finale music has no tempo | should | Verified | Fixed: 116 BPM four-on-the-floor, BPM/offset measured, audio-clock moves, ~50 s dance, crossfade to the title waltz |
| A7 Music loops seam and repeat | should | Verified: audiogen has no music loop flag; sfx has `--loop` | Fixed: 120 s night tracks "no intro, no ending, constant energy", trim + loopStart/loopEnd; ambience is should and uses sfx `--loop` |
| A8 Missing sounds | should | Verified | Fixed: empty-bowl, power-not-ready, target-reached, star-ding, kid-alert, float-land, separate close vs meh (27 effects) |
| A9 Title art mismatch and portrait crop | should | Verified: nanogen has `pixel-16bit` and reference inputs; old prompt had silhouetted kids that wouldn't match the sprites | Fixed: pixel-16bit with anchor + house refs, no figures, center-third focus, downscale + quantize, real sprites drawn over it |
| A10 Budget misses additions | nice | Verified: old budget had 20 effects, 330 s music, no reserve | Fixed: 375 s music, 27 effects, house/props counts, expected ≈ $12.30 + $5 reserve ≈ $17.30 |

## Final review (playtester + bug hunter)

| Finding | Severity | Outcome |
|---|---|---|
| A/Space in dialogs hit a focused HUD button (mute/map/pause) | must-fix | Fixed: HUD buttons left out of keyboard navigation; dialogs get fresh focus on their default button |
| Phone: left 45% of menus ignored taps after a night | must-fix | Fixed: thumbstick enabled only during play |
| Finale clock mixed audio and page clocks (tab switch skipped or froze the dance) | should-fix | Fixed: the finale runs on its own frame clock |
| Pausing played music with Music off | should-fix | Fixed in duckMusic |
| How-to-play from pause swapped music | nice | Fixed: night music kept; duck re-applied after toggles |
| Ambience could never start | nice | Fixed: starts when decoding finishes |
| Tutorial stage 3 wrong if the favorite was traded away | nice | Fixed: points to the home closet |
| Save version change would wipe progress; bad shapes could crash | nice | Fixed: tolerant loading with field checks |
| Keyboard prompts said "press A" | should-fix | Fixed: Space on keyboard, A on touch; map hint per device |
| Kids pile on the player | should-fix | Fixed: kids keep ~1 tile away; the player is drawn on top |
| A-button label overflowed | should-fix | Fixed: smaller font for words |
| Closet overlapped touch buttons; portrait title collision | should-fix | Fixed: touch buttons hidden in dialogs; narrow layout moves the counter |
| Map had no visible close; phone prompt said Tab | should-fix | Fixed: Close ✕ button; device-specific prompt |
| Tutorial kid could wander far | should-fix | Fixed: the tutorial kid waits nearby until traded |
| Clue dots tiny and covered | should-fix | Fixed: bigger ribbon/dots above the sign, pop after a knock |
| Title start text hard to read | nice | Fixed: dark pill behind start text and counter |
| "Yes (1)" hints on touch | nice | Fixed |

After the fixes: night 1 (fresh save, tutorial), night 4 (seed 4777) and night 8 (seed 8333 full collection, seed 8444 starter collection) were replayed to completion by the real-input driver, with no console errors. No second round was needed (both must-fix items fixed and re-verified).

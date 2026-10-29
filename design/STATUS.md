# Status — Porchlight (working title)

## Request (as typed)
/gamegen I want a game about Halloween in which you select from a small collection of costumes and go trick or treating around a large down, probably pixely, maybe 3/4 overhead view. The town should have dozens of houses. Each house likes a given costume more/less and you get more/better candy the more they like your costume. A bunch of other kids are also trick-or-treating. You can bribe other kids to swap costumes if you have enough candy, and once you gain a costume its in your initial set next time you play. Costumes have powers and some costumes cost more than othes. There should probably be like 50 total costumes, though maybe any given run of the game only includes 20-50 with more as levels get harder. Costumes can repeat a bit, maybe with color swaps in a given run. Not every house has candy every game. The streets should probably layout differently each game. Any house with candy has a pumpkin in the yard, and once you trick-or-treat there with the costume that house likes best, it becomes a jack-o-lantern so you know, and you get that jack-o-lantern in your jack collection. For a given run you can solve it by properly matching up enough houses. In early runs you may only need 10, but as you do better there are more. More houses offer candy on future runs, but you need more jack-o-lanterns to solve that board. it's fundamentally a puzzle game in which you're trying to match the costume to the house while keeping the most candy and there should always be the right costumes on the board to fulfill enough houses and you can always get more candy by re-trick-or-treating a house after a while, so you can always solve a board, but it gets harder as there are more kids and you need more houses. There should be music and effects and some costumes should have fun powers. Once you've gotten a house's jack-o-lantern instead of having a pumpkin it starts with that jack, just not lit yet, and if you go near it it'll let you just switch to the right costume, so you don't have to resolve every house every time if you don't want. In the final run you use every costume and match it to the right house and all the kids dance with you Thriller style and you all share the massive candy haul or something.

## Settings
- Platform: both (default) · Target: web (default) · Scope: medium (default; the request is content-heavy, so 50 costumes are made in sprite sheets) · Budget: $20 (default) · Rounds: 2
- Folder: /workspaces/gg-test1 (was essentially empty)

## Available
- OpenAI (imagegen2, anim8gen): ok · Gemini (nanogen): ok · ElevenLabs (audiogen): ok, restricted key; plan settled by first sound = PAID (128 kbps worked), no credit line
- Python3 + Pillow (installed during preflight) · playwright-cli: ok · node: ok

## Phases
- [x] Preflight
- [x] 1 Brief — design/BRIEF.md written
- [x] 2 Design — GAME_DESIGN.md
- [x] 3 Design review — round 1 (player, builder, art/sound): 30 findings, all fixed by the refiner; converged (no open must/should), round 2 skipped
- [x] 4 Assets — anchor, 50 costumes (5 sheets), houses, props, title, icon, 4 songs, 27 sfx: $5.80 total
- [x] 5 Build — game/src/*.js (ES modules): town generator, world sim, renderer, UI, finale; finale BPM measured 116 / 0.04 s
- [x] 6 Play-test — nights 1 (fresh save, tutorial), 4 (seed 4001) and 8 (seed 8001, full collection) finished by the real-key driver (design/solutions/driver.js); rules-test.js checks knocks/powers/float; phone landscape+portrait, touch stick + 2-finger A; save/mute persist; offline ?sw=1 OK; 1600-seed generator test 0 failures. Fixed: lit-house priority over kids, door-step priority, dropped key presses on frames with no update, tutorial prompt position on touch.
- [x] 7 Final review — 2 must-fix + 15 others fixed and re-verified (see REVIEW_LOG.md)
- [x] 8 Wrap up — social card, README, Pages workflow, game served

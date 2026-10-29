# Brief — Porchlight

**In one sentence:** a cozy Halloween puzzle-explorer in which you roam a big pixel-art
neighborhood in costume, work out which costume each house loves, swap or bribe other
kids for the right ones, and light up the street one jack-o'-lantern at a time.

**The feeling:** that Halloween-night buzz of being nine years old with a pillowcase of
candy, a whole neighborhood to explore and a plan. Warm porch lights against a cold
purple night. Little "aha!" moments as you work out what the grumpy house on Elm wants,
then the joy of watching its pumpkin light up. It ends in a big, silly, shared dance party.

**Who and where:** anyone who likes gentle puzzles and collecting things. Desktop and
phone (landscape preferred, portrait works). A night (a run) lasts about 6 to 12 minutes;
the whole collection takes a few hours across many nights.

## What the person asked for (the must-keeps)
- Pixel-art, 3/4 overhead view of a large town with dozens of houses; streets lay out
  differently every night.
- Pick from a small set of costumes; houses like costumes more or less, and give more or
  better candy the more they like yours.
- Lots of other kids trick-or-treating; bribe them with candy to swap costumes. A costume
  you gain stays in your wardrobe for future nights.
- About 50 costumes, with powers; some cost more than others. Each night uses a subset
  (20 to 50), more as nights get harder. Costumes can repeat a bit (kids in color swaps).
- Not every house has candy each night. Candy houses have a pumpkin in the yard. Wearing
  a house's favorite costume turns its pumpkin into a jack-o'-lantern, added to your
  jack collection.
- A night is solved by lighting enough jacks (about 10 early, more later). More candy houses
  but a higher jack target as you progress. There are always enough right costumes on
  the board, and houses refill over time, so every night can be solved. More kids and
  more houses make it harder.
- A house whose jack you already own starts the night with that jack (unlit); walking up
  offers to switch you into the right costume right away.
- Music and sound effects; fun powers.
- Final night: every costume matched to its house, then all the kids dance with you in a
  big spooky-dance finale and share the huge candy haul.

## Style references
None given. The look we're going for: cozy 16-bit-era top-down town games (warm,
chunky pixel art, 3/4 view where you see roofs and fronts), but at night: deep indigo
and violet shadows, orange porch and pumpkin glow, moonlit blue highlights. The finale
borrows the *idea* of a famous 80s zombie dance video (rows of costumed kids doing a
synchronized spooky dance) but uses original music, moves and characters. No copied
names, songs, characters or choreography.

## Settings and decisions made for the player
- Platform both, target web, scope medium, budget $20, 2 design review rounds.
- Name: **Porchlight**.
- 50 costumes in a 5 × 10 grid: 5 kinds (Spooky, Critter, Hero, Magic, Snack) × 10
  colors. Each house's favorite is one exact costume; its sign shows the kind, and knocking
  reveals the color. That turns "the house likes it more or less" into a readable
  deduction puzzle.
- 50 households (one per costume) persist across nights, so the jack collection has 50 jacks.
- Costume sprites are single drawn poses, brought to life with code animation (bob, waddle,
  squash). 50 costumes × walk cycles is far too much for generated animation.

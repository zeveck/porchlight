# Assets and spending

Pricing reference (looked up 2026-10-29): gpt-image-2.5 image output $30 / 1M tokens, image input $8 / 1M, text input $5 / 1M
(https://developers.openai.com/api/docs/models/gpt-image-2.5-flare). Estimates round up.
nanogen and audiogen: per their skills (~$0.02–0.24 per image; ~$0.30/min music, ~$0.12 per effect).

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| anchor | game/assets/style-anchor.png | imagegen2 high 1024 | ghost-sheet kid with pumpkin bucket | 1 | $0.06 |

**Running total: $0.06** of $20
| costumes-spooky | game/assets/sprites/costumes/spooky-*.png (white = anchor) | imagegen2 high 1536x1024 + anchor ref | 10 Spooky kids, 4x3 grid | 1 | $0.06 |
| costumes-critter | game/assets/sprites/costumes/critter-*.png | imagegen2 high 1536x1024 + anchor ref | 10 Critter kids | 1 | $0.06 |
| costumes-hero | game/assets/sprites/costumes/hero-*.png | imagegen2 high 1536x1024 + anchor ref | 10 Hero kids | 1 | $0.06 |
| costumes-magic | game/assets/sprites/costumes/magic-*.png | imagegen2 high 1536x1024 + anchor ref | 10 Magic kids | 1 | $0.06 |
| costumes-snack | game/assets/sprites/costumes/snack-*.png | imagegen2 high 1536x1024 + anchor ref | 10 Snack kids | 1 | $0.06 |

Measured: a high-quality 1536x1024 sheet with the anchor as reference = 1372 output + 1024 image-input tokens ≈ $0.05.
**Running total: $0.36** of $20
| houses | game/assets/world/house-0..3.png | imagegen2 high 1536x1024 + anchor/sheet refs | 4 house styles, dark windows, grey walls | 1 | $0.06 |
| props | game/assets/world/{pumpkin,jack-base,oak,deadtree,lamp,tomb,scarecrow,fountain}.png | imagegen2 high 1536x1024 + anchor ref | yard props | 1 | $0.06 |
| title-bg | game/assets/bg/title.jpg | nanogen pro 2K 16:9 pixel-16bit, house/prop refs | moonlit street | 1 | $0.14 |
| app-icon | game/icon-*.png, favicon.png, apple-touch-icon.png | imagegen2 high 1024 | glowing jack | 1 | $0.06 |

**Running total: $0.68** of $20
| music ×4 | game/assets/audio/music/music-{title,night-a,night-b,finale}.mp3 (60/120/120/75 s) | audiogen music | see design | 1 each | $1.88 |
| sfx ×27 | game/assets/audio/sfx/*.mp3 (incl. ambience loop) | audiogen sfx | see design | 1 each | $3.24 |

ElevenLabs plan: **paid** (default mp3_44100_128 worked), so no credit line.
**Running total: $5.80** of $20

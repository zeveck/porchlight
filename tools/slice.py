"""Slice a costume sheet into sprites. Usage: slice.py sheet.png outdir name1 name2 ... (names in reading order; '-' skips)."""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from sprite import components, crisp

src, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3:]
im = Image.open(src).convert('RGBA')
boxes = components(im)
# reading order: cluster into rows by vertical centre
boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
rows = []
for b in boxes:
    cy = (b[1] + b[3]) / 2
    if rows and abs(cy - rows[-1][0]) < 120: rows[-1][1].append(b)
    else: rows.append([cy, [b]])
ordered = [b for _, r in rows for b in sorted(r, key=lambda b: b[0])]
print(len(ordered), 'figures', [tuple(b[:4]) for b in ordered])
os.makedirs(outdir, exist_ok=True)
for b, name in zip(ordered, names):
    if name == '-': continue
    fig = im.crop((max(0, b[0] - 4), max(0, b[1] - 4), min(im.width, b[2] + 4), min(im.height, b[3] + 4)))
    bb = fig.getbbox(); fig = fig.crop(bb)
    scale = fig.height / 38.0   # every kid normalised to 38 px tall (+outline = 40)
    s = crisp(fig, scale)
    s.save(os.path.join(outdir, name + '.png'))
    print(name, s.size)

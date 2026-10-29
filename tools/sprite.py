"""Turn big generated figures into crisp game sprites: crop, scale, threshold alpha, outline."""
import sys
from PIL import Image, ImageFilter

OUTLINE = (27, 21, 51, 255)

def components(im, min_area=2000):
    """Find figures on a transparent sheet by alpha connected components (on a downsampled mask)."""
    a = im.split()[3]
    sw, sh = im.width // 4, im.height // 4
    small = a.resize((sw, sh), Image.BILINEAR).point(lambda v: 255 if v > 40 else 0)
    px = small.load()
    seen = [[False] * sh for _ in range(sw)]
    boxes = []
    for x in range(sw):
        for y in range(sh):
            if px[x, y] and not seen[x][y]:
                stack = [(x, y)]; seen[x][y] = True
                x0 = x1 = x; y0 = y1 = y; n = 0
                while stack:
                    cx, cy = stack.pop(); n += 1
                    x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < sw and 0 <= ny < sh and px[nx, ny] and not seen[nx][ny]:
                                seen[nx][ny] = True; stack.append((nx, ny))
                if n * 16 >= min_area:
                    boxes.append([x0 * 4, y0 * 4, (x1 + 1) * 4, (y1 + 1) * 4, n * 16])
    # merge boxes that overlap or nearly touch (detached bits like a held bucket)
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a_, b_ = boxes[i], boxes[j]
                if min(a_[4], b_[4]) > 0.2 * max(a_[4], b_[4]): continue   # two real figures: never merge
                if a_[0] - 24 < b_[2] and b_[0] - 24 < a_[2] and a_[1] - 24 < b_[3] and b_[1] - 24 < a_[3]:
                    boxes[i] = [min(a_[0], b_[0]), min(a_[1], b_[1]), max(a_[2], b_[2]), max(a_[3], b_[3]), a_[4] + b_[4]]
                    del boxes[j]; merged = True; break
            if merged: break
    return boxes

def crisp(fig, scale, max_w=40, max_h=40):
    """fig: RGBA crop of one figure. Downscale by `scale` (big px per game px), threshold alpha, add outline."""
    bb = fig.getbbox()
    fig = fig.crop(bb)
    w = max(1, round(fig.width / scale)); h = max(1, round(fig.height / scale))
    if w > max_w - 2 or h > max_h - 2:
        k = min((max_w - 2) / w, (max_h - 2) / h); w = max(1, int(w * k)); h = max(1, int(h * k))
    # premultiplied-ish downscale: box filter on RGBA
    small = fig.resize((w, h), Image.BOX)
    px = small.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    # drop the generator's dark outline pixels that ended up inside, then redraw a uniform outline
    out = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    out.paste(small, (1, 1))
    o = out.load()
    W, H = out.size
    solid = [[o[x, y][3] > 0 for y in range(H)] for x in range(W)]
    for y in range(H):
        for x in range(W):
            if not solid[x][y] and any(0 <= x + dx < W and 0 <= y + dy < H and solid[x + dx][y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OUTLINE
    # darken near-black interior edge pixels toward the outline colour for consistency
    for y in range(H):
        for x in range(W):
            r, g, b, a = o[x, y]
            if a and r + g + b < 120:
                o[x, y] = OUTLINE
    return out

if __name__ == '__main__':
    src, dst, scale = sys.argv[1], sys.argv[2], float(sys.argv[3])
    im = Image.open(src).convert('RGBA')
    s = crisp(im, scale)
    s.save(dst)
    print(s.size)

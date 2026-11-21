"""Sharpen and clean Airin pixel-art pose frames in art/poses/.

Usage: python3 tools/sharpen_airin.py [poses_dir]

Fixes softness from JPEG source sheets + LANCZOS downscaling:
1. Bleeds opaque edge RGB into transparent pixels before sharpening (prevents dark halos).
2. Despills residual green-screen tint on non-cyan pixels.
3. Applies clean UnsharpMask + mild color/contrast pop (baked into PNGs so runtime doesn't need canvas filter).
4. Tightens alpha fringe on solid body edges while keeping luminous blade/aura glow, and removes stray specks.
"""
import glob
import os
import sys
from PIL import Image, ImageEnhance, ImageFilter


def bleed_rgb(im, steps=3):
    px = im.load()
    w, h = im.size
    rgb = [[px[x, y][:3] for x in range(w)] for y in range(h)]
    filled = [[px[x, y][3] >= 128 for x in range(w)] for y in range(h)]
    for _ in range(steps):
        nrgb = [row[:] for row in rgb]
        nfil = [row[:] for row in filled]
        for y in range(h):
            for x in range(w):
                if filled[y][x]:
                    continue
                rs = gs = bs = cnt = 0
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and filled[ny][nx]:
                        r, g, b = rgb[ny][nx]
                        rs += r
                        gs += g
                        bs += b
                        cnt += 1
                if cnt:
                    nrgb[y][x] = (rs // cnt, gs // cnt, bs // cnt)
                    nfil[y][x] = True
        rgb, filled = nrgb, nfil
    out = Image.new('RGB', (w, h))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            opx[x, y] = rgb[y][x]
    return out


def remove_tiny_specks(alpha_im, min_px=12):
    w, h = alpha_im.size
    px = alpha_im.load()
    vis = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if px[x, y] > 0 and not vis[y][x]:
                comp = []
                stack = [(x, y)]
                vis[y][x] = True
                while stack:
                    cx, cy = stack.pop()
                    comp.append((cx, cy))
                    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not vis[ny][nx] and px[nx, ny] > 0:
                            vis[ny][nx] = True
                            stack.append((nx, ny))
                if len(comp) < min_px:
                    for cx, cy in comp:
                        px[cx, cy] = 0
    return alpha_im


def sharpen_sprite(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    rgb = bleed_rgb(im, steps=3)
    rpx = rgb.load()
    for y in range(h):
        for x in range(w):
            r, g, b = rpx[x, y]
            # Despill residual green-screen tint while keeping cyan blade pixels
            if g > max(r, b) and (g - b) > 15:
                rpx[x, y] = (r, max(r, b), b)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.9, percent=125, threshold=2))
    rgb = ImageEnhance.Color(rgb).enhance(1.18)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.07)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.01)

    ipx = im.load()
    a = Image.new('L', (w, h))
    apx = a.load()
    for y in range(h):
        for x in range(w):
            r, g, b, al = ipx[x, y]
            is_glow = (b > 130 or r > 150) and (b > 110) and max(r, g, b) > 150
            if is_glow:
                apx[x, y] = 0 if al < 25 else (255 if al >= 210 else al)
            else:
                apx[x, y] = 0 if al < 95 else (255 if al >= 165 else int((al - 95) * 255 / 70))
    a = remove_tiny_specks(a, min_px=12)
    r, g, b = rgb.split()
    return Image.merge('RGBA', (r, g, b, a))


def main(poses_dir='art/poses'):
    files = sorted(glob.glob(os.path.join(poses_dir, 'airin-*.png')))
    for path in files:
        sharpen_sprite(path).save(path, optimize=True)
    print(f'Sharpened {len(files)} frames in {poses_dir}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'art/poses')

"""Rebuild the Earth and Moon textures in public/assets/tex/ from the original NASA images.

Needs Pillow (pip install pillow). Download the five source images into one folder, then:

    python tools/make_textures.py <folder with the downloads> public/assets/tex

Sources (all NASA; see public/assets/tex/CREDITS.md for credit and terms):
  day_src.jpg        https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x5400x2700.jpg
  night_src.jpg      https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg
  clouds_without.jpg https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/earth_noClouds.0330.jpg
  clouds_with.jpg    https://svs.gsfc.nasa.gov/vis/a000000/a003600/a003615/flat_earth_Largest_still.0330.jpg
  moon_src.jpg       https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg
(save each under the name on the left)

Outputs:
  earth_day_2048.jpg, earth_night_2048.jpg   resized to 2048x1024
  earth_clouds_2048.png                      white RGBA, alpha = cloud cover recovered from the with/without pair
  moon_1024.jpg                              1024x512
"""
import os, sys
from PIL import Image, ImageChops, ImageFilter, ImageStat

raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
Image.MAX_IMAGE_PIXELS = 100_000_000
W, H = 2048, 1024
save = lambda im, name, **kw: im.save(os.path.join(out, name), **kw)

def load(name, size=None):
    im = Image.open(os.path.join(raw, name)).convert('RGB')
    print(f'{name}: {im.size[0]}x{im.size[1]}')
    return im.resize(size, Image.LANCZOS) if size and im.size != size else im

# --- day, night, moon: straight resizes ---
save(load('day_src.jpg', (W, H)), 'earth_day_2048.jpg', quality=88, optimize=True, progressive=True)
save(load('night_src.jpg', (W, H)), 'earth_night_2048.jpg', quality=88, optimize=True, progressive=True)
save(load('moon_src.jpg', (1024, 512)), 'moon_1024.jpg', quality=88, optimize=True, progressive=True)

# --- clouds: recover cover from the with/without pair ---
lw = load('clouds_with.jpg', (W, H)).convert('L')
lo = load('clouds_without.jpg', (W, H)).convert('L')

# the two images must be registered, or the difference is garbage: compare mean absolute difference at several shifts
small = lambda im: im.resize((512, 256), Image.BOX)
sw, so = small(lw), small(lo)
mad = {dx: ImageStat.Stat(ImageChops.difference(ImageChops.offset(sw, dx, 0), so)).mean[0] for dx in range(-8, 9)}
best = min(mad, key=mad.get)
print(f'registration: mean abs difference {mad[0]:.2f}/255 at no shift; best shift = {best * 4} px ({mad[best]:.2f})')
# clouds legitimately make the images differ a lot, so judge alignment by a clear minimum at zero shift, not by a threshold
if best != 0 or min(mad[-1], mad[1]) < mad[0] * 1.03:
    sys.exit('images are not registered; refusing to derive clouds')

# clouds are (near) white: with = a*white + (1-a)*without  =>  a = (with - without) / (1 - without)
num = ImageChops.subtract(lw, lo)                       # clipped at 0: clouds only brighten the surface
den = lo.point(lambda v: max(255 - v, 15))              # headroom left to white (floor avoids dividing by ~0)
a_num, a_den = num.load(), den.load()
cover = Image.new('L', (W, H))
px, src_o = cover.load(), lo.load()
for y in range(H):
    for x in range(W):
        if src_o[x, y] > 237:          # snow/ice is already white: cover cannot be told apart there
            continue
        v = min(255, a_num[x, y] * 255 // a_den[x, y])
        if v >= 8: px[x, y] = v        # drop noise so clear sky stays clear
# The two source images differ slightly in colour grading and coastline sharpness, which leaves 1-px ghost coastlines and a
# faint haze over bright land. A median filter removes the thin lines; a soft floor removes the haze but keeps real cloud.
cover = cover.filter(ImageFilter.MedianFilter(5))
FLOOR = 56  # alpha below ~22% is treated as no cloud
cover = cover.point(lambda v: 0 if v <= FLOOR else min(255, (v - FLOOR) * 255 // (255 - FLOOR)))
# The source cloud composite only covers roughly 60 N to 60 S and stops in a hard line. Fade the layer out over ~10 degrees
# before each limit so no ring shows on the globe.
rows = cover.resize((1, H), Image.BOX)           # average cover per row, so stray pixels near the poles do not count
ys = [y for y in range(H) if rows.getpixel((0, y)) > 6]
top = bottom = ys[0]
for y in ys[1:]:                 # main band = first run of cloud rows, tolerating gaps of < 8 rows
    if y - bottom > 8: break
    bottom = y
R = 64
ramp = Image.new('L', (1, H), 0)
ramp.putdata([0 if y < top or y > bottom else int(255 * min(1.0, (y - top) / R, (bottom - y) / R)) for y in range(H)])
cover = ImageChops.multiply(cover, ramp.resize((W, H)))
print(f'cloud rows {top}..{bottom} of {H} (latitude {90 - 180 * top / H:.0f} to {90 - 180 * bottom / H:.0f}), faded over {R} rows')
stat = ImageStat.Stat(cover)
print(f'cloud alpha: mean {stat.mean[0] / 255:.3f}, max {stat.extrema[0][1]}')
rgba = Image.merge('RGBA', (*([Image.new('L', (W, H), 255)] * 3), cover))
save(rgba, 'earth_clouds_2048.png', optimize=True)

for f in sorted(os.listdir(out)):
    print(f'{f:24s} {os.path.getsize(os.path.join(out, f)):>9,d} B')

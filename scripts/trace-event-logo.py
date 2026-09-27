"""Rebuild the event world's geometry from NucleusLogo_transparent.png.

Development-only dependencies: Pillow, numpy, opencv-python.
The generated JSON is shipped with the app; no image processing runs on visitors' devices.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
image = Image.open(ROOT / "NucleusLogo_transparent.png").convert("RGBA")
box = image.getbbox()
scale = 0.5
alpha = np.array(image.crop(box).resize((336, 313)))[:, :, 3]
ink = (alpha > 110).astype(np.uint8) * 255
unit = 44 / 336

# Retain the raster's outline and internal loops, closing only tiny breaks in
# the perimeter before filling the enclosed rooms with a floor.
closed = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
floor = np.zeros_like(ink)
cv2.drawContours(floor, contours, -1, 255, cv2.FILLED)

def pixel(p):
    return (round((p[0] - box[0]) * scale), round((p[1] - box[1]) * scale))

# This continuous corridor cuts doorways through the traced logo's partitions.
# All coordinates refer to the original PNG so the route is easy to maintain.
route_source = [(898, 710), (863, 663), (830, 611), (774, 596), (718, 590),
                (660, 561), (581, 505), (548, 453), (535, 400), (555, 351),
                (610, 380), (646, 350), (638, 294), (640, 243), (667, 211),
                (710, 222), (727, 317), (761, 382), (807, 327), (814, 257),
                (865, 295), (922, 300), (965, 328), (949, 415)]
route = np.array([pixel(p) for p in route_source], np.int32)
corridor = np.zeros_like(ink)
cv2.polylines(corridor, [route], False, 255, 16, cv2.LINE_8)
# Keep every doorway and the tail entrance within the original silhouette.
walls = ink.copy()
walls[corridor > 0] = 0
free = cv2.bitwise_and(floor, cv2.bitwise_not(walls))
clearance = cv2.erode(free, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))

def world(p):
    return [round((float(p[0]) - 168) * unit, 3), round((float(p[1]) - 156.5) * unit, 3)]

def polygon(c):
    return [world(p[0]) for p in cv2.approxPolyDP(c, 0.55, True)]

wall_contours, hierarchy = cv2.findContours(walls, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
wall_shapes = []
for i, c in enumerate(wall_contours):
    if hierarchy[0][i][3] != -1 or cv2.contourArea(c) < 3:
        continue
    holes = []
    child = hierarchy[0][i][2]
    while child != -1:
        holes.append(polygon(wall_contours[child]))
        child = hierarchy[0][child][0]
    wall_shapes.append({"outline": polygon(c), "holes": holes})

rows = []
for row in clearance:
    padded = np.pad(row > 0, (1, 1)).astype(np.int8)
    changes = np.flatnonzero(np.diff(padded)).tolist()
    rows.append(changes)

stations_source = [(718, 590), (548, 453), (667, 211), (814, 257), (949, 415)]
data = {
    "source": "NucleusLogo_transparent.png",
    "width": 336, "height": 313, "unit": unit,
    "floor": [polygon(c) for c in contours if cv2.contourArea(c) > 20],
    "walls": wall_shapes,
    "walkableRows": rows,
    "route": [world(p) for p in route],
    "spawn": world(route[0]),
    "stations": [world(pixel(p)) for p in stations_source],
}
(ROOT / "src/lib/event-logo.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")

preview = np.zeros((*ink.shape, 3), dtype=np.uint8)
preview[:] = (8, 15, 20)
preview[floor > 0] = (30, 52, 48)
preview[clearance > 0] = (46, 83, 73)
preview[walls > 0] = (174, 236, 210)
cv2.polylines(preview, [route], False, (214, 187, 127), 1)
debug = Image.fromarray(preview).resize((672, 626))
draw = ImageDraw.Draw(debug)
for i, p in enumerate(stations_source):
    x, y = pixel(p)
    draw.ellipse((x*2-9, y*2-9, x*2+9, y*2+9), fill=(226, 210, 170))
    draw.text((x*2-3, y*2-6), str(i+1), fill=(0, 0, 0))
(ROOT / "test-results").mkdir(exist_ok=True)
debug.save(ROOT / "test-results/logo-floorplan.png")
print(f"Generated {len(wall_shapes)} wall shapes, {sum(len(r) for r in rows)//2} navigation spans.")

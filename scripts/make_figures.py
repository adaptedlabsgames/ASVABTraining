#!/usr/bin/env python3
"""Generates the diagrams in data/figures/ (circuits and machines) as SVG files.

Usage: python3 scripts/make_figures.py

Diagrams are dark lines on a transparent background. The site shows them on
a white panel, so they read the same in light and dark mode. Edit a drawing
here and rerun the script rather than editing the SVG files by hand.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'data' / 'figures'
INK = '#1a1f29'


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="15">\n{body}\n</svg>\n')


def text(x, y, s, anchor='middle', size=15, weight='normal'):
    return (f'<text x="{x}" y="{y}" fill="{INK}" stroke="none" text-anchor="{anchor}" '
            f'font-size="{size}" font-weight="{weight}">{s}</text>')


def path(d, extra=''):
    return f'<path d="{d}" {extra}/>'


def dot(x, y):
    return f'<circle cx="{x}" cy="{y}" r="4" fill="{INK}" stroke="none"/>'


# ---------- Parts, drawn at a given position ----------

def resistor_h(x1, y, x2):
    """Horizontal resistor (zigzag 70 wide) centered between x1 and x2."""
    mid = (x1 + x2) / 2
    a, b = mid - 35, mid + 35
    zig = 'l5 -12 ' + ' '.join('l10 24' if i % 2 == 0 else 'l10 -24' for i in range(6)) + ' l5 12'
    return path(f'M{x1} {y} H{a} {zig} H{x2}')


def resistor_v(x, y1, y2):
    """Vertical resistor (zigzag 70 tall) centered between y1 and y2."""
    mid = (y1 + y2) / 2
    a = mid - 35
    zig = 'l12 5 ' + ' '.join('l-24 10' if i % 2 == 0 else 'l24 10' for i in range(6)) + ' l-12 5'
    return path(f'M{x} {y1} V{a} {zig} V{y2}')


def battery_v(x, y_top, y_bottom, label=None):
    """Vertical battery on a left-side wire: long (+) plate above, short plate below."""
    mid = (y_top + y_bottom) / 2
    parts = [
        path(f'M{x} {y_top} V{mid - 6}'),
        path(f'M{x - 16} {mid - 6} H{x + 16}'),
        path(f'M{x - 8} {mid + 6} H{x + 8}', 'stroke-width="4"'),
        path(f'M{x} {mid + 6} V{y_bottom}'),
        text(x - 24, mid - 10, '+', size=16, weight='bold'),
    ]
    if label:
        parts.append(text(x + 22, mid + 5, label, anchor='start'))
    return '\n'.join(parts)


def lamp(cx, cy, r=14):
    """Lamp: circle with an X. Filled white so it hides the wire behind it."""
    k = r * 0.707
    return '\n'.join([
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff"/>',
        path(f'M{cx - k} {cy - k} L{cx + k} {cy + k} M{cx + k} {cy - k} L{cx - k} {cy + k}'),
    ])


# ---------- Single symbols (200 × 80, leads left and right) ----------

def symbol(body, w=200, h=80):
    return svg(w, h, body)


SYMBOLS = {
    'sym-resistor': symbol(resistor_h(20, 40, 180)),
    'sym-capacitor': symbol('\n'.join([
        path('M20 40 H94'), path('M94 16 V64'), path('M106 16 V64'), path('M106 40 H180')])),
    'sym-battery': symbol('\n'.join([
        path('M20 40 H80'),
        path('M80 14 V66'), path('M92 28 V52', 'stroke-width="4"'),
        path('M108 14 V66'), path('M120 28 V52', 'stroke-width="4"'),
        path('M120 40 H180'),
        text(70, 18, '+', size=16, weight='bold')])),
    'sym-ground': symbol('\n'.join([
        path('M100 8 V44'), path('M70 44 H130'), path('M80 56 H120'), path('M90 68 H110')])),
    'sym-diode': symbol('\n'.join([
        path('M20 40 H84'),
        path('M84 20 L84 60 L116 40 Z', f'fill="{INK}"'),
        path('M116 20 V60'), path('M116 40 H180')])),
    'sym-lamp': symbol('\n'.join([path('M20 40 H180'), lamp(100, 40, 18)])),
    'sym-switch': symbol('\n'.join([
        path('M20 40 H78'), '<circle cx="82" cy="40" r="4" fill="#ffffff"/>',
        path('M85 38 L118 18'),
        '<circle cx="122" cy="40" r="4" fill="#ffffff"/>', path('M126 40 H180')])),
    'sym-inductor': symbol(path('M20 40 H60 ' + ' '.join(['a10 10 0 0 1 20 0'] * 4) + ' H180')),
}


# ---------- Circuits (340 × 200, loop from x 40 to 280) ----------

L, R, T, B = 40, 280, 40, 160  # loop edges


def circuit_series_2r():
    return svg(340, 200, '\n'.join([
        battery_v(L, T, B, '12 V'),
        path(f'M{L} {T} H130'), resistor_h(130, T, 210), path(f'M210 {T} H{R}'),
        resistor_v(R, T, B), path(f'M{R} {B} H{L}'),
        text(170, 24, '2 Ω'), text(R + 18, 105, '4 Ω', anchor='start'),
    ]))


def circuit_parallel_2r():
    return svg(340, 200, '\n'.join([
        battery_v(L, T, B, '12 V'),
        path(f'M{L} {T} H{R}'), path(f'M{L} {B} H{R}'),
        resistor_v(170, T, B), resistor_v(R, T, B),
        dot(170, T), dot(170, B),
        text(194, 105, '6 Ω', anchor='start'), text(R + 18, 105, '6 Ω', anchor='start'),
    ]))


def circuit_series_lamps():
    return svg(340, 200, '\n'.join([
        battery_v(L, T, B),
        path(f'M{L} {T} H{R} V{B} H{L}'),
        lamp(120, T), lamp(210, T), lamp(R, 100),
        text(120, 20, 'A'), text(210, 20, 'B'), text(R + 24, 105, 'C', anchor='start'),
    ]))


def circuit_parallel_lamps():
    return svg(340, 200, '\n'.join([
        battery_v(L, T, B),
        path(f'M{L} {T} H{R}'), path(f'M{L} {B} H{R}'),
        path(f'M140 {T} V{B}'), path(f'M210 {T} V{B}'), path(f'M{R} {T} V{B}'),
        lamp(140, 100), lamp(210, 100), lamp(R, 100),
        dot(140, T), dot(140, B), dot(210, T), dot(210, B),
        text(160, 105, 'A', anchor='start'), text(230, 105, 'B', anchor='start'), text(R + 20, 105, 'C', anchor='start'),
    ]))


def circuit_open_switch():
    return svg(340, 200, '\n'.join([
        battery_v(L, T, B),
        path(f'M{L} {T} H{R} V{B} H184'),
        '<circle cx="180" cy="160" r="4" fill="#ffffff"/>',
        path('M176 158 L142 138'),
        '<circle cx="140" cy="160" r="4" fill="#ffffff"/>',
        path(f'M136 {B} H{L}'),
        lamp(160, T),
    ]))


CIRCUITS = {
    'ei-series-2r': circuit_series_2r(),
    'ei-parallel-2r': circuit_parallel_2r(),
    'ei-series-lamps': circuit_series_lamps(),
    'ei-parallel-lamps': circuit_parallel_lamps(),
    'ei-open-switch': circuit_open_switch(),
}


# ---------- Mechanical parts ----------
import math

LIQUID = '#cfe0f5'


def arrow(x1, y1, x2, y2, head=10):
    """Straight arrow from (x1, y1) to (x2, y2) with a filled head."""
    a = math.atan2(y2 - y1, x2 - x1)
    hx1 = x2 - head * math.cos(a - 0.45)
    hy1 = y2 - head * math.sin(a - 0.45)
    hx2 = x2 - head * math.cos(a + 0.45)
    hy2 = y2 - head * math.sin(a + 0.45)
    return '\n'.join([
        path(f'M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}'),
        path(f'M{x2:.1f} {y2:.1f} L{hx1:.1f} {hy1:.1f} L{hx2:.1f} {hy2:.1f} Z', f'fill="{INK}"'),
    ])


def turn_arrow(cx, cy, r, clockwise=True):
    """Curved arrow over the top of a wheel showing which way it turns."""
    a1, a2 = math.radians(-150), math.radians(-30)
    if not clockwise:
        a1, a2 = a2, a1
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    x2, y2 = cx + r * math.cos(a2), cy + r * math.sin(a2)
    sweep = 1 if clockwise else 0
    # Arrowhead tangent to the arc at its end.
    t = a2 + (math.pi / 2 if clockwise else -math.pi / 2)
    hx, hy = x2 + 11 * math.cos(t + math.pi - 0.5), y2 + 11 * math.sin(t + math.pi - 0.5)
    gx, gy = x2 + 11 * math.cos(t + math.pi + 0.5), y2 + 11 * math.sin(t + math.pi + 0.5)
    return '\n'.join([
        path(f'M{x1:.1f} {y1:.1f} A{r} {r} 0 0 {sweep} {x2:.1f} {y2:.1f}'),
        path(f'M{x2:.1f} {y2:.1f} L{hx:.1f} {hy:.1f} L{gx:.1f} {gy:.1f} Z', f'fill="{INK}"'),
    ])


def gear(cx, cy, r, teeth, label=None, phase=0.0, label_y=None):
    """Gear outline with trapezoid teeth. r is the pitch radius."""
    depth = 7
    ro, ri = r + depth / 2, r - depth / 2
    pts = []
    step = 2 * math.pi / teeth
    for i in range(teeth):
        a = i * step + phase
        for frac, rad in ((0.0, ri), (0.15, ro), (0.45, ro), (0.6, ri)):
            ang = a + frac * step
            pts.append(f'{cx + rad * math.cos(ang):.1f} {cy + rad * math.sin(ang):.1f}')
    parts = [
        path('M' + ' L'.join(pts) + ' Z', 'fill="#ffffff"'),
        f'<circle cx="{cx}" cy="{cy}" r="5" fill="{INK}" stroke="none"/>',
    ]
    if label:
        parts.append(text(cx, label_y if label_y is not None else cy + r + 26, label, weight='bold'))
    return '\n'.join(parts)


def ceiling(x1, x2, y):
    hatch = ' '.join(f'M{x} {y} l-8 -8' for x in range(int(x1) + 8, int(x2) + 1, 12))
    return '\n'.join([path(f'M{x1} {y} H{x2}'), path(hatch, 'stroke-width="1.5"')])


def weight_box(x, y, w, h, label):
    return '\n'.join([
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#ffffff"/>',
        text(x + w / 2, y + h / 2 + 5, label, weight='bold'),
    ])


def wheel(cx, cy, r):
    return '\n'.join([
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff"/>',
        f'<circle cx="{cx}" cy="{cy}" r="4" fill="{INK}" stroke="none"/>',
    ])


def dim(x1, x2, y, label):
    """Horizontal dimension line with end ticks and a label underneath."""
    return '\n'.join([
        path(f'M{x1} {y} H{x2}', 'stroke-width="1.5"'),
        path(f'M{x1} {y - 6} V{y + 6} M{x2} {y - 6} V{y + 6}', 'stroke-width="1.5"'),
        text((x1 + x2) / 2, y + 20, label),
    ])


def fulcrum(x, y):
    return path(f'M{x} {y} L{x - 18} {y + 30} H{x + 18} Z', 'fill="#ffffff"')


# ---------- Mechanical figures ----------

def lever_balance_force():
    # 20 px per foot; fulcrum at x = 130.
    return svg(340, 200, '\n'.join([
        path('M30 100 H310', 'stroke-width="5"'),
        fulcrum(130, 102),
        weight_box(45, 58, 50, 40, '100 lb'),
        arrow(250, 40, 250, 96),
        text(250, 30, 'Force = ?', weight='bold'),
        dim(70, 130, 160, '3 ft'),
        dim(130, 250, 160, '6 ft'),
    ]))


def lever_balance_distance():
    return svg(340, 200, '\n'.join([
        path('M30 100 H310', 'stroke-width="5"'),
        fulcrum(130, 102),
        weight_box(25, 58, 50, 40, '60 lb'),
        weight_box(225, 58, 50, 40, '40 lb'),
        dim(50, 130, 160, '4 ft'),
        dim(130, 250, 160, '? ft'),
    ]))


def pulley_fixed():
    return svg(300, 230, '\n'.join([
        ceiling(90, 230, 20),
        path('M160 20 V36'),
        wheel(160, 56, 20),
        path('M140 56 V150'), path('M180 56 V170'),
        weight_box(110, 150, 60, 44, '100 lb'),
        arrow(180, 170, 180, 214),
        text(205, 200, 'Pull = ?', anchor='start', weight='bold'),
    ]))


def pulley_movable():
    return svg(300, 240, '\n'.join([
        ceiling(60, 200, 20),
        path('M120 20 V130'),
        wheel(140, 130, 20),
        path('M160 130 V60'),
        arrow(160, 60, 160, 24),
        text(172, 44, 'Pull = ?', anchor='start', weight='bold'),
        path('M140 150 V170'),
        weight_box(110, 170, 60, 44, '100 lb'),
    ]))


def pulley_tackle():
    strands = ' '.join(f'M{x} 60 V140' for x in (120, 150, 170, 200))
    return svg(320, 250, '\n'.join([
        ceiling(90, 230, 20),
        path('M160 20 V35'),
        f'<rect x="108" y="35" width="104" height="10" rx="3" fill="#ffffff"/>',
        path(strands),
        wheel(135, 60, 15), wheel(185, 60, 15),
        wheel(135, 140, 15), wheel(185, 140, 15),
        f'<rect x="108" y="155" width="104" height="10" rx="3" fill="#ffffff"/>',
        path('M185 45 V45 M185 45 Q240 45 250 70 V170'),
        arrow(250, 170, 250, 210),
        text(262, 196, 'Pull = ?', anchor='start', weight='bold'),
        path('M160 165 V180'),
        weight_box(125, 180, 70, 44, '200 lb'),
    ]))


def gears_pair():
    return svg(340, 220, '\n'.join([
        gear(110, 110, 60, 16, 'A'),
        gear(229, 110, 52, 14, 'B', phase=math.pi / 14),
        turn_arrow(110, 110, 82, clockwise=True),
    ]))


def gears_three():
    return svg(340, 200, '\n'.join([
        gear(70, 100, 46, 12, 'A'),
        gear(165, 100, 42, 11, 'B', phase=0.3),
        gear(258, 100, 44, 12, 'C', phase=0.1),
        turn_arrow(70, 100, 66, clockwise=True),
    ]))


def gears_teeth():
    # Pitch radii in a 1:3 ratio so the drawn teeth match the labels.
    return svg(340, 230, '\n'.join([
        gear(70, 110, 26, 10, 'A: 10 teeth', label_y=218),
        gear(70 + 26 + 78, 110, 78, 30, 'B: 30 teeth', phase=0.05, label_y=218),
    ]))


def belt(crossed):
    a, b, r, y = 100, 240, 40, 100
    if crossed:
        lines = path(f'M{a} {y - r} L{b} {y + r} M{a} {y + r} L{b} {y - r}')
    else:
        lines = path(f'M{a} {y - r} H{b} M{a} {y + r} H{b}')
    return svg(340, 200, '\n'.join([
        lines,
        wheel(a, y, r), wheel(b, y, r),
        turn_arrow(a, y, r + 18, clockwise=True),
        text(a, y + r + 34, 'Driver', weight='bold'),
        text(b, y + r + 34, '?', weight='bold'),
    ]))


def ramp():
    ang = math.degrees(math.atan2(70, 260))
    return svg(340, 210, '\n'.join([
        path('M40 170 H300 V100 Z', 'fill="#ffffff"'),
        f'<g transform="translate(165 136) rotate({-ang:.1f})">'
        f'<rect x="-28" y="-36" width="56" height="34" rx="3" fill="#ffffff"/>'
        f'{text(0, -14, "200 lb", weight="bold")}</g>',
        text(150, 186, '12 ft along the ramp'),
        text(312, 140, '3 ft', anchor='start'),
        path('M300 170 h-12 v-12 h12', 'stroke-width="1.5"'),
    ]))


def hydraulic():
    return svg(340, 230, '\n'.join([
        path('M60 80 H90 V150 H200 V80 H290 V170 H60 Z', f'fill="{LIQUID}" stroke="none"'),
        path('M60 50 V170 H290 V50 M90 50 V150 H200 V50'),
        f'<rect x="60" y="72" width="30" height="8" fill="{INK}" stroke="none"/>',
        f'<rect x="200" y="72" width="90" height="8" fill="{INK}" stroke="none"/>',
        arrow(75, 14, 75, 68),
        text(98, 26, '10 lb', anchor='start', weight='bold'),
        arrow(245, 66, 245, 16),
        text(260, 30, '?', anchor='start', weight='bold'),
        text(75, 196, 'Area: 2 sq in'),
        text(245, 196, 'Area: 20 sq in'),
    ]))


def tank():
    holes = [(70, 'A'), (110, 'B'), (150, 'C')]
    return svg(300, 210, '\n'.join([
        path('M90 40 H210 V180 H90 Z', f'fill="{LIQUID}" stroke="none"'),
        path('M90 20 V180 H210 V20'),
        path('M90 40 H210', 'stroke-width="1.5" stroke-dasharray="6 5"'),
        *[f'<circle cx="210" cy="{y}" r="4" fill="#ffffff"/>' for y, _ in holes],
        *[text(228, y + 5, label, anchor='start', weight='bold') for y, label in holes],
        text(150, 200, 'Water tank with three holes'),
    ]))


MECHANICAL = {
    'mc-lever-force': lever_balance_force(),
    'mc-lever-distance': lever_balance_distance(),
    'mc-pulley-fixed': pulley_fixed(),
    'mc-pulley-movable': pulley_movable(),
    'mc-pulley-tackle': pulley_tackle(),
    'mc-gears-pair': gears_pair(),
    'mc-gears-three': gears_three(),
    'mc-gears-teeth': gears_teeth(),
    'mc-belt-open': belt(False),
    'mc-belt-crossed': belt(True),
    'mc-ramp': ramp(),
    'mc-hydraulic': hydraulic(),
    'mc-tank': tank(),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    figures = {**SYMBOLS, **CIRCUITS, **MECHANICAL}
    for name, content in figures.items():
        (OUT / f'{name}.svg').write_text(content)
    print(f'Wrote {len(figures)} figures to {OUT}')


if __name__ == '__main__':
    main()

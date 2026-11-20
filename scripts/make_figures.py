#!/usr/bin/env python3
"""Generates the circuit diagrams in data/figures/ as SVG files.

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


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, content in {**SYMBOLS, **CIRCUITS}.items():
        (OUT / f'{name}.svg').write_text(content)
    print(f'Wrote {len(SYMBOLS) + len(CIRCUITS)} figures to {OUT}')


if __name__ == '__main__':
    main()

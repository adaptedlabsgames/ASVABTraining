#!/usr/bin/env python3
"""Generates the Assembling Objects questions and their pictures.

Usage: python3 scripts/make_ao.py

Writes data/ao.json and data/figures/ao-*.svg. Everything comes from the
shape definitions below, so the answers are correct by construction:

  * Shape puzzles: the question shows the loose pieces of one cut pattern;
    the choices show whole shapes cut in four different patterns. Each
    pattern in a family has a different set of pieces, so only one choice
    can be built from the pieces shown.
  * Connections: the question marks point A on one shape and point B on
    another; each choice joins the shapes with a line at a different pair
    of points, and only one pair matches.

A fixed random seed keeps the output the same each time it runs.
"""
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIG = ROOT / 'data' / 'figures'
INK = '#1a1f29'
FILL = '#ffffff'
rng = random.Random(20261120)


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'fill="none" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="16">\n{body}\n</svg>\n')


def label(x, y, s):
    return (f'<text x="{x:.1f}" y="{y:.1f}" fill="{INK}" stroke="none" text-anchor="middle" '
            f'dominant-baseline="central" font-weight="bold">{s}</text>')


# ======================= Shape puzzles =======================
# A piece is either ('poly', [(x, y), ...]) in a 100-unit box, or
# ('sector', start_deg, end_deg) of the circle centered (50, 50), radius 50.

S = 100
H = 86.6  # height of the equilateral triangle with side 100
TA, TB, TC = (50, 0), (0, H), (100, H)
TD, TE, TM = (25, H / 2), (75, H / 2), (50, H)
TG = (50, H * 2 / 3)

FAMILIES = {
    'square': {
        'noun': 'square',
        'patterns': {
            'sq-30': ('a narrow rectangle and a wide rectangle',
                      [('poly', [(0, 0), (30, 0), (30, S), (0, S)]), ('poly', [(30, 0), (S, 0), (S, S), (30, S)])]),
            'sq-halves': ('two equal rectangles',
                          [('poly', [(0, 0), (50, 0), (50, S), (0, S)]), ('poly', [(50, 0), (S, 0), (S, S), (50, S)])]),
            'sq-diagonal': ('two equal triangles',
                            [('poly', [(0, 0), (S, 0), (S, S)]), ('poly', [(0, 0), (S, S), (0, S)])]),
            'sq-quarters': ('four small squares',
                            [('poly', [(x, y), (x + 50, y), (x + 50, y + 50), (x, y + 50)])
                             for x in (0, 50) for y in (0, 50)]),
            'sq-strips': ('three equal strips',
                          [('poly', [(x, 0), (x + S / 3, 0), (x + S / 3, S), (x, S)]) for x in (0, S / 3, 2 * S / 3)]),
            'sq-corner-square': ('a small square and an L-shaped piece',
                                 [('poly', [(50, 0), (S, 0), (S, 50), (50, 50)]),
                                  ('poly', [(0, 0), (50, 0), (50, 50), (S, 50), (S, S), (0, S)])]),
            'sq-corner-triangle': ('a small triangle and a five-sided piece',
                                   [('poly', [(0, 0), (60, 0), (0, 60)]),
                                    ('poly', [(60, 0), (S, 0), (S, S), (0, S), (0, 60)])]),
            'sq-wedge': ('a long, thin triangle and a four-sided piece',
                         [('poly', [(0, 0), (S, 0), (S, 60)]), ('poly', [(0, 0), (S, 60), (S, S), (0, S)])]),
        },
    },
    'circle': {
        'noun': 'circle',
        'patterns': {
            'ci-halves': ('two half circles', [('sector', 0, 180), ('sector', 180, 360)]),
            'ci-quarters': ('four quarter circles', [('sector', a, a + 90) for a in (0, 90, 180, 270)]),
            'ci-quarter-rest': ('a quarter circle and a three-quarter piece', [('sector', 0, 90), ('sector', 90, 360)]),
            'ci-thirds': ('three equal wedges', [('sector', a, a + 120) for a in (0, 120, 240)]),
        },
    },
    'triangle': {
        'noun': 'triangle',
        'patterns': {
            'tr-halves': ('two right triangles', [('poly', [TA, TB, TM]), ('poly', [TA, TM, TC])]),
            'tr-four': ('four small triangles',
                        [('poly', [TA, TD, TE]), ('poly', [TD, TB, TM]), ('poly', [TE, TM, TC]), ('poly', [TD, TM, TE])]),
            'tr-top-cut': ('a small triangle and a trapezoid', [('poly', [TA, TD, TE]), ('poly', [TD, TB, TC, TE])]),
            'tr-center': ('three equal wide triangles',
                          [('poly', [TA, TB, TG]), ('poly', [TB, TC, TG]), ('poly', [TC, TA, TG])]),
        },
    },
}


def sector_path(a1, a2, cx=50, cy=50, r=50):
    p1 = (cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1)))
    p2 = (cx + r * math.cos(math.radians(a2)), cy + r * math.sin(math.radians(a2)))
    large = 1 if (a2 - a1) % 360 > 180 else 0
    if (a2 - a1) % 360 == 0:
        return f'M{cx - r} {cy} A{r} {r} 0 1 1 {cx + r} {cy} A{r} {r} 0 1 1 {cx - r} {cy} Z'
    return f'M{cx} {cy} L{p1[0]:.2f} {p1[1]:.2f} A{r} {r} 0 {large} 1 {p2[0]:.2f} {p2[1]:.2f} Z'


def piece_path(piece):
    if piece[0] == 'poly':
        return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in piece[1]) + ' Z'
    return sector_path(piece[1], piece[2])


def piece_center(piece):
    """Center of the piece's bounding box, so it can be rotated in place."""
    if piece[0] == 'poly':
        xs = [p[0] for p in piece[1]]
        ys = [p[1] for p in piece[1]]
    else:
        a1, a2 = piece[1], piece[2]
        angles = [a1, a2] + [a for a in (0, 90, 180, 270, 360) if a1 < a < a2]
        xs = [50] + [50 + 50 * math.cos(math.radians(a)) for a in angles]
        ys = [50] + [50 + 50 * math.sin(math.radians(a)) for a in angles]
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2


def whole_svg(pieces):
    """The assembled shape, with its cut lines, centered in a 140 × 140 box."""
    ys = []
    for p in pieces:
        ys += [y for _, y in p[1]] if p[0] == 'poly' else [0, 100]
    dy = 20 + (100 - (max(ys) - min(ys))) / 2 - min(ys)
    body = '\n'.join(f'<path d="{piece_path(p)}" fill="{FILL}" transform="translate(20 {dy:.2f})"/>' for p in pieces)
    return svg(140, 140, body)


def pieces_svg(pieces, rotations):
    """Loose pieces spread out in a row, each turned by its rotation."""
    slot = 125
    w = slot * len(pieces) + 10
    parts = []
    for i, (p, rot) in enumerate(zip(pieces, rotations)):
        cx, cy = piece_center(p)
        x = 5 + slot * i + slot / 2
        parts.append(f'<g transform="translate({x:.1f} 70) rotate({rot}) translate({-cx:.2f} {-cy:.2f})">'
                     f'<path d="{piece_path(p)}" fill="{FILL}"/></g>')
    return svg(w, 140, '\n'.join(parts))


def make_puzzles():
    questions = []
    for fam_key, fam in FAMILIES.items():
        keys = list(fam['patterns'])
        for key in keys:
            desc, pieces = fam['patterns'][key]
            others = [k for k in keys if k != key]
            rng.shuffle(others)
            distractors = others[:3]
            # Turn and reorder the loose pieces so they don't sit in place.
            steps = list(range(30, 360, 30)) if fam_key == 'triangle' else [90, 180, 270]
            rots = [rng.choice([0] + steps) for _ in pieces]
            if all(r == 0 for r in rots):
                rots[0] = rng.choice(steps)
            order = list(range(len(pieces)))
            rng.shuffle(order)
            loose = [pieces[i] for i in order]
            rots = [rots[i] for i in order]
            qid = f'ao-pz-{key}'
            (FIG / f'{qid}.svg').write_text(pieces_svg(loose, rots))
            choice_keys = [key] + distractors
            noun = fam['noun']
            n = len(pieces)
            questions.append({
                'topic': 'puzzles',
                'difficulty': 1 if n == 2 else 2,
                'figure': f'data/figures/{qid}.svg',
                'figureAlt': f'Loose pieces: {desc}.',
                'question': 'Which figure shows how these pieces fit together?',
                'choices': [f'A {noun} made of {FAMILIES[fam_key]["patterns"][k][0]}' for k in choice_keys],
                'choiceImages': [f'data/figures/ao-whole-{k}.svg' for k in choice_keys],
                'answer': 0,
                'explanation': (
                    f'The pieces shown are {desc}. Only one choice is a {noun} built from exactly those pieces. '
                    f'The other choices are made of {", ".join(FAMILIES[fam_key]["patterns"][k][0] for k in distractors[:-1])}'
                    f' and {FAMILIES[fam_key]["patterns"][distractors[-1]][0]}.\n'
                    'Tip: count the pieces first, then match each piece’s shape and size. Pieces may be turned, '
                    'but they are never flipped, and their shapes never change.'),
            })
    for fam in FAMILIES.values():
        for key, (_, pieces) in fam['patterns'].items():
            (FIG / f'ao-whole-{key}.svg').write_text(whole_svg(pieces))
    return questions


# ======================= Connections =======================
# Shapes are drawn around (0, 0). Anchors are named points on each shape.

def regular(n, r, start_deg):
    return [(r * math.cos(math.radians(start_deg + i * 360 / n)), r * math.sin(math.radians(start_deg + i * 360 / n)))
            for i in range(n)]


SQ = 34
TRI = [(0, -40), (-40, 29), (40, 29)]
PENT = regular(5, 38, -90)
HEX = regular(6, 37, 180)

SHAPES = {
    'square': {
        'draw': ('poly', [(-SQ, -SQ), (SQ, -SQ), (SQ, SQ), (-SQ, SQ)]),
        'anchors': {
            'top-left corner': (-SQ, -SQ), 'top-right corner': (SQ, -SQ),
            'bottom-right corner': (SQ, SQ), 'bottom-left corner': (-SQ, SQ),
            'middle of the top side': (0, -SQ), 'middle of the right side': (SQ, 0),
            'middle of the bottom side': (0, SQ), 'middle of the left side': (-SQ, 0), 'center': (0, 0)},
    },
    'circle': {
        'draw': ('circle', 36),
        'anchors': {'top edge': (0, -36), 'right edge': (36, 0), 'bottom edge': (0, 36), 'left edge': (-36, 0), 'center': (0, 0)},
    },
    'triangle': {
        'draw': ('poly', TRI),
        'anchors': {'top corner': TRI[0], 'bottom-left corner': TRI[1], 'bottom-right corner': TRI[2],
                    'middle of the bottom side': (0, 29), 'center': (0, 6)},
    },
    'pentagon': {
        'draw': ('poly', PENT),
        'anchors': {'top corner': PENT[0], 'upper-right corner': PENT[1], 'lower-right corner': PENT[2],
                    'lower-left corner': PENT[3], 'upper-left corner': PENT[4], 'center': (0, 0)},
    },
    'hexagon': {
        'draw': ('poly', HEX),
        'anchors': {'left corner': HEX[0], 'upper-left corner': HEX[1], 'upper-right corner': HEX[2],
                    'right corner': HEX[3], 'lower-right corner': HEX[4], 'lower-left corner': HEX[5], 'center': (0, 0)},
    },
}


def shape_svg(name, cx, cy, scale=1.0):
    kind = SHAPES[name]['draw']
    if kind[0] == 'circle':
        return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{kind[1] * scale:.1f}" fill="{FILL}"/>'
    pts = ' L'.join(f'{cx + x * scale:.1f} {cy + y * scale:.1f}' for x, y in kind[1])
    return f'<path d="M{pts} Z" fill="{FILL}"/>'


def anchor_xy(name, anchor, cx, cy, scale=1.0):
    x, y = SHAPES[name]['anchors'][anchor]
    return cx + x * scale, cy + y * scale


def dot(x, y, r=4.5):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{INK}" stroke="none"/>'


def connection_question_svg(s1, a1, s2, a2):
    c1, c2 = (85, 80), (255, 80)
    p1 = anchor_xy(s1, a1, *c1)
    p2 = anchor_xy(s2, a2, *c2)

    def tag(c, p, letter):
        # Put the letter just outside the shape, away from its center.
        dx, dy = p[0] - c[0], p[1] - c[1]
        d = math.hypot(dx, dy)
        if d < 1:  # center: put the letter beside the dot
            return label(p[0] + 15, p[1] - 12, letter)
        return label(p[0] + dx / d * 17, p[1] + dy / d * 17, letter)

    body = [
        shape_svg(s1, *c1), shape_svg(s2, *c2),
        dot(*p1), dot(*p2), tag(c1, p1, 'A'), tag(c2, p2, 'B'),
        # The connecting line, shown on its own with its ends marked.
        f'<path d="M135 168 H205"/>', dot(135, 168, 3.5), dot(205, 168, 3.5),
        label(123, 168, 'A'), label(217, 168, 'B'),
    ]
    return svg(340, 190, '\n'.join(body))


def connection_choice_svg(s1, a1, s2, a2, dy):
    c1, c2 = (62, 75), (178, 75 + dy)
    p1 = anchor_xy(s1, a1, *c1, 0.85)
    p2 = anchor_xy(s2, a2, *c2, 0.85)
    body = [shape_svg(s1, *c1, 0.85), shape_svg(s2, *c2, 0.85),
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f}"/>', dot(*p1, 3.5), dot(*p2, 3.5)]
    return svg(240, 150, '\n'.join(body))


def make_connections(count=20):
    names = list(SHAPES)
    questions = []
    seen = set()
    while len(questions) < count:
        s1, s2 = rng.sample(names, 2)
        a1 = rng.choice(list(SHAPES[s1]['anchors']))
        a2 = rng.choice(list(SHAPES[s2]['anchors']))
        if (s1, a1, s2, a2) in seen:
            continue
        seen.add((s1, a1, s2, a2))
        others1 = [a for a in SHAPES[s1]['anchors'] if a != a1]
        others2 = [a for a in SHAPES[s2]['anchors'] if a != a2]
        # One wrong at each end, and one wrong at both ends.
        wrong = [(rng.choice(others1), a2), (a1, rng.choice(others2)), (rng.choice(others1), rng.choice(others2))]
        if len(set(wrong)) < 3:
            continue
        pairs = [(a1, a2)] + wrong
        n = len(questions) + 1
        qid = f'ao-cn-{n:02d}'
        (FIG / f'{qid}.svg').write_text(connection_question_svg(s1, a1, s2, a2))
        images = []
        for k, (x1, x2) in enumerate(pairs):
            path = f'data/figures/{qid}-{k}.svg'
            (ROOT / path).write_text(connection_choice_svg(s1, x1, s2, x2, rng.choice([-22, -10, 0, 10, 22])))
            images.append(path)
        hard = 'center' in (a1, a2) or s1 in ('pentagon', 'hexagon') or s2 in ('pentagon', 'hexagon')
        questions.append({
            'topic': 'connections',
            'difficulty': 2 if hard else 1,
            'figure': f'data/figures/{qid}.svg',
            'figureAlt': f'A {s1} with point A at its {a1}, and a {s2} with point B at its {a2}. A line has ends marked A and B.',
            'question': 'Which figure shows the line connecting the shapes at points A and B?',
            'choices': [f'A line from the {x1} of the {s1} to the {x2} of the {s2}' for x1, x2 in pairs],
            'choiceImages': images,
            'answer': 0,
            'explanation': (
                f'Point A is at the {a1} of the {s1}, and point B is at the {a2} of the {s2}. '
                'Only one choice attaches the line at both of those spots.\n'
                f'Tip: check one end at a time. Cross out every choice where the line meets the {s1} anywhere '
                f'except its {a1}, then do the same for the {s2}.'),
        })
    return questions


def main():
    FIG.mkdir(parents=True, exist_ok=True)
    for old in FIG.glob('ao-*.svg'):
        old.unlink()
    puzzles = make_puzzles()
    connections = make_connections()
    questions = []
    for i, q in enumerate(puzzles + connections, 1):
        questions.append({'id': f'ao-{i:03d}', **q})
    bank = {
        'subtest': 'ao',
        'name': 'Assembling Objects',
        'topics': {'puzzles': 'Shape Puzzles', 'connections': 'Connections'},
        'questions': questions,
    }
    (ROOT / 'data' / 'ao.json').write_text(json.dumps(bank, indent=2, ensure_ascii=False) + '\n')
    print(f'{len(puzzles)} puzzles, {len(connections)} connections, '
          f'{len(list(FIG.glob("ao-*.svg")))} pictures')


if __name__ == '__main__':
    main()

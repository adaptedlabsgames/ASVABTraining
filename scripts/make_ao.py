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


# Patterns added later. They live apart from FAMILIES so the original
# questions (and their ids) come out exactly the same.
R6 = 100 * math.sqrt(3) / 2  # hexagon height with side 50 is 86.6
HX = [(100, 43.3), (75, 86.6), (25, 86.6), (0, 43.3), (25, 0), (75, 0)]
HO = (50, 43.3)
T13 = ((50 - 50 / 3, H / 3), (50 + 50 / 3, H / 3))
T23 = ((50 - 100 / 3, 2 * H / 3), (50 + 100 / 3, 2 * H / 3))
TQ = (12.5, H * 0.75)  # a quarter of the way up the left side

EXTRA = {
    'square': {
        'sq-diamond': ('a diamond and four small triangles',
                       [('poly', [(50, 0), (S, 50), (50, S), (0, 50)]),
                        ('poly', [(0, 0), (50, 0), (0, 50)]), ('poly', [(50, 0), (S, 0), (S, 50)]),
                        ('poly', [(S, 50), (S, S), (50, S)]), ('poly', [(0, 50), (50, S), (0, S)])]),
        'sq-rect-tris': ('a wide rectangle and two long, thin triangles',
                         [('poly', [(0, 50), (S, 50), (S, S), (0, S)]),
                          ('poly', [(0, 0), (S, 0), (S, 50)]), ('poly', [(0, 0), (S, 50), (0, 50)])]),
    },
    'circle': {
        'ci-sixths': ('six equal wedges', [('sector', a, a + 60) for a in range(0, 360, 60)]),
        'ci-half-quarters': ('a half circle and two quarter circles',
                             [('sector', 0, 180), ('sector', 180, 270), ('sector', 270, 360)]),
        'ci-third-rest': ('a one-third wedge and a two-thirds piece', [('sector', 0, 120), ('sector', 120, 360)]),
    },
    'triangle': {
        'tr-strips': ('a small triangle and two trapezoids of different sizes',
                      [('poly', [TA, T13[0], T13[1]]), ('poly', [T13[0], T23[0], T23[1], T13[1]]),
                       ('poly', [T23[0], TB, TC, T23[1]])]),
        'tr-corner-cut': ('a very small triangle and a large four-sided piece',
                          [('poly', [TB, (25, H), TQ]), ('poly', [TA, TQ, (25, H), TC])]),
    },
}
NEW_FAMILIES = {
    'rectangle': {
        'noun': 'rectangle',
        'patterns': {
            're-halves-tall': ('two tall rectangles', [('poly', [(0, 0), (50, 0), (50, 60), (0, 60)]),
                                                        ('poly', [(50, 0), (S, 0), (S, 60), (50, 60)])]),
            're-halves-flat': ('two long, flat rectangles', [('poly', [(0, 0), (S, 0), (S, 30), (0, 30)]),
                                                              ('poly', [(0, 30), (S, 30), (S, 60), (0, 60)])]),
            're-diagonal': ('two equal triangles', [('poly', [(0, 0), (S, 0), (S, 60)]),
                                                    ('poly', [(0, 0), (S, 60), (0, 60)])]),
            're-quarters': ('four small rectangles', [('poly', [(x, y), (x + 50, y), (x + 50, y + 30), (x, y + 30)])
                                                      for x in (0, 50) for y in (0, 30)]),
            're-square-rect': ('a square and a narrow rectangle', [('poly', [(0, 0), (60, 0), (60, 60), (0, 60)]),
                                                                   ('poly', [(60, 0), (S, 0), (S, 60), (60, 60)])]),
            're-corner-tri': ('a triangle and a five-sided piece', [('poly', [(0, 0), (60, 0), (0, 60)]),
                                                                    ('poly', [(60, 0), (S, 0), (S, 60), (0, 60)])]),
        },
    },
    'hexagon': {
        'noun': 'hexagon',
        'patterns': {
            'hx-halves': ('two equal trapezoids', [('poly', [HX[3], HX[4], HX[5], HX[0]]),
                                                   ('poly', [HX[0], HX[1], HX[2], HX[3]])]),
            'hx-six': ('six equal triangles', [('poly', [HO, HX[i], HX[(i + 1) % 6]]) for i in range(6)]),
            'hx-rhombi': ('three equal diamonds', [('poly', [HO, HX[i], HX[i + 1], HX[(i + 2) % 6]]) for i in (0, 2, 4)]),
            'hx-trap-tris': ('a trapezoid and three small triangles',
                             [('poly', [HX[3], HX[4], HX[5], HX[0]])] + [('poly', [HO, HX[i], HX[i + 1]]) for i in (0, 1, 2)]),
        },
    },
}
HARD_PATTERNS = {'re-square-rect', 'sq-rect-tris', 'tr-strips', 'tr-corner-cut', 'ci-half-quarters', 'ci-third-rest', 're-corner-tri', 'hx-trap-tris'}


def family_pool(fam_key):
    """Every pattern for a family: original, added and new families."""
    fam = FAMILIES.get(fam_key) or NEW_FAMILIES[fam_key]
    pool = dict(fam['patterns'])
    pool.update(EXTRA.get(fam_key, {}))
    return fam['noun'], pool


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
    # Up to four pieces sit in one row; more wrap into rows of three so
    # they stay a readable size on a phone.
    cols = len(pieces) if len(pieces) <= 4 else 3
    rows = math.ceil(len(pieces) / cols)
    w = slot * cols + 10
    parts = []
    for i, (p, rot) in enumerate(zip(pieces, rotations)):
        cx, cy = piece_center(p)
        x = 5 + slot * (i % cols) + slot / 2
        y = 70 + 130 * (i // cols)
        parts.append(f'<g transform="translate({x:.1f} {y}) rotate({rot}) translate({-cx:.2f} {-cy:.2f})">'
                     f'<path d="{piece_path(p)}" fill="{FILL}"/></g>')
    return svg(w, 140 + 130 * (rows - 1), '\n'.join(parts))


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


def puzzle_question(fam_key, key, r, file_suffix=''):
    noun, pool = family_pool(fam_key)
    desc, pieces = pool[key]
    others = [k for k in pool if k != key]
    r.shuffle(others)
    distractors = others[:3]
    steps = list(range(30, 360, 30)) if fam_key in ('triangle', 'hexagon') else [90, 180, 270]
    rots = [r.choice([0] + steps) for _ in pieces]
    if all(x == 0 for x in rots):
        rots[0] = r.choice(steps)
    order = list(range(len(pieces)))
    r.shuffle(order)
    loose = [pieces[i] for i in order]
    rots = [rots[i] for i in order]
    qid = f'ao-pz-{key}{file_suffix}'
    (FIG / f'{qid}.svg').write_text(pieces_svg(loose, rots))
    choice_keys = [key] + distractors
    difficulty = 3 if key in HARD_PATTERNS else (1 if len(pieces) == 2 else 2)
    return {
        'topic': 'puzzles',
        'difficulty': difficulty,
        'figure': f'data/figures/{qid}.svg',
        'figureAlt': f'Loose pieces: {desc}.',
        'question': 'Which figure shows how these pieces fit together?',
        'choices': [f'A {noun} made of {pool[k][0]}' for k in choice_keys],
        'choiceImages': [f'data/figures/ao-whole-{k}.svg' for k in choice_keys],
        'answer': 0,
        'explanation': (
            f'The pieces shown are {desc}. Only one choice is a {noun} built from exactly those pieces. '
            f'The other choices are made of {", ".join(pool[k][0] for k in distractors[:-1])}'
            f' and {pool[distractors[-1]][0]}.\n'
            'Tip: count the pieces first, then match each piece’s shape and size. Pieces may be turned, '
            'but they are never flipped, and their shapes never change.'),
    }


def make_extra_puzzles(r):
    """New patterns (version A) and a second version (B) of every pattern."""
    questions = []
    for fam_key in ('square', 'circle', 'triangle', 'rectangle', 'hexagon'):
        _, pool = family_pool(fam_key)
        original = set(FAMILIES[fam_key]['patterns']) if fam_key in FAMILIES else set()
        for key in pool:
            if key not in original:
                questions.append(puzzle_question(fam_key, key, r))
        for key in pool:
            questions.append(puzzle_question(fam_key, key, r, '-b'))
    for fam_key in ('square', 'circle', 'triangle', 'rectangle', 'hexagon'):
        _, pool = family_pool(fam_key)
        for key, (_, pieces) in pool.items():
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


def make_connections(count=20, r=None, start=1, seen=None):
    r = r or rng
    names = list(SHAPES)
    questions = []
    seen = set() if seen is None else seen
    while len(questions) < count:
        s1, s2 = r.sample(names, 2)
        a1 = r.choice(list(SHAPES[s1]['anchors']))
        a2 = r.choice(list(SHAPES[s2]['anchors']))
        if (s1, a1, s2, a2) in seen:
            continue
        seen.add((s1, a1, s2, a2))
        others1 = [a for a in SHAPES[s1]['anchors'] if a != a1]
        others2 = [a for a in SHAPES[s2]['anchors'] if a != a2]
        # One wrong at each end, and one wrong at both ends.
        wrong = [(r.choice(others1), a2), (a1, r.choice(others2)), (r.choice(others1), r.choice(others2))]
        if len(set(wrong)) < 3:
            continue
        pairs = [(a1, a2)] + wrong
        n = start + len(questions)
        qid = f'ao-cn-{n:02d}'
        (FIG / f'{qid}.svg').write_text(connection_question_svg(s1, a1, s2, a2))
        images = []
        for k, (x1, x2) in enumerate(pairs):
            path = f'data/figures/{qid}-{k}.svg'
            (ROOT / path).write_text(connection_choice_svg(s1, x1, s2, x2, r.choice([-22, -10, 0, 10, 22])))
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
    # The original 36 questions, unchanged (ids ao-001 to ao-036).
    puzzles = make_puzzles()
    seen = set()
    connections = make_connections(seen=seen)
    # Additions use their own random seed so the originals never shift.
    r2 = random.Random(20261121)
    extra_puzzles = make_extra_puzzles(r2)
    extra_connections = make_connections(20, r=r2, start=21, seen=seen)
    questions = []
    for i, q in enumerate(puzzles + connections + extra_puzzles + extra_connections, 1):
        questions.append({'id': f'ao-{i:03d}', **q})
    puzzles = puzzles + extra_puzzles
    connections = connections + extra_connections
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

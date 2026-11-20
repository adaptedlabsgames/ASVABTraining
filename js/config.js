// Subtest registry. To add a subtest later, create data/<id>.json and add an
// entry here with ready: true. No other code changes are needed.
export const SUBTESTS = [
  {
    id: 'ar',
    name: 'Arithmetic Reasoning',
    short: 'AR',
    afqt: true,
    ready: true,
    file: 'data/ar.json',
    blurb: 'Math word problems: percents, rates, ratios, averages, interest and more.',
  },
  {
    id: 'mk',
    name: 'Math Knowledge',
    short: 'MK',
    afqt: true,
    ready: true,
    file: 'data/mk.json',
    blurb: 'Fractions, exponents, algebra and geometry.',
  },
  {
    id: 'wk',
    name: 'Word Knowledge',
    short: 'WK',
    afqt: true,
    ready: true,
    file: 'data/wk.json',
    blurb: 'Vocabulary: synonyms and words in context.',
  },
  {
    id: 'pc',
    name: 'Paragraph Comprehension',
    short: 'PC',
    afqt: true,
    ready: true,
    file: 'data/pc.json',
    blurb: 'Read short passages and answer questions about them.',
  },
  {
    id: 'gs',
    name: 'General Science',
    short: 'GS',
    afqt: false,
    ready: true,
    file: 'data/gs.json',
    blurb: 'Life science, the human body, earth and space, physics and chemistry.',
  },
  {
    id: 'as',
    name: 'Auto & Shop Information',
    short: 'AS',
    afqt: false,
    ready: true,
    file: 'data/as.json',
    blurb: 'Engines, brakes and car systems, plus tools, fasteners and shop practices.',
  },
  {
    id: 'ei',
    name: 'Electronics Information',
    short: 'EI',
    afqt: false,
    ready: true,
    file: 'data/ei.json',
    blurb: 'Current, voltage, resistance, circuits and electronic parts.',
  },
  {
    id: 'mc',
    name: 'Mechanical Comprehension',
    short: 'MC',
    afqt: false,
    ready: true,
    file: 'data/mc.json',
    blurb: 'Levers, pulleys, gears, pressure and how machines work.',
  },
];

export function getSubtest(id) {
  return SUBTESTS.find((s) => s.id === id) || null;
}

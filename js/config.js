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
];

export function getSubtest(id) {
  return SUBTESTS.find((s) => s.id === id) || null;
}

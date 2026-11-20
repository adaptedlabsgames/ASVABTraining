// Test formats and AFQT estimate. Pure functions only, so they can be
// tested with plain Node.

// AFQT sections in the order they appear on the real test.
export const AFQT_ORDER = ['ar', 'wk', 'pc', 'mk'];

// Question counts and minutes follow the paper-and-pencil ASVAB.
// (The computer version uses fewer, adaptive questions.)
export const FORMATS = {
  full: {
    label: 'Full length',
    sections: {
      ar: { count: 30, minutes: 36 },
      wk: { count: 35, minutes: 11 },
      pc: { count: 15, minutes: 13 },
      mk: { count: 25, minutes: 24 },
      gs: { count: 25, minutes: 11 },
      as: { count: 25, minutes: 11 },
      ei: { count: 20, minutes: 9 },
    },
  },
  half: {
    label: 'Half length',
    sections: {
      ar: { count: 15, minutes: 18 },
      wk: { count: 18, minutes: 6 },
      pc: { count: 8, minutes: 7 },
      mk: { count: 13, minutes: 12 },
      gs: { count: 13, minutes: 6 },
      as: { count: 13, minutes: 6 },
      ei: { count: 10, minutes: 5 },
    },
  },
};

// Official AFQT categories (by percentile score).
export const CATEGORIES = [
  { name: 'I', min: 93, max: 99 },
  { name: 'II', min: 65, max: 92 },
  { name: 'IIIA', min: 50, max: 64 },
  { name: 'IIIB', min: 31, max: 49 },
  { name: 'IVA', min: 21, max: 30 },
  { name: 'IVB', min: 16, max: 20 },
  { name: 'IVC', min: 10, max: 15 },
  { name: 'V', min: 1, max: 9 },
];

export function categoryFor(score) {
  return CATEGORIES.find((c) => score >= c.min && score <= c.max) || CATEGORIES[CATEGORIES.length - 1];
}

const clamp = (n) => Math.min(99, Math.max(1, Math.round(n)));

// scores: { ar: {correct, total}, wk: {...}, pc: {...}, mk: {...} }
// The real AFQT counts Verbal Expression (WK + PC) twice:
//   AFQT raw = 2·VE + AR + MK
// and converts that to a percentile using national norms, which are not
// public. This uses the same weighting on percent correct and returns a
// wide band, so it is only a rough practice estimate.
export function afqtEstimate(scores) {
  const pct = (s) => (s.total ? s.correct / s.total : 0);
  const { ar, wk, pc, mk } = scores;
  const veTotal = wk.total + pc.total;
  const ve = veTotal ? (wk.correct + pc.correct) / veTotal : 0;
  const weighted = ((2 * ve + pct(ar) + pct(mk)) / 4) * 100;
  const mid = clamp(weighted);
  return {
    weighted: Math.round(weighted),
    mid,
    low: clamp(mid - 8),
    high: clamp(mid + 8),
    category: categoryFor(mid),
  };
}

export function scoreSection(section) {
  let correct = 0;
  let answered = 0;
  section.items.forEach((item, i) => {
    const a = section.answers[i];
    if (a == null) return;
    answered += 1;
    if (a === item.answer) correct += 1;
  });
  const total = section.items.length;
  return { correct, answered, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

import { VERSION } from './config.js';

// Quiz engine: loading banks, choosing questions, shuffling answer choices.

// Data files are fetched once per page load and shared (read-only).
const cache = new Map();
export function loadData(path) {
  if (!cache.has(path)) {
    const p = fetch(`${path}?v=${VERSION}`).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
      return res.json();
    });
    p.catch(() => cache.delete(path)); // allow a retry after a failed load
    cache.set(path, p);
  }
  return cache.get(path);
}

export function loadBank(subtest) {
  return loadData(subtest.file);
}

export function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lower number = asked sooner when "focus on weak spots" is on.
function priority(q, history) {
  const h = history[q.id];
  if (!h) return 1; // never seen
  if (!h.lastCorrect) return 0; // missed last time
  return 2; // got it right last time
}

// level: 'easy-first' (all levels, easiest first), 'mixed' (all levels,
// random order) or 1 / 2 / 3 (only that difficulty).
export const LEVELS = [
  { value: 'easy-first', label: 'Easy first' },
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

export function matchingQuestions(questions, { topics, level }) {
  const only = ['1', '2', '3'].includes(String(level)) ? Number(level) : null;
  return questions.filter((q) => topics.includes(q.topic) && (only == null || q.difficulty === only));
}

export function pickQuestions(questions, { topics, count, focusWeak, level = 'easy-first' }, history) {
  const pool = shuffle(matchingQuestions(questions, { topics, level }));
  const weak = (q) => (focusWeak ? priority(q, history) : 0);
  const ease = (q) => (level === 'easy-first' ? q.difficulty : 0);
  // Array.prototype.sort is stable, so order stays random within each group.
  pool.sort((a, b) => weak(a) - weak(b) || ease(a) - ease(b));
  return count ? pool.slice(0, count) : pool;
}

// Returns a copy of the question with its choices in random order.
export function prepare(q) {
  const order = shuffle(q.choices.map((_, i) => i));
  return {
    ...q,
    choices: order.map((i) => q.choices[i]),
    ...(q.choiceImages ? { choiceImages: order.map((i) => q.choiceImages[i]) } : {}),
    answer: order.indexOf(q.answer),
  };
}

// Picks `count` questions spread evenly across topics, in random order,
// keeping questions that share a reading passage next to each other.
export function pickBalanced(questions, count) {
  const groups = {};
  for (const q of shuffle(questions)) (groups[q.topic] ||= []).push(q);
  const lists = shuffle(Object.values(groups));
  const picked = [];
  while (picked.length < count && lists.some((l) => l.length)) {
    for (const l of lists) {
      if (l.length && picked.length < count) picked.push(l.shift());
    }
  }
  return groupByPassage(shuffle(picked));
}

export function groupByPassage(questions) {
  const groups = new Map();
  for (const q of questions) {
    const key = q.passage ?? `q:${q.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }
  return [...groups.values()].flat();
}

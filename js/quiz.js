// Quiz engine: loading banks, choosing questions, shuffling answer choices.

export async function loadBank(subtest) {
  const res = await fetch(subtest.file);
  if (!res.ok) throw new Error(`Could not load ${subtest.file} (${res.status})`);
  return res.json();
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

export function pickQuestions(questions, { topics, count, focusWeak }, history) {
  let pool = shuffle(questions.filter((q) => topics.includes(q.topic)));
  if (focusWeak) {
    // Array.prototype.sort is stable, so order stays random within each group.
    pool.sort((a, b) => priority(a, history) - priority(b, history));
  }
  return count ? pool.slice(0, count) : pool;
}

// Returns a copy of the question with its choices in random order.
export function prepare(q) {
  const order = shuffle(q.choices.map((_, i) => i));
  return {
    ...q,
    choices: order.map((i) => q.choices[i]),
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

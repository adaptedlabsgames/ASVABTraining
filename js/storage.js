// Progress is kept in this browser's localStorage only. Every access is
// wrapped so the site still works (without saving) when storage is blocked.
const KEY = 'asvab-prep.v1';
const MAX_SESSIONS = 200;

function blank() {
  return { version: 1, questions: {}, sessions: [] };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return blank();
    data.questions = data.questions || {};
    data.sessions = data.sessions || [];
    return data;
  } catch {
    return blank();
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function recordAnswer(questionId, correct) {
  const data = load();
  const q = data.questions[questionId] || { seen: 0, correct: 0 };
  q.seen += 1;
  if (correct) q.correct += 1;
  q.lastCorrect = correct;
  q.lastSeen = Date.now();
  data.questions[questionId] = q;
  save(data);
}

export function recordSession(session) {
  const data = load();
  data.sessions.push({ ...session, date: Date.now() });
  if (data.sessions.length > MAX_SESSIONS) {
    data.sessions = data.sessions.slice(-MAX_SESSIONS);
  }
  save(data);
}

// Accuracy over a set of questions, using every attempt ever made.
export function accuracy(questions, history = load().questions) {
  let seen = 0;
  let correct = 0;
  let answeredQuestions = 0;
  for (const q of questions) {
    const h = history[q.id];
    if (!h) continue;
    answeredQuestions += 1;
    seen += h.seen;
    correct += h.correct;
  }
  return {
    attempts: seen,
    correct,
    answeredQuestions,
    pct: seen ? Math.round((correct / seen) * 100) : null,
  };
}

export function sessionsFor(subtestId) {
  return load().sessions.filter((s) => s.subtest === subtestId);
}

// A timed test in progress, so a reload or a trip to the home page
// doesn't lose it. The section clock keeps running while away.
const TEST_KEY = 'asvab-prep.activeTest.v1';

export function loadActiveTest() {
  try {
    const raw = localStorage.getItem(TEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveTest(test) {
  try {
    localStorage.setItem(TEST_KEY, JSON.stringify(test));
  } catch {
    // Storage blocked: the test still works, it just can't be resumed.
  }
}

export function clearActiveTest() {
  try {
    localStorage.removeItem(TEST_KEY);
  } catch {
    // ignore
  }
}

export function lastAfqtTest() {
  const tests = load().sessions.filter((s) => s.mode === 'test' && s.estimate);
  return tests[tests.length - 1] || null;
}

// Ids of questions answered wrong the last time they were seen.
// A question leaves this list once it is answered correctly.
export function missedIds(history = load().questions) {
  return Object.entries(history).filter(([, h]) => h.lastCorrect === false).map(([id]) => id);
}

// Erases all saved answers, scores and any test in progress on this device.
export function resetAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(TEST_KEY);
    localStorage.removeItem(CARDS_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(NAME_KEY);
  } catch {
    // ignore
  }
}

// Flashcard progress: { [word]: { box, due, seen } }
const CARDS_KEY = 'asvab-prep.flashcards.v1';

export function loadCardStates() {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCardState(word, state) {
  const all = loadCardStates();
  all[word] = state;
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: the session still works, it just isn't remembered.
  }
}

// Study plan from a score report: { scores: { afqt, ar, wk, ... }, savedAt }
const PLAN_KEY = 'asvab-prep.plan.v1';

export function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlan(scores) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify({ scores, savedAt: Date.now() }));
  } catch {
    // Storage blocked: the plan still shows, it just isn't remembered.
  }
}

export function clearPlan() {
  try {
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(NAME_KEY);
  } catch {
    // ignore
  }
}

// The name a student types for the progress summary (optional).
const NAME_KEY = 'asvab-prep.name.v1';

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // ignore
  }
}

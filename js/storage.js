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

// Builds the plain-text progress summary a student sends to their teacher.
// Pure functions only (no page access), so it can be tested with Node.

import { getSubtest } from './config.js';

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_DAYS = 14;
const MIN_ANSWERS = 3; // same rule as the Progress page levels

const pct = (correct, total) => Math.round((correct / total) * 100);
const fmtDate = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dayKey = (t) => new Date(t).toDateString();

/**
 * @param {object} p
 * @param {{subtest: {id, name}, bank: {topics, questions}}[]} p.items  live subtests and their banks
 * @param {{questions: object, sessions: object[]}} p.data             saved progress (storage.load())
 * @param {object|null} p.plan                                         saved study plan, if any
 * @param {object} p.cardStates                                        flashcard progress by word
 * @param {number} p.totalCards                                        words in the deck
 * @param {string[]} p.missed                                          ids of questions missed last time
 * @param {string} p.name                                              student's name (may be empty)
 * @param {number} [p.now]
 */
export function buildSummary({ items, data, plan, cardStates, totalCards, missed, name, now = Date.now() }) {
  const history = data.questions;
  const lines = [];
  lines.push(`ASVAB Prep progress${name ? ` for ${name}` : ''}`);
  lines.push(`Sent ${fmtDate(now)}`);
  lines.push('');

  // Activity
  const recent = data.sessions.filter((s) => now - s.date <= ACTIVE_WINDOW_DAYS * DAY);
  const activeDays = new Set(recent.map((s) => dayKey(s.date))).size;
  const practiceSets = data.sessions.filter((s) => s.mode === 'practice').length;
  const tests = data.sessions.filter((s) => s.mode === 'test');
  const answered = Object.values(history).reduce((n, h) => n + h.seen, 0);
  const last = data.sessions.length ? data.sessions[data.sessions.length - 1].date : null;
  lines.push(`Active ${activeDays} of the last ${ACTIVE_WINDOW_DAYS} days${last ? ` (last: ${fmtDate(last)})` : ''}`);
  lines.push(`${practiceSets} practice set${practiceSets === 1 ? '' : 's'}, ${tests.length} timed test${tests.length === 1 ? '' : 's'}, ${answered} answers in all`);

  const lastAfqt = [...tests].reverse().find((t) => t.estimate);
  if (lastAfqt) {
    const e = lastAfqt.estimate;
    lines.push(`Latest AFQT estimate: ${e.low}–${e.high} (Category ${e.category}), ${fmtDate(lastAfqt.date)}`);
  }
  if (plan?.scores?.afqt != null) lines.push(`AFQT on score report: ${plan.scores.afqt}`);

  // Accuracy by subtest
  lines.push('');
  lines.push('Accuracy by subtest:');
  const topicRows = [];
  for (const { subtest, bank } of items) {
    let seen = 0;
    let correct = 0;
    for (const q of bank.questions) {
      const h = history[q.id];
      if (h) { seen += h.seen; correct += h.correct; }
    }
    lines.push(seen ? `- ${subtest.name}: ${pct(correct, seen)}% (${seen} answers)` : `- ${subtest.name}: not started`);

    for (const [topicId, label] of Object.entries(bank.topics)) {
      let ts = 0;
      let tc = 0;
      for (const q of bank.questions) {
        if (q.topic !== topicId) continue;
        const h = history[q.id];
        if (h) { ts += h.seen; tc += h.correct; }
      }
      if (ts >= MIN_ANSWERS) topicRows.push({ label, subtest: subtest.name, pct: pct(tc, ts), seen: ts });
    }
  }

  // Weakest topics
  const weakest = topicRows.sort((a, b) => a.pct - b.pct || b.seen - a.seen).slice(0, 5);
  if (weakest.length) {
    lines.push('');
    lines.push('Weakest topics:');
    for (const t of weakest) lines.push(`- ${t.label} (${t.subtest}): ${t.pct}% (${t.seen} answers)`);
  }

  // Study plan, flashcards, review queue
  lines.push('');
  const names = Object.fromEntries(items.map(({ subtest }) => [subtest.id, subtest.name]));
  if (plan?.scores) {
    const focus = ['ar', 'wk', 'pc', 'mk']
      .filter((id) => plan.scores[id] != null)
      .sort((a, b) => plan.scores[a] - plan.scores[b])
      .slice(0, 2)
      .map((id) => names[id] || getSubtest(id)?.name || id);
    if (focus.length) lines.push(`Study plan focus: ${focus.join(' and ')}`);
  }
  const started = Object.keys(cardStates).length;
  const mastered = Object.values(cardStates).filter((s) => s.box >= 4).length;
  lines.push(`Flashcards: ${started} of ${totalCards} words started, ${mastered} mastered`);
  lines.push(`Questions still to review: ${missed.length}`);

  return lines.join('\n');
}

// Progress page: accuracy by subtest and topic, missed-question review,
// practice test history, recent sessions and a reset.
import { SUBTESTS } from './config.js';
import { loadBank } from './quiz.js';
import { load, accuracy, missedIds, resetAll, loadActiveTest } from './storage.js';
import { presetPractice } from './practice.js';
import { FORMATS } from './scoring.js';
import { el, mount } from './dom.js';

let app = null;
let token = 0; // guards against a slow load drawing over another page

export function leaveProgress() {
  token += 1;
}

export async function renderProgress(container) {
  app = container;
  document.title = 'Progress · ASVAB Prep';
  const mine = ++token;
  mount(app, el('p', { class: 'muted' }, 'Loading…'));
  const subtests = SUBTESTS.filter((s) => s.ready);
  let banks;
  try {
    banks = await Promise.all(subtests.map((s) => loadBank(s)));
  } catch {
    if (mine === token) {
      mount(app, el('p', { class: 'notice error' }, 'Could not load the question banks. Check your connection and reload the page.'));
    }
    return;
  }
  if (mine !== token) return;
  draw(subtests.map((s, i) => ({ subtest: s, bank: banks[i] })));
}

/* ---------- Building blocks ---------- */

// Plain-word level that travels with every accuracy bar, so the bar's
// meaning never depends on color alone. A couple of answers is too few
// to judge, so those read "Just started".
const MIN_ANSWERS = 3;
function level(pct, attempts) {
  if (pct == null) return { label: 'Not tried', cls: '' };
  if (attempts < MIN_ANSWERS) return { label: 'Just started', cls: '' };
  if (pct >= 80) return { label: 'Strong', cls: 'good' };
  if (pct >= 60) return { label: 'Getting there', cls: 'mid' };
  return { label: 'Needs work', cls: 'bad' };
}

function meter(pct, name) {
  return el('div', {
    class: 'meter',
    role: 'meter',
    'aria-label': name,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(pct ?? 0),
    'aria-valuetext': pct == null ? 'Not tried yet' : `${pct}% correct`,
  }, el('div', { class: 'meter-fill', style: `width:${pct ?? 0}%` }));
}

function chip(pct, attempts) {
  const l = level(pct, attempts);
  return el('span', { class: `level ${l.cls}` }, l.label);
}

const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function openPractice(subtestId, opts) {
  presetPractice(subtestId, opts);
  location.hash = subtestId;
}

/* ---------- Page ---------- */

function draw(items) {
  const data = load();
  const history = data.questions;
  const missed = new Set(missedIds(history));
  const nameOf = Object.fromEntries(items.map((x) => [x.subtest.id, x.subtest.name]));
  const anyActivity = data.sessions.length > 0 || Object.keys(history).length > 0;

  /* Overview: one card per subtest */
  const overview = el('div', { class: 'grid' }, items.map(({ subtest, bank }) => {
    const a = accuracy(bank.questions, history);
    return el('div', { class: 'card stat-card' },
      el('div', { class: 'stat-head' }, el('h3', {}, subtest.name), chip(a.pct, a.attempts)),
      el('div', { class: 'stat-value' }, a.pct == null ? '—' : `${a.pct}%`),
      meter(a.pct, `${subtest.name} accuracy`),
      el('div', { class: 'small muted' },
        `${a.answeredQuestions} of ${bank.questions.length} questions tried · ${plural(a.attempts, 'answer')}`),
    );
  }));

  /* Review queue */
  const queueRows = items
    .map(({ subtest, bank }) => ({ subtest, ids: bank.questions.filter((q) => missed.has(q.id)).map((q) => q.id) }))
    .filter((r) => r.ids.length);
  const queue = queueRows.length
    ? el('div', { class: 'card list-card' }, queueRows.map(({ subtest, ids }) =>
      el('div', { class: 'list-row' },
        el('div', {},
          el('strong', {}, subtest.name),
          el('div', { class: 'small muted' }, `${plural(ids.length, 'question')} you got wrong last time`),
        ),
        el('button', { class: 'btn', type: 'button', onclick: () => openPractice(subtest.id, { questionIds: ids }) },
          `Review ${ids.length}`),
      )))
    : el('p', { class: 'muted' },
      'Nothing to review. Questions you get wrong show up here until you answer them correctly.');

  /* Practice test history */
  const tests = data.sessions.filter((s) => s.mode === 'test').slice(-10).reverse();
  const active = loadActiveTest();
  const testTable = tests.length
    ? el('div', { class: 'card table-wrap' },
      el('table', {},
        el('thead', {}, el('tr', {},
          el('th', {}, 'Date'), el('th', {}, 'Test'), el('th', {}, 'Correct'), el('th', {}, 'AFQT estimate'))),
        el('tbody', {}, tests.map((t) => {
          const length = FORMATS[t.format]?.label || '';
          const what = t.subtest === 'afqt' ? `AFQT, ${length.toLowerCase()}` : `${nameOf[t.subtest] || t.subtest}, ${length.toLowerCase()}`;
          return el('tr', {},
            el('td', { class: 'nowrap' }, shortDate(t.date)),
            el('td', {}, what),
            el('td', { class: 'nowrap' }, `${t.correct} / ${t.total}`),
            el('td', { class: 'nowrap' }, t.estimate ? `${t.estimate.low}–${t.estimate.high} (${t.estimate.category})` : '—'),
          );
        })),
      ))
    : el('p', { class: 'muted' }, 'No practice tests yet. ', el('a', { href: '#test' }, 'Take one'), ' to get an estimated AFQT range.');

  /* Topics, weakest first; untried topics last */
  const topicSections = items.map(({ subtest, bank }) => {
    const rows = Object.entries(bank.topics).map(([id, label]) => {
      const qs = bank.questions.filter((q) => q.topic === id);
      return { id, label, qs, a: accuracy(qs, history) };
    }).sort((x, y) => (x.a.pct ?? 101) - (y.a.pct ?? 101));
    return el('section', { class: 'card topic-card' },
      el('h3', {}, subtest.name),
      el('div', { class: 'topic-rows' }, rows.map((r) =>
        el('div', { class: 'topic-row' },
          el('div', { class: 'topic-name' }, r.label, el('a', { class: 'small guide-mini', href: `#guide-${subtest.id}-${r.id}` }, 'Study guide')),
          el('div', { class: 'topic-meter' },
            meter(r.a.pct, `${r.label} accuracy`),
            el('span', { class: 'topic-num' }, r.a.pct == null ? `${r.qs.length} questions` : `${r.a.pct}% · ${plural(r.a.attempts, 'answer')}`),
          ),
          chip(r.a.pct, r.a.attempts),
          el('button', {
            class: 'link-btn',
            type: 'button',
            'aria-label': `Practice ${r.label}`,
            onclick: () => openPractice(subtest.id, { topics: [r.id] }),
          }, 'Practice'),
        ))),
    );
  });

  /* Recent practice sessions */
  const recent = data.sessions.filter((s) => s.mode === 'practice').slice(-8).reverse();
  const recentList = recent.length
    ? el('div', { class: 'card table-wrap' },
      el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Date'), el('th', {}, 'Subtest'), el('th', {}, 'Score'))),
        el('tbody', {}, recent.map((s) => el('tr', {},
          el('td', { class: 'nowrap' }, shortDate(s.date)),
          el('td', {}, nameOf[s.subtest] || s.subtest),
          el('td', { class: 'nowrap' }, `${s.correct} / ${s.total} (${Math.round((s.correct / s.total) * 100)}%)`),
        ))),
      ))
    : el('p', { class: 'muted' }, 'No practice sessions yet.');

  /* Reset with an in-page confirmation */
  const resetBox = el('div', {});
  function drawReset(confirming) {
    resetBox.replaceChildren(confirming
      ? el('div', { class: 'notice warn', role: 'alert' },
        el('p', { style: 'margin:0 0 10px' },
          'This erases every saved answer, score and test in progress on this device. It can’t be undone.'),
        el('div', { class: 'actions', style: 'margin-top:0' },
          el('button', { class: 'btn danger', type: 'button', onclick: () => { resetAll(); draw(items); } }, 'Erase my progress'),
          el('button', { class: 'btn', type: 'button', onclick: () => drawReset(false) }, 'Cancel'),
        ))
      : el('button', { class: 'btn', type: 'button', onclick: () => drawReset(true) }, 'Reset progress'));
  }
  drawReset(false);

  mount(app,
    el('h1', {}, 'Your progress'),
    el('p', { class: 'lead' },
      anyActivity
        ? 'Accuracy counts every answer you’ve given in practice and on tests. Work on the weakest topics first.'
        : 'Nothing here yet. Practice a subtest or take a practice test, and your results will show up here.'),
    active ? el('p', { class: 'notice' }, 'You have a practice test in progress. ', el('a', { href: '#test' }, 'Resume it')) : null,
    el('p', { class: 'small' }, 'Have a score report? ', el('a', { href: '#plan' }, 'Turn it into a study plan'), '.'),
    el('h2', {}, 'By subtest'),
    overview,
    el('h2', {}, 'Review what you missed'),
    queue,
    el('h2', {}, 'Practice tests'),
    testTable,
    el('h2', {}, 'By topic'),
    el('p', { class: 'small muted', style: 'margin-top:-6px' }, 'Weakest topics are listed first.'),
    el('div', { class: 'topic-list-wrap' }, topicSections),
    el('h2', {}, 'Recent practice'),
    recentList,
    el('h2', {}, 'Reset'),
    el('p', { class: 'small muted' }, 'Progress is saved only in this browser on this device.'),
    resetBox,
  );
}

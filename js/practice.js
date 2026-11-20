import { getSubtest } from './config.js';
import { loadBank, pickQuestions, matchingQuestions, prepare, shuffle, LEVELS } from './quiz.js';
import { load, recordAnswer, recordSession, accuracy } from './storage.js';
import { el, mount, figure, choiceBody, choiceListClass, answerBody } from './dom.js';

const LETTERS = 'ABCDEFGH';
const COUNTS = [10, 20, 0]; // 0 = all matching questions

let app = null;
let subtest = null;
let bank = null;
let prefs = null; // last setup choices, reused for "New set"
let session = null; // { items, index, results, answered }
const banks = {}; // loaded banks, cached by subtest id

// Another page (such as Progress) can ask practice to open with chosen
// topics or a specific list of questions. Read once, then cleared.
let pending = null;
let lastLevel = 'easy-first'; // remembered between subtests during a visit
export function presetPractice(subtestId, { topics = null, questionIds = null, level = null } = {}) {
  pending = { subtestId, topics, questionIds, level };
}

// Called when the router shows another view, so a stale quiz stops
// reacting to keys and a slow bank load doesn't draw over the new view.
export function leavePractice() {
  session = null;
  subtest = null;
}

export async function renderPractice(container, subtestId) {
  app = container;
  session = null;
  subtest = getSubtest(subtestId);
  if (!subtest || !subtest.ready) {
    showError('That subtest isn’t available yet.');
    return;
  }
  document.title = `${subtest.name} · ASVAB Prep`;
  mount(app, el('p', { class: 'muted' }, 'Loading…'));
  const wanted = subtest;
  try {
    banks[wanted.id] ||= await loadBank(wanted);
    if (subtest !== wanted) return; // navigated away while loading
    bank = banks[wanted.id];
  } catch {
    showError(
      'Could not load the questions. If you opened this file directly from your computer, ' +
      'start a local web server instead (see README).',
    );
    return;
  }
  prefs = { topics: Object.keys(bank.topics), count: 10, focusWeak: true, level: lastLevel };
  const preset = pending && pending.subtestId === wanted.id ? pending : null;
  pending = null;
  if (preset?.questionIds) {
    const ids = new Set(preset.questionIds);
    const chosen = bank.questions.filter((q) => ids.has(q.id));
    if (chosen.length) {
      startSession(shuffle(chosen));
      return;
    }
  }
  if (preset?.level) prefs.level = preset.level;
  if (preset?.topics) {
    const valid = preset.topics.filter((t) => bank.topics[t]);
    if (valid.length) prefs.topics = valid;
  }
  renderSetup();
}

function showError(message) {
  mount(app, 
    el('p', { class: 'notice error' }, message),
    el('p', {}, el('a', { class: 'back-link', href: '#' }, '← Back to home')),
  );
}

function topicLabel(id) {
  return bank.topics[id] || id;
}

function passageText(q) {
  return bank.passages?.[q.passage] || '';
}

/* ---------- Setup ---------- */

function renderSetup() {
  session = null;
  const history = load().questions;
  const overall = accuracy(bank.questions, history);

  const topicBoxes = Object.entries(bank.topics).map(([id, label]) => {
    const qs = bank.questions.filter((q) => q.topic === id);
    const a = accuracy(qs, history);
    const stat = a.pct == null ? `${qs.length} questions` : `${a.pct}% · ${a.answeredQuestions}/${qs.length} tried`;
    return el('label', { class: 'check' },
      el('input', { type: 'checkbox', name: 'topic', value: id, checked: prefs.topics.includes(id) }),
      el('span', { class: 'label' }, label),
      el('span', { class: 'stat' }, stat),
    );
  });

  const countRadios = COUNTS.map((n) =>
    el('label', {},
      el('input', { type: 'radio', name: 'count', value: String(n), checked: prefs.count === n }),
      el('span', {}, n ? `${n} questions` : 'All'),
    ),
  );

  const start = el('button', { class: 'btn primary', type: 'submit' }, 'Start practice');
  const matchNote = el('span', { class: 'small muted', role: 'status', style: 'align-self:center' });
  const form = el('form', { class: 'card' },
    el('fieldset', {},
      el('legend', {}, 'Topics'),
      el('p', { class: 'small muted', style: 'margin:0 0 8px' },
        el('button', { type: 'button', class: 'link-btn', onclick: () => setAll(true) }, 'Select all'),
        ' · ',
        el('button', { type: 'button', class: 'link-btn', onclick: () => setAll(false) }, 'Clear all'),
      ),
      el('div', { class: 'topic-list' }, topicBoxes),
    ),
    el('fieldset', {},
      el('legend', {}, 'How many'),
      el('div', { class: 'segmented' }, countRadios),
    ),
    el('fieldset', {},
      el('legend', {}, 'Difficulty'),
      el('div', { class: 'segmented' }, LEVELS.map((l) =>
        el('label', {},
          el('input', { type: 'radio', name: 'level', value: l.value, checked: String(prefs.level) === l.value }),
          el('span', {}, l.label),
        ))),
      el('p', { class: 'small muted', style: 'margin:8px 0 0' },
        '“Easy first” uses every level but starts with the easiest questions. A good place to start.'),
    ),
    el('label', { class: 'check' },
      el('input', { type: 'checkbox', name: 'focusWeak', checked: prefs.focusWeak }),
      el('span', { class: 'label' },
        'Focus on weak spots',
        el('br'),
        el('span', { class: 'small muted' }, 'Questions you missed last time or haven’t seen yet come first.'),
      ),
    ),
    el('div', { class: 'actions' }, start, matchNote),
  );

  function selectedTopics() {
    return [...form.querySelectorAll('input[name=topic]:checked')].map((i) => i.value);
  }
  function setAll(on) {
    form.querySelectorAll('input[name=topic]').forEach((i) => { i.checked = on; });
    sync();
  }
  const selectedLevel = () => form.querySelector('input[name=level]:checked').value;
  function sync() {
    const n = matchingQuestions(bank.questions, { topics: selectedTopics(), level: selectedLevel() }).length;
    start.disabled = n === 0;
    matchNote.textContent = selectedTopics().length === 0
      ? 'Pick at least one topic.'
      : n === 0 ? 'No questions match. Try another difficulty.' : `${n} question${n === 1 ? '' : 's'} match`;
  }
  form.addEventListener('change', sync);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    prefs = {
      topics: selectedTopics(),
      count: Number(form.querySelector('input[name=count]:checked').value),
      focusWeak: form.querySelector('input[name=focusWeak]').checked,
      level: selectedLevel(),
    };
    lastLevel = prefs.level;
    const picked = pickQuestions(bank.questions, prefs, load().questions);
    startSession(picked);
  });
  sync();

  mount(app, 
    el('p', { class: 'small' }, el('a', { class: 'back-link', href: '#' }, '← All subtests')),
    el('h1', {}, subtest.name),
    el('p', { class: 'lead' },
      overall.pct == null
        ? `${bank.questions.length} practice questions. Pick topics and start.`
        : `${overall.pct}% correct so far across ${overall.attempts} answers.`,
    ),
    form,
  );
}

/* ---------- Questions ---------- */

function startSession(questions) {
  session = { items: questions.map(prepare), index: 0, results: [], answered: false };
  renderQuestion();
}

function renderQuestion() {
  const { items, index } = session;
  const q = items[index];
  session.answered = false;

  const choiceButtons = q.choices.map((_, i) =>
    el('li', {},
      el('button', { class: 'choice', type: 'button', 'data-i': String(i), onclick: () => answer(i) },
        el('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[i]),
        choiceBody(q, i),
      ),
    ),
  );

  mount(app, 
    el('div', { class: 'quiz-top' },
      el('span', {}, `Question ${index + 1} of ${items.length} · ${topicLabel(q.topic)}`),
      el('button', { class: 'link-btn', type: 'button', onclick: endSession }, 'End session'),
    ),
    el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(items.length), 'aria-valuenow': String(index) },
      el('div', { style: `width:${(index / items.length) * 100}%` }),
    ),
    el('div', { class: 'card' },
      q.passage
        ? el('div', { class: 'passage' },
          el('div', { class: 'passage-label' }, 'Read the passage'),
          el('p', {}, passageText(q)))
        : null,
      figure(q),
      el('p', { class: 'question-text' }, q.question),
      el('ol', { class: choiceListClass(q) }, choiceButtons),
      el('div', { id: 'feedback' }),
      el('p', { class: 'kbd-hint' },
        'Keyboard: ', el('kbd', {}, 'A'), '–', el('kbd', {}, LETTERS[q.choices.length - 1]),
        ' or ', el('kbd', {}, '1'), '–', el('kbd', {}, String(q.choices.length)),
        ' to answer, ', el('kbd', {}, 'Enter'), ' for next.',
      ),
    ),
  );
  app.querySelector('.choice')?.focus({ preventScroll: true });
}

function answer(choice) {
  if (!session || session.answered) return;
  session.answered = true;
  const q = session.items[session.index];
  const correct = choice === q.answer;
  recordAnswer(q.id, correct);
  session.results.push({ q, choice, correct });

  app.querySelectorAll('.choice').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === choice) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  const last = session.index === session.items.length - 1;
  const next = el('button', { class: 'btn primary', type: 'button', onclick: nextQuestion },
    last ? 'See results' : 'Next question');
  app.querySelector('#feedback').replaceWith(
    el('div', { class: `feedback ${correct ? 'good' : 'bad'}`, role: 'status' },
      el('strong', {}, correct ? 'Correct!' : q.choiceImages ? `Not quite. The answer is ${LETTERS[q.answer]}.` : `Not quite. The answer is ${LETTERS[q.answer]}: ${q.choices[q.answer]}`),
      el('p', { class: 'explain' }, q.explanation),
      el('div', { class: 'actions', style: 'margin-top:14px' }, next),
    ),
  );
  next.focus({ preventScroll: true });
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  next.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
}

function nextQuestion() {
  if (!session) return;
  if (session.index < session.items.length - 1) {
    session.index += 1;
    renderQuestion();
    window.scrollTo({ top: 0 });
  } else {
    endSession();
  }
}

function endSession() {
  if (!session) return;
  if (session.results.length === 0) {
    renderSetup();
    return;
  }
  const { results } = session;
  recordSession({
    subtest: subtest.id,
    mode: 'practice',
    total: results.length,
    correct: results.filter((r) => r.correct).length,
  });
  renderSummary(results);
}

/* ---------- Summary ---------- */

function renderSummary(results) {
  session = null;
  const correct = results.filter((r) => r.correct).length;
  const pct = Math.round((correct / results.length) * 100);
  const missed = results.filter((r) => !r.correct);

  const byTopic = {};
  for (const r of results) {
    const t = (byTopic[r.q.topic] ||= { right: 0, total: 0 });
    t.total += 1;
    if (r.correct) t.right += 1;
  }
  const rows = Object.entries(byTopic)
    .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
    .map(([t, s]) => el('tr', {},
      el('td', {}, topicLabel(t), ' ', el('a', { class: 'small guide-inline', href: `#guide-${subtest.id}-${t}` }, 'Study guide')),
      el('td', {}, `${s.right} / ${s.total}`)));

  const missedCards = missed.map((r) =>
    el('div', { class: 'card' },
      r.q.passage
        ? el('details', { class: 'passage-toggle' },
          el('summary', {}, 'Show passage'),
          el('p', {}, passageText(r.q)))
        : null,
      figure(r.q),
      el('p', { class: 'q' }, r.q.question),
      el('p', { class: 'ans' },
        'Your answer: ', answerBody(r.q, r.choice, 'var(--bad)'),
        el('br'),
        'Correct answer: ', answerBody(r.q, r.q.answer, 'var(--good)'),
      ),
      el('p', { class: 'explain' }, r.q.explanation),
    ),
  );

  // Retry uses the original (unshuffled) questions so choices get reshuffled.
  const originals = (rs) => rs.map((r) => bank.questions.find((q) => q.id === r.q.id));

  mount(app, 
    el('h1', {}, 'Session complete'),
    el('div', { class: 'card' },
      el('div', { class: 'muted small' }, subtest.name),
      el('div', { class: 'score-big' }, `${pct}%`),
      el('div', { class: 'muted' }, `${correct} of ${results.length} correct`),
      el('div', { class: 'actions' },
        missed.length
          ? el('button', { class: 'btn primary', type: 'button', onclick: () => startSession(originals(missed)) },
            `Retry ${missed.length} missed`)
          : null,
        el('button', { class: missed.length ? 'btn' : 'btn primary', type: 'button', onclick: renderSetup }, 'New practice set'),
        el('a', { class: 'btn', href: '#' }, 'Home'),
      ),
    ),
    el('h2', {}, 'By topic'),
    el('div', { class: 'card' },
      el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Topic'), el('th', {}, 'Score'))),
        el('tbody', {}, rows),
      ),
    ),
    missed.length ? el('h2', {}, 'Review what you missed') : null,
    missed.length ? el('div', { class: 'missed' }, missedCards) : null,
  );
  window.scrollTo({ top: 0 });
}

/* ---------- Keyboard ---------- */

document.addEventListener('keydown', (e) => {
  if (!session || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLInputElement) return;
  const q = session.items[session.index];
  if (!session.answered) {
    const key = e.key.toUpperCase();
    let i = LETTERS.indexOf(key);
    if (i === -1 && /^[1-9]$/.test(key)) i = Number(key) - 1;
    if (i >= 0 && i < q.choices.length) {
      e.preventDefault();
      answer(i);
    }
  } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
    // Enter on the focused Next button already clicks it.
    e.preventDefault();
    nextQuestion();
  }
});

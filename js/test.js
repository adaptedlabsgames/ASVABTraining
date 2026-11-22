// Timed practice test: setup → (section intro → questions → section review)×N → results.
import { getSubtest } from './config.js';
import { loadBank, prepare, pickBalanced } from './quiz.js';
import { recordAnswer, recordSession, loadActiveTest, saveActiveTest, clearActiveTest } from './storage.js';
import { FORMATS, AFQT_ORDER, FULL_ORDER, GIVES_AFQT, afqtEstimate, scoreSection } from './scoring.js';
import { el, mount, figure, choiceBody, choiceListClass, answerBody } from './dom.js';

const LETTERS = 'ABCDEFGH';
// Subtests that can be taken as a single timed section.
const SECTION_IDS = FULL_ORDER.filter((id) => getSubtest(id)?.ready && FORMATS.full.sections[id]);

let app = null;
let test = null; // the active test; see startTest() for its shape
let view = null; // 'setup' | 'intro' | 'question' | 'review' | 'quit' | 'results'
let timerId = null;
let setup = { kind: 'full', subtest: 'gs', format: 'full' };

/* ---------- Entry points ---------- */

export function renderTest(container) {
  app = container;
  document.title = 'Practice Test · ASVAB Prep';
  test = loadActiveTest();
  if (!test) return renderSetup();
  // A reload in the middle of a running section goes straight back to it.
  // Otherwise ask first, so an old unfinished test never hides the chooser.
  const s = section();
  const running = s.startedAt && !s.submitted && Date.now() < s.deadline;
  if (running) resume();
  else renderResumePrompt();
}

export function testLabel(t) {
  if (t.kind === 'full') return 'Full ASVAB practice test';
  if (t.kind === 'afqt') return 'AFQT practice test';
  return `${subtestName(t.sections[0].subtest)} timed section`;
}

function renderResumePrompt(confirming = false) {
  view = 'resume';
  stopTimer();
  const s = section();
  const where = `Section ${test.current + 1} of ${test.sections.length}: ${subtestName(s.subtest)}`;
  mount(app,
    el('div', { class: 'card' },
      el('h1', {}, 'You have a test in progress'),
      el('p', {}, el('strong', {}, testLabel(test)), ` (${FORMATS[test.format]?.label.toLowerCase() || ''})`),
      el('p', { class: 'muted' }, `Next up: ${where}`),
      confirming === true
        ? el('div', { class: 'notice warn', role: 'alert' },
          el('p', { style: 'margin:0 0 10px' }, 'Your answers on the unfinished test won’t be scored or saved.'),
          el('div', { class: 'actions', style: 'margin-top:0' },
            el('button', {
              class: 'btn primary',
              type: 'button',
              onclick: () => { clearActiveTest(); test = null; renderSetup(); },
            }, 'Discard it and choose a new test'),
            el('button', { class: 'btn', type: 'button', onclick: () => renderResumePrompt(false) }, 'Keep it'),
          ))
        : el('div', { class: 'actions' },
          el('button', { class: 'btn primary', type: 'button', onclick: resume }, 'Resume this test'),
          el('button', { class: 'btn', type: 'button', onclick: () => renderResumePrompt(true) }, 'Start a new test instead'),
        ),
    ),
  );
}

export function leaveTest() {
  stopTimer();
  view = null;
  test = null;
}

/* ---------- Helpers ---------- */

const section = () => test.sections[test.current];
const subtestName = (id) => getSubtest(id)?.name || id;
const save = () => saveActiveTest(test);

function remainingMs() {
  const s = section();
  return s.deadline ? Math.max(0, s.deadline - Date.now()) : s.minutes * 60000;
}

function clock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function timerClass(ms) {
  if (ms <= 60000) return 'timer crit';
  if (ms <= 5 * 60000) return 'timer warn';
  return 'timer';
}

function startTimer() {
  stopTimer();
  timerId = setInterval(tick, 1000);
  tick();
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function tick() {
  if (!test) return stopTimer();
  const ms = remainingMs();
  const node = document.getElementById('timer');
  if (node) {
    node.textContent = clock(ms);
    node.className = timerClass(ms);
  }
  if (ms <= 0) {
    section().timedOut = true;
    submitSection();
  }
}

/* ---------- Setup ---------- */

function renderSetup() {
  view = 'setup';
  stopTimer();
  const ids = () => {
    if (setup.kind === 'afqt') return AFQT_ORDER;
    if (setup.kind === 'full') return FULL_ORDER.filter((id) => getSubtest(id)?.ready && FORMATS.full.sections[id]);
    return [setup.subtest];
  };

  const kindRadio = (value, title, desc) =>
    el('label', { class: 'option' },
      el('input', { type: 'radio', name: 'kind', value, checked: setup.kind === value }),
      el('span', { class: 'option-body' }, el('strong', {}, title), el('span', { class: 'small muted' }, desc)),
    );

  const subtestSelect = el('select', { id: 'single-subtest', name: 'subtest', 'aria-label': 'Section' },
    SECTION_IDS.map((id) => el('option', { value: id, selected: setup.subtest === id }, subtestName(id))));

  const formatRadios = Object.entries(FORMATS).map(([key, f]) =>
    el('label', {},
      el('input', { type: 'radio', name: 'format', value: key, checked: setup.format === key }),
      el('span', {}, f.label),
    ),
  );

  const plan = el('div', { class: 'table-wrap' });
  function drawPlan() {
    const f = FORMATS[setup.format].sections;
    let q = 0;
    let m = 0;
    const rows = ids().map((id, i) => {
      q += f[id].count;
      m += f[id].minutes;
      return el('tr', {}, el('td', {}, `${i + 1}. ${subtestName(id)}`), el('td', {}, String(f[id].count)), el('td', {}, `${f[id].minutes} min`));
    });
    if (ids().length > 1) {
      rows.push(el('tr', { class: 'total' }, el('td', {}, 'Total'), el('td', {}, String(q)), el('td', {}, `${m} min`)));
    }
    plan.replaceChildren(el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Section'), el('th', {}, 'Questions'), el('th', {}, 'Time'))),
      el('tbody', {}, rows)));
    subtestSelect.disabled = setup.kind !== 'single';
  }

  const startBtn = el('button', { class: 'btn primary', type: 'submit' }, 'Start test');
  const status = el('p', { class: 'small muted', role: 'status' });
  const form = el('form', { class: 'card' },
    el('fieldset', {},
      el('legend', {}, 'Test'),
      el('div', { class: 'option-list' },
        kindRadio('full', 'Full ASVAB practice test', 'All nine sections, technical ones included, in score-report order. Each is timed separately, and you can take a break between sections. Gives an estimated AFQT range plus a score for every section.'),
        kindRadio('afqt', 'AFQT practice test', 'Only the four sections that make up the AFQT score (Arithmetic Reasoning, Word Knowledge, Paragraph Comprehension and Math Knowledge). Shorter, and gives an estimated AFQT range.'),
        el('div', { class: 'option-with-select' },
          kindRadio('single', 'One timed section', 'Practice a single section under time pressure.'),
          subtestSelect,
        ),
      ),
    ),
    el('fieldset', {},
      el('legend', {}, 'Length'),
      el('div', { class: 'segmented' }, formatRadios),
    ),
    plan,
    el('ul', { class: 'rules small' },
      el('li', {}, 'You won’t see answers until the end of the test.'),
      el('li', {}, 'Within a section you can skip questions, go back, and flag questions to review.'),
      el('li', {}, 'When a section’s time runs out, it ends. Unanswered questions count as wrong, so answer every question, even with a guess.'),
      el('li', {}, 'If you leave this page, the clock keeps running. Come back to pick up where you left off.'),
    ),
    el('p', { class: 'small muted' },
      'Question counts and times follow the paper version of the ASVAB. The computer version (CAT-ASVAB) asks fewer questions that adjust to your level.'),
    el('div', { class: 'actions' }, startBtn),
    status,
  );

  form.addEventListener('change', () => {
    setup = {
      kind: form.querySelector('input[name=kind]:checked').value,
      subtest: subtestSelect.value,
      format: form.querySelector('input[name=format]:checked').value,
    };
    drawPlan();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    startBtn.disabled = true;
    status.textContent = 'Preparing your test…';
    try {
      await startTest(ids());
    } catch {
      startBtn.disabled = false;
      status.textContent = 'Could not load the questions. Check your connection and try again.';
    }
  });
  drawPlan();

  mount(app, 
    el('p', { class: 'small' }, el('a', { class: 'back-link', href: '#' }, '← Home')),
    el('h1', {}, 'Timed practice test'),
    el('p', { class: 'lead' }, 'Take the full ASVAB, just the AFQT sections or one section under real time limits, then see your scores and review every question.'),
    form,
  );
}

async function startTest(ids) {
  const format = FORMATS[setup.format].sections;
  const sections = [];
  for (const id of ids) {
    const bank = await loadBank(getSubtest(id));
    const items = pickBalanced(bank.questions, format[id].count).map((q) => ({
      ...prepare(q),
      passageText: q.passage ? bank.passages?.[q.passage] || '' : null,
    }));
    sections.push({
      subtest: id,
      minutes: format[id].minutes,
      items,
      answers: items.map(() => null),
      flags: items.map(() => false),
      startedAt: null,
      deadline: null,
      submitted: false,
      timedOut: false,
    });
  }
  if (view !== 'setup') return; // left the page while loading
  test = { version: 1, kind: setup.kind, format: setup.format, sections, current: 0, index: 0, notice: null };
  save();
  renderIntro();
}

function resume() {
  const s = section();
  if (!s.startedAt) return renderIntro();
  if (Date.now() >= s.deadline) {
    s.timedOut = true;
    return submitSection();
  }
  renderQuestion();
  startTimer();
}

/* ---------- Section intro ---------- */

function renderIntro() {
  view = 'intro';
  stopTimer();
  const s = section();
  const begin = el('button', { class: 'btn primary', type: 'button', onclick: beginSection }, 'Start section');
  mount(app, 
    test.notice ? el('p', { class: 'notice' }, test.notice) : null,
    el('div', { class: 'card intro' },
      el('div', { class: 'small muted' }, `Section ${test.current + 1} of ${test.sections.length}`),
      el('h1', {}, subtestName(s.subtest)),
      el('p', { class: 'intro-stats' },
        el('span', {}, el('strong', {}, String(s.items.length)), ' questions'),
        el('span', {}, el('strong', {}, String(s.minutes)), ' minutes'),
        el('span', {}, 'about ', el('strong', {}, clock((s.minutes * 60000) / s.items.length)), ' per question'),
      ),
      el('p', { class: 'muted' }, 'The clock starts when you press Start section.'),
      el('div', { class: 'actions' },
        begin,
        el('button', { class: 'btn', type: 'button', onclick: renderQuit }, 'Quit test'),
      ),
    ),
  );
  begin.focus({ preventScroll: true });
}

function beginSection() {
  const s = section();
  s.startedAt = Date.now();
  s.deadline = s.startedAt + s.minutes * 60000;
  test.index = 0;
  test.notice = null;
  save();
  renderQuestion();
  startTimer();
}

/* ---------- Questions ---------- */

function testBar() {
  const s = section();
  const ms = remainingMs();
  return el('div', { class: 'test-bar' },
    el('div', { class: 'test-bar-title' },
      el('span', { class: 'small muted' }, `Section ${test.current + 1} of ${test.sections.length}`),
      el('strong', {}, subtestName(s.subtest)),
    ),
    el('div', { id: 'timer', class: timerClass(ms), role: 'timer', 'aria-label': 'Time remaining' }, clock(ms)),
  );
}

function questionGrid(onPick) {
  const s = section();
  return el('div', { class: 'qgrid', role: 'list', 'aria-label': 'Questions in this section' },
    s.items.map((_, i) => {
      const cls = ['qnum'];
      if (s.answers[i] != null) cls.push('answered');
      if (s.flags[i]) cls.push('flagged');
      if (view === 'question' && i === test.index) cls.push('current');
      const label = `Question ${i + 1}${s.answers[i] != null ? ', answered' : ', unanswered'}${s.flags[i] ? ', flagged' : ''}`;
      return el('button', { class: cls.join(' '), type: 'button', role: 'listitem', 'aria-label': label, onclick: () => onPick(i) }, String(i + 1));
    }),
  );
}

function renderQuestion(focusChoice = null) {
  view = 'question';
  const s = section();
  const i = test.index;
  const q = s.items[i];
  const last = i === s.items.length - 1;

  const choices = q.choices.map((_, c) =>
    el('li', {},
      el('button', {
        class: s.answers[i] === c ? 'choice selected' : 'choice',
        type: 'button',
        'aria-pressed': String(s.answers[i] === c),
        'data-i': String(c),
        onclick: () => choose(c),
      },
      el('span', { class: 'letter', 'aria-hidden': 'true' }, LETTERS[c]),
      choiceBody(q, c)),
    ),
  );

  mount(app, 
    testBar(),
    el('div', { class: 'card' },
      el('div', { class: 'q-head' },
        el('span', { class: 'small muted' }, `Question ${i + 1} of ${s.items.length}`),
        el('button', { class: s.flags[i] ? 'flag-btn on' : 'flag-btn', type: 'button', 'aria-pressed': String(s.flags[i]), onclick: toggleFlag },
          s.flags[i] ? '⚑ Flagged' : '⚐ Flag for review'),
      ),
      q.passageText
        ? el('div', { class: 'passage' }, el('div', { class: 'passage-label' }, 'Read the passage'), el('p', {}, q.passageText))
        : null,
      figure(q),
      el('p', { class: 'question-text' }, q.question),
      el('ol', { class: choiceListClass(q) }, choices),
      el('div', { class: 'actions nav-row' },
        el('button', { class: 'btn', type: 'button', disabled: i === 0, onclick: () => go(i - 1) }, '← Previous'),
        last
          ? el('button', { class: 'btn primary', type: 'button', onclick: renderReview }, 'Review section')
          : el('button', { class: 'btn primary', type: 'button', onclick: () => go(i + 1) }, 'Next →'),
      ),
      el('p', { class: 'kbd-hint' },
        el('kbd', {}, 'A'), '–', el('kbd', {}, LETTERS[q.choices.length - 1]), ' to answer, ',
        el('kbd', {}, '←'), ' ', el('kbd', {}, '→'), ' to move, ', el('kbd', {}, 'F'), ' to flag.'),
    ),
    el('div', { class: 'grid-head' },
      el('h2', {}, 'All questions'),
      el('button', { class: 'link-btn', type: 'button', onclick: renderReview }, 'Review & submit section'),
    ),
    questionGrid(go),
  );
  if (focusChoice != null) app.querySelector(`.choice[data-i="${focusChoice}"]`)?.focus({ preventScroll: true });
}

function choose(c) {
  const s = section();
  s.answers[test.index] = s.answers[test.index] === c ? null : c; // tap again to clear
  save();
  renderQuestion(c);
}

function toggleFlag() {
  const s = section();
  s.flags[test.index] = !s.flags[test.index];
  save();
  renderQuestion();
}

function go(i) {
  const s = section();
  if (i < 0 || i >= s.items.length) return;
  test.index = i;
  save();
  renderQuestion();
  window.scrollTo({ top: 0 });
}

/* ---------- Section review & submit ---------- */

function renderReview(confirming = false) {
  view = 'review';
  const s = section();
  const answered = s.answers.filter((a) => a != null).length;
  const unanswered = s.items.length - answered;
  const flagged = s.flags.filter(Boolean).length;
  const isLast = test.current === test.sections.length - 1;
  const submitLabel = isLast ? 'Submit and see results' : 'Submit section';

  const confirmBox = confirming === true
    ? el('div', { class: 'notice warn', role: 'alert' },
      el('p', { style: 'margin:0 0 10px' },
        `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will count as wrong, and you can’t come back to this section.`),
      el('div', { class: 'actions', style: 'margin-top:0' },
        el('button', { class: 'btn primary', type: 'button', onclick: submitSection }, 'Submit anyway'),
        el('button', { class: 'btn', type: 'button', onclick: () => renderReview(false) }, 'Keep working'),
      ))
    : null;

  mount(app, 
    testBar(),
    el('div', { class: 'card' },
      el('h1', {}, 'Review this section'),
      el('div', { class: 'review-stats' },
        el('div', {}, el('strong', {}, String(answered)), el('span', {}, 'answered')),
        el('div', {}, el('strong', {}, String(unanswered)), el('span', {}, 'unanswered')),
        el('div', {}, el('strong', {}, String(flagged)), el('span', {}, 'flagged')),
      ),
      el('p', { class: 'small muted' }, 'Pick a number to go back to that question. After you submit, you can’t return to this section.'),
      questionGrid(go),
      confirmBox,
      confirming === true
        ? null
        : el('div', { class: 'actions' },
          el('button', {
            class: 'btn primary',
            type: 'button',
            onclick: () => (unanswered ? renderReview(true) : submitSection()),
          }, submitLabel),
          el('button', { class: 'btn', type: 'button', onclick: () => go(test.index) }, 'Back to questions'),
        ),
    ),
  );
  window.scrollTo({ top: 0 });
}

function submitSection() {
  stopTimer();
  const s = section();
  if (s.submitted) return;
  s.submitted = true;
  s.endedAt = Math.min(Date.now(), s.deadline || Date.now());
  if (test.current < test.sections.length - 1) {
    test.notice = s.timedOut
      ? `Time ran out on ${subtestName(s.subtest)}. Unanswered questions were marked wrong.`
      : null;
    test.current += 1;
    test.index = 0;
    save();
    renderIntro();
  } else {
    finishTest();
  }
}

/* ---------- Quit ---------- */

function renderQuit() {
  view = 'quit';
  mount(app, 
    el('div', { class: 'card' },
      el('h1', {}, 'Quit this test?'),
      el('p', {}, 'Your answers won’t be scored or saved.'),
      el('div', { class: 'actions' },
        el('button', {
          class: 'btn primary',
          type: 'button',
          onclick: () => {
            clearActiveTest();
            test = null;
            renderSetup();
          },
        }, 'Quit test'),
        el('button', { class: 'btn', type: 'button', onclick: renderIntro }, 'Keep going'),
      ),
    ),
  );
}

/* ---------- Results ---------- */

function finishTest() {
  const finished = test;
  const scores = {};
  for (const s of finished.sections) {
    scores[s.subtest] = scoreSection(s);
    s.items.forEach((q, i) => {
      if (s.answers[i] != null) recordAnswer(q.id, s.answers[i] === q.answer);
    });
  }
  const estimate = GIVES_AFQT.includes(finished.kind) && AFQT_ORDER.every((id) => scores[id]) ? afqtEstimate(scores) : null;
  const total = Object.values(scores).reduce((n, s) => n + s.total, 0);
  const correct = Object.values(scores).reduce((n, s) => n + s.correct, 0);
  recordSession({
    subtest: finished.kind === 'single' ? finished.sections[0].subtest : finished.kind,
    mode: 'test',
    format: finished.format,
    total,
    correct,
    sections: scores,
    estimate: estimate && { low: estimate.low, high: estimate.high, mid: estimate.mid, category: estimate.category.name },
  });
  clearActiveTest();
  test = null;
  renderResults(finished, scores, estimate);
}

function estimateScale(est) {
  // A 1–99 track with the estimated band and the category boundaries.
  const marks = [31, 50, 65, 93];
  return el('div', { class: 'scale', 'aria-hidden': 'true' },
    el('div', { class: 'scale-track' },
      el('div', { class: 'scale-band', style: `left:${est.low}%;width:${Math.max(2, est.high - est.low)}%` }),
      marks.map((m) => el('div', { class: 'scale-tick', style: `left:${m}%` })),
    ),
    el('div', { class: 'scale-labels' },
      el('span', { style: 'left:0%' }, '1'),
      marks.map((m) => el('span', { style: `left:${m}%` }, String(m))),
    ),
  );
}

function renderResults(finished, scores, estimate) {
  view = 'results';
  document.title = 'Test Results · ASVAB Prep';

  const sectionRows = finished.sections.map((s) => {
    const sc = scores[s.subtest];
    const used = Math.max(0, (s.endedAt || s.deadline) - s.startedAt);
    return el('tr', {},
      el('td', {}, subtestName(s.subtest), s.timedOut ? el('span', { class: 'tag' }, 'time ran out') : null),
      el('td', {}, `${sc.correct} / ${sc.total}`),
      el('td', {}, `${sc.pct}%`),
      el('td', { class: 'nowrap' }, `${clock(used)} / ${s.minutes}:00`),
    );
  });

  // Suggest the weakest section, preferring AFQT sections since they decide enlistment.
  const afqtSections = finished.sections.filter((x) => AFQT_ORDER.includes(x.subtest));
  const pool = afqtSections.length ? afqtSections : finished.sections;
  const weakest = [...pool].sort((a, b) => scores[a.subtest].pct - scores[b.subtest].pct)[0].subtest;

  let summary;
  if (estimate) {
    const cat = estimate.category;
    summary = el('div', { class: 'card' },
      el('div', { class: 'small muted' }, 'Estimated AFQT range'),
      el('div', { class: 'score-big' }, `${estimate.low}–${estimate.high}`),
      el('div', { class: 'muted' }, `Most likely around ${estimate.mid} · Category ${cat.name} (${cat.min}–${cat.max})`),
      estimateScale(estimate),
      el('p', { class: 'small muted' },
        'This is a rough estimate, not an official score. Real AFQT scores are percentiles compared with a national group of test takers, and the exact conversion isn’t public. ',
        'This estimate weights your section scores the same way the AFQT does: Word Knowledge and Paragraph Comprehension together count double. ',
        'Many branches set their minimum around 31, but requirements change, so check with a recruiter.'),
    );
  } else {
    const sc = scores[finished.sections[0].subtest];
    summary = el('div', { class: 'card' },
      el('div', { class: 'small muted' }, subtestName(finished.sections[0].subtest)),
      el('div', { class: 'score-big' }, `${sc.pct}%`),
      el('div', { class: 'muted' }, `${sc.correct} of ${sc.total} correct`),
    );
  }

  const showAll = el('input', { type: 'checkbox', id: 'show-all' });
  const reviewList = el('div', { class: 'missed' });
  function drawReview() {
    const blocks = [];
    for (const s of finished.sections) {
      const cards = [];
      s.items.forEach((q, i) => {
        const a = s.answers[i];
        const right = a === q.answer;
        if (right && !showAll.checked) return;
        const status = a == null ? 'Unanswered' : right ? 'Correct' : 'Incorrect';
        cards.push(el('div', { class: 'card' },
          el('div', { class: `tag ${right ? 'good' : 'bad'}` }, `Q${i + 1} · ${status}`),
          q.passageText
            ? el('details', { class: 'passage-toggle' }, el('summary', {}, 'Show passage'), el('p', {}, q.passageText))
            : null,
          figure(q),
          el('p', { class: 'q' }, q.question),
          el('p', { class: 'ans' },
            a != null && !right ? ['Your answer: ', answerBody(q, a, 'var(--bad)'), el('br')] : null,
            'Correct answer: ', answerBody(q, q.answer, 'var(--good)'),
          ),
          el('p', { class: 'explain' }, q.explanation),
        ));
      });
      if (finished.sections.length > 1) blocks.push(el('h3', {}, subtestName(s.subtest)));
      blocks.push(cards.length ? cards : el('p', { class: 'muted small' }, 'Nothing missed in this section.'));
    }
    reviewList.replaceChildren(...blocks.flat());
  }
  showAll.addEventListener('change', drawReview);
  drawReview();

  mount(app, 
    el('h1', {}, 'Test results'),
    summary,
    el('h2', {}, 'By section'),
    el('div', { class: 'card table-wrap' },
      el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Section'), el('th', {}, 'Correct'), el('th', {}, 'Score'), el('th', {}, 'Time used'))),
        el('tbody', {}, sectionRows),
      ),
    ),
    el('div', { class: 'actions' },
      el('a', { class: 'btn primary', href: `#${weakest}` }, `Practice ${subtestName(weakest)}`),
      el('button', { class: 'btn', type: 'button', onclick: renderSetup }, 'Take another test'),
      el('a', { class: 'btn', href: '#' }, 'Home'),
    ),
    el('div', { class: 'grid-head' },
      el('h2', {}, 'Review'),
      el('label', { class: 'small', for: 'show-all' }, showAll, ' Show correct answers too'),
    ),
    reviewList,
  );
  window.scrollTo({ top: 0 });
}

/* ---------- Keyboard ---------- */

document.addEventListener('keydown', (e) => {
  if (view !== 'question' || !test || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const q = section().items[test.index];
  const key = e.key.toUpperCase();
  let c = LETTERS.indexOf(key);
  if (c === -1 && /^[1-9]$/.test(key)) c = Number(key) - 1;
  if (key.length === 1 && c >= 0 && c < q.choices.length) {
    e.preventDefault();
    choose(c);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (test.index === section().items.length - 1) renderReview();
    else go(test.index + 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    go(test.index - 1);
  } else if (key === 'F') {
    e.preventDefault();
    toggleFlag();
  }
});


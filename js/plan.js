// Study plan from an ASVAB score report. Route: #plan
// The student types in the percentile scores from their report; the page
// ranks what to work on and links straight to practice. Saved only in
// this browser.
import { SUBTESTS, getSubtest } from './config.js';
import { loadPlan, savePlan, clearPlan } from './storage.js';
import { presetPractice } from './practice.js';
import { categoryFor } from './scoring.js';
import { el, mount } from './dom.js';

const AFQT_PARTS = ['ar', 'wk', 'pc', 'mk'];
const TECH_PARTS = ['gs', 'as', 'ei', 'mc', 'ao'];
// Career Exploration Scores on the student (CEP) report. Each one is a
// combination of subtests, so they're shown as a summary but don't change
// the plan.
const CAREER_PARTS = [
  { id: 'verbal', name: 'Verbal Skills', from: ['wk', 'pc'] },
  { id: 'math', name: 'Math Skills', from: ['ar', 'mk'] },
  { id: 'scitech', name: 'Science and Technical Skills', from: ['gs', 'ei', 'mc'] },
];
const NAMES = {
  ao: 'Assembling Objects', // not in config (no practice yet)
  ...Object.fromEntries(CAREER_PARTS.map((c) => [c.id, c.name])),
};
const nameOf = (id) => getSubtest(id)?.name || NAMES[id] || id;

const ENLIST_MIN = 31;
const IIIA_MIN = 50;

let app = null;

export function renderPlan(container) {
  app = container;
  document.title = 'Study Plan · ASVAB Prep';
  const plan = loadPlan();
  if (plan) renderResult(plan.scores);
  else renderForm({});
}

/* ---------- Pure helpers (exported for testing) ---------- */

export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

// Where a student is on one subtest, and what difficulty to practice at.
export function stageFor(pct) {
  if (pct < 20) return { label: 'Start with the basics', level: '1', levelName: 'Easy' };
  if (pct < 50) return { label: 'Build up', level: 'easy-first', levelName: 'Easy first' };
  return { label: 'Keep sharp', level: 'mixed', levelName: 'Mixed' };
}

// AFQT subtests, lowest percentile first; ones not entered go last.
export function focusOrder(scores) {
  return AFQT_PARTS
    .map((id) => ({ id, pct: scores[id] }))
    .sort((a, b) => (a.pct ?? 1000) - (b.pct ?? 1000));
}

/* ---------- Form ---------- */

function field(id, label, value, hint) {
  return el('label', { class: 'score-field', for: `score-${id}` },
    el('span', { class: 'score-label' }, label, hint ? el('span', { class: 'small muted' }, hint) : null),
    el('input', {
      id: `score-${id}`,
      name: id,
      type: 'number',
      inputmode: 'numeric',
      min: '1',
      max: '99',
      step: '1',
      value: value ?? '',
      placeholder: '1–99',
    }),
  );
}

function renderForm(scores) {
  const error = el('p', { class: 'notice error', role: 'alert', hidden: true });
  const form = el('form', { class: 'card plan-form', novalidate: true },
    el('fieldset', {},
      el('legend', {}, 'AFQT'),
      el('div', { class: 'score-grid' },
        field('afqt', 'AFQT score', scores.afqt, 'Military Entrance Score (AFQT)'),
      ),
    ),
    el('fieldset', {},
      el('legend', {}, 'Career Exploration Scores (optional)'),
      el('p', { class: 'small muted', style: 'margin:0 0 10px' },
        'These are combinations of the subtests below. They’re shown on your plan as a summary but don’t change it.'),
      el('div', { class: 'score-grid' }, CAREER_PARTS.map((c) => field(c.id, c.name, scores[c.id]))),
    ),
    el('fieldset', {},
      el('legend', {}, 'AFQT subtests'),
      el('div', { class: 'score-grid' }, AFQT_PARTS.map((id) => field(id, nameOf(id), scores[id]))),
    ),
    el('fieldset', {},
      el('legend', {}, 'Technical subtests (optional)'),
      el('div', { class: 'score-grid' }, TECH_PARTS.map((id) => field(id, nameOf(id), scores[id]))),
    ),
    error,
    el('div', { class: 'actions' }, el('button', { class: 'btn primary', type: 'submit' }, 'Make my plan')),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = {};
    const bad = [];
    for (const input of form.querySelectorAll('input')) {
      const raw = input.value.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 99) bad.push(input.name === 'afqt' ? 'AFQT' : nameOf(input.name));
      else next[input.name] = n;
    }
    if (bad.length) {
      error.textContent = `Percentiles are whole numbers from 1 to 99. Check: ${bad.join(', ')}.`;
      error.hidden = false;
      return;
    }
    if (!AFQT_PARTS.some((id) => next[id] != null)) {
      error.textContent = 'Enter at least one of the four AFQT subtests (Arithmetic Reasoning, Word Knowledge, Paragraph Comprehension or Math Knowledge).';
      error.hidden = false;
      return;
    }
    savePlan(next);
    renderResult(next);
    window.scrollTo({ top: 0 });
  });

  mount(app,
    el('h1', {}, 'Your study plan'),
    el('p', { class: 'lead' },
      'Have an ASVAB score report? Type in your percentile scores and get a plan that shows what to work on first.'),
    el('div', { class: 'card where-card' },
      el('strong', {}, 'Where to find your numbers'),
      el('ul', {},
        el('li', {}, 'Use the Percentile Scores column (on a school report it may be labeled with your grade, like “12th Grade Students”), not the standard scores.'),
        el('li', {}, 'Your AFQT is listed as “Military Entrance Score (AFQT).”'),
        el('li', {}, 'Verbal Skills, Math Skills and Science and Technical Skills at the top of a school report are optional. Each one combines several subtests: Verbal Skills is Word Knowledge and Paragraph Comprehension, Math Skills is Arithmetic Reasoning and Math Knowledge, and Science and Technical Skills is General Science, Electronics and Mechanical Comprehension.'),
        el('li', {}, 'Leave out anything you don’t have. Your scores are saved only in this browser.'),
      ),
    ),
    form,
  );
}

/* ---------- Result ---------- */

function practiceButton(id, level, label = 'Practice') {
  return el('button', {
    class: 'btn primary',
    type: 'button',
    onclick: () => {
      presetPractice(id, { level });
      location.hash = id;
    },
  }, label);
}

function afqtSummary(afqt) {
  if (afqt == null) {
    return el('div', { class: 'card' },
      el('p', { style: 'margin:0' }, 'You didn’t enter an AFQT score, so the plan below is based on your subtest scores only.'));
  }
  const cat = categoryFor(afqt);
  let goal;
  if (afqt < ENLIST_MIN) {
    goal = `Goal: reach ${ENLIST_MIN}, the minimum most branches require for enlistment. That’s ${ENLIST_MIN - afqt} percentile points to go.`;
  } else if (afqt < IIIA_MIN) {
    goal = `You’re above ${ENLIST_MIN}. Next goal: ${IIIA_MIN} (Category IIIA). Higher categories usually qualify for more jobs and enlistment incentives.`;
  } else {
    goal = 'Strong score. Keep your skills sharp, and work on the technical subtests for the jobs you want.';
  }
  return el('div', { class: 'card' },
    el('div', { class: 'small muted' }, 'Your AFQT'),
    el('div', { class: 'score-big' }, String(afqt)),
    el('div', { class: 'muted' }, `Category ${cat.name} (${cat.min}–${cat.max})`),
    el('p', { style: 'margin:12px 0 0' }, goal),
    el('p', { class: 'small muted', style: 'margin:8px 0 0' }, 'Requirements change and differ by branch, so confirm with a recruiter.'),
  );
}

function careerSummary(scores) {
  const entered = CAREER_PARTS.filter((c) => scores[c.id] != null);
  if (!entered.length) return null;
  return [
    el('h2', {}, 'Career Exploration Scores'),
    el('div', { class: 'card list-card' }, entered.map((c) =>
      el('div', { class: 'list-row' },
        el('div', {},
          el('strong', {}, c.name),
          el('div', { class: 'small muted' }, `Made up of ${c.from.map(nameOf).join(', ').replace(/, ([^,]*)$/, ' and $1')}`)),
        el('span', { class: 'nowrap' }, `${ordinal(scores[c.id])} percentile`),
      ))),
    el('p', { class: 'small muted section-note', style: 'margin-top:8px' },
      'These scores summarize your subtests to help match you with career fields. To raise one, work on the subtests it’s made of; your plan below already covers them.'),
  ];
}

function renderResult(scores) {
  const order = focusOrder(scores);
  const entered = order.filter((x) => x.pct != null);
  const focusIds = entered.slice(0, 2).map((x) => x.id);

  const rows = order.map(({ id, pct }) => {
    if (pct == null) {
      return el('div', { class: 'plan-row muted-row' },
        el('div', { class: 'plan-name' }, el('strong', {}, nameOf(id)), el('span', { class: 'small muted' }, 'Not entered')),
        el('div', { class: 'plan-actions' }, practiceButton(id, 'easy-first')),
      );
    }
    const st = stageFor(pct);
    return el('div', { class: 'plan-row' },
      el('div', { class: 'plan-name' },
        el('strong', {}, nameOf(id), focusIds.includes(id) ? el('span', { class: 'badge accent focus-tag' }, 'Focus first') : null),
        el('span', { class: 'small muted' }, `${ordinal(pct)} percentile · ${st.label} · practice at “${st.levelName}”`),
      ),
      el('div', { class: 'plan-actions' },
        practiceButton(id, st.level),
        id === 'wk' ? el('a', { class: 'btn', href: '#flashcards' }, 'Flashcards') : null,
      ),
    );
  });

  // A simple weekly routine built from the focus areas.
  const routine = [];
  if (focusIds.includes('wk') || (scores.wk != null && scores.wk < 50)) {
    routine.push('Flashcards: about 10 minutes every day. Vocabulary builds slowly, so a little each day beats cramming.');
  }
  for (const id of focusIds) {
    routine.push(`${nameOf(id)}: 3 practice sets of 10 questions a week, at “${stageFor(scores[id]).levelName}”. Read every explanation, even for questions you got right.`);
  }
  if (focusIds.includes('pc') || focusIds.includes('wk')) {
    routine.push('Read the Paragraph Comprehension study guides once. Main idea and inference questions follow patterns you can learn.');
  }
  routine.push('Every two weeks: a half-length practice test to check your progress.');

  const tech = TECH_PARTS.filter((id) => scores[id] != null).sort((a, b) => scores[a] - scores[b]);
  const techList = tech.length
    ? el('div', { class: 'card list-card' }, tech.map((id) => {
      const s = getSubtest(id);
      return el('div', { class: 'list-row' },
        el('div', {}, el('strong', {}, nameOf(id)), el('div', { class: 'small muted' }, `${ordinal(scores[id])} percentile`)),
        s?.ready ? practiceButton(id, stageFor(scores[id]).level) : el('span', { class: 'small muted nowrap' }, 'Coming soon'),
      );
    }))
    : null;

  mount(app,
    el('h1', {}, 'Your study plan'),
    afqtSummary(scores.afqt),
    careerSummary(scores),
    el('h2', {}, 'What to work on, in order'),
    el('p', { class: 'small muted section-note' },
      'Lowest scores first. Word Knowledge and Paragraph Comprehension together count for about half of your AFQT, so reading and vocabulary pay off twice.'),
    el('div', { class: 'card list-card' }, rows),
    el('h2', {}, 'Your week'),
    el('div', { class: 'card' }, el('ul', { class: 'guide-list', style: 'margin:0' }, routine.map((r) => el('li', {}, r)))),
    tech.length ? el('h2', {}, 'Technical subtests') : null,
    tech.length ? el('p', { class: 'small muted section-note' }, 'These don’t change your AFQT, but they decide which jobs you qualify for. Work on them once your AFQT goal is in reach.') : null,
    techList,
    el('div', { class: 'actions' },
      el('button', { class: 'btn', type: 'button', onclick: () => renderForm(scores) }, 'Edit my scores'),
      el('button', {
        class: 'btn',
        type: 'button',
        onclick: () => { clearPlan(); renderForm({}); },
      }, 'Clear my plan'),
    ),
  );
}

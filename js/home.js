import { SUBTESTS } from './config.js';
import { load, loadActiveTest, lastAfqtTest, loadCardStates, loadPlan } from './storage.js';
import { focusOrder } from './plan.js';
import { el, mount } from './dom.js';

export function renderHome(app) {
  document.title = 'ASVAB Prep';
  const history = load().questions;
  function subtestCard(s) {
    // Stats come from stored history, keyed by question id prefix.
    let seen = 0;
    let correct = 0;
    for (const [id, h] of Object.entries(history)) {
      if (id.startsWith(`${s.id}-`)) {
        seen += h.seen;
        correct += h.correct;
      }
    }
    const meta = !s.ready
      ? 'Coming soon'
      : seen
        ? `${Math.round((correct / seen) * 100)}% correct over ${seen} answers`
        : 'Not started yet';
    const action = s.ready
      ? el('a', { class: 'btn primary', href: `#${s.id}` }, 'Practice')
      : el('span', { class: 'btn', 'aria-disabled': 'true' }, 'Coming soon');
    return el('div', { class: 'card subtest-card' },
      el('span', { class: s.ready ? 'badge accent' : 'badge' }, s.short),
      el('h3', {}, s.name),
      el('p', {}, s.blurb),
      el('div', { class: 'meta' }, meta),
      el('div', {}, action),
    );
  }
  const grid = el('div', { class: 'grid' }, SUBTESTS.filter((x) => x.afqt).map(subtestCard));
  const techGrid = el('div', { class: 'grid' }, SUBTESTS.filter((x) => !x.afqt).map(subtestCard));

  const active = loadActiveTest();
  const last = lastAfqtTest();
  const testCard = el('div', { class: 'card test-card' },
    el('div', { class: 'test-card-body' },
      el('h2', {}, 'Timed practice test'),
      el('p', { class: 'muted' },
        'All nine ASVAB sections, technical ones included, under real time limits, or just the four AFQT sections. Ends with your scores and an estimated AFQT range.'),
      last
        ? el('p', { class: 'small' },
          `Your last estimate: ${last.estimate.low}–${last.estimate.high} (Category ${last.estimate.category}), `
          + new Date(last.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
        : null,
    ),
    el('a', { class: 'btn primary', href: '#test' }, active ? 'Resume your test' : 'Take a practice test'),
  );

  const plan = loadPlan();
  const focus = plan ? focusOrder(plan.scores).filter((x) => x.pct != null).slice(0, 2).map((x) => SUBTESTS.find((t) => t.id === x.id)?.name) : [];
  const planCard = el('a', { class: 'card tool-card plan-card', href: '#plan' },
    el('h3', {}, plan ? 'Your study plan' : 'Got an ASVAB score report?'),
    el('p', {}, plan
      ? `Focus first: ${focus.join(' and ')}.`
      : 'Type in your percentile scores and get a plan that shows what to work on first.'),
    el('span', { class: 'tool-cta' }, plan ? 'Open my plan →' : 'Make my study plan →'),
  );
  const cardsSeen = Object.keys(loadCardStates()).length;
  const tools = el('div', { class: 'grid' },
    el('a', { class: 'card tool-card', href: '#guides' },
      el('h3', {}, 'Study guides'),
      el('p', {}, 'Short lessons for every AFQT topic, with formulas, worked examples and common traps.'),
      el('span', { class: 'tool-cta' }, 'Open study guides →'),
    ),
    el('a', { class: 'card tool-card', href: '#flashcards' },
      el('h3', {}, 'Vocabulary flashcards'),
      el('p', {}, cardsSeen
        ? `${cardsSeen} of 150 words started. Cards you miss come back sooner.`
        : '150 common ASVAB words. Cards you miss come back sooner.'),
      el('span', { class: 'tool-cta' }, 'Study flashcards →'),
    ),
  );

  mount(app, 
    el('h1', {}, 'Raise your ASVAB score'),
    el('p', { class: 'lead' },
      'Practice all nine ASVAB subtests: the four that make up your AFQT score and the five technical subtests that decide which jobs you qualify for. ' +
      'Every question comes with a step-by-step explanation. Your progress is saved in this browser.'),
    testCard,
    planCard,
    el('h2', {}, 'AFQT subtests'),
    el('p', { class: 'small muted section-note' },
      'These four make up your AFQT score, which decides whether you can enlist.'),
    grid,
    el('h2', {}, 'Technical subtests'),
    el('p', { class: 'small muted section-note' },
      'These don’t count toward your AFQT score, but they decide which jobs you qualify for, especially mechanical, electronics and technical jobs.'),
    techGrid,
    el('h2', {}, 'Study tools'),
    tools,
  );
}

import { SUBTESTS } from './config.js';
import { load, loadActiveTest, lastAfqtTest, loadCardStates } from './storage.js';
import { el, mount } from './dom.js';

export function renderHome(app) {
  document.title = 'ASVAB Prep';
  const history = load().questions;
  const grid = el('div', { class: 'grid' });

  for (const s of SUBTESTS.filter((x) => x.afqt)) {
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

    grid.append(
      el('div', { class: 'card subtest-card' },
        el('span', { class: s.ready ? 'badge accent' : 'badge' }, s.short),
        el('h3', {}, s.name),
        el('p', {}, s.blurb),
        el('div', { class: 'meta' }, meta),
        el('div', {}, action),
      ),
    );
  }

  const active = loadActiveTest();
  const last = lastAfqtTest();
  const testCard = el('div', { class: 'card test-card' },
    el('div', { class: 'test-card-body' },
      el('h2', {}, 'Timed practice test'),
      el('p', { class: 'muted' },
        'All four AFQT sections under real time limits, with an estimated AFQT range at the end.'),
      last
        ? el('p', { class: 'small' },
          `Your last estimate: ${last.estimate.low}–${last.estimate.high} (Category ${last.estimate.category}), `
          + new Date(last.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
        : null,
    ),
    el('a', { class: 'btn primary', href: '#test' }, active ? 'Resume your test' : 'Take a practice test'),
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
      'Practice the four subtests that make up your AFQT score. Every question comes with a ' +
      'step-by-step explanation. Your progress is saved in this browser.'),
    testCard,
    el('h2', {}, 'Practice by subtest'),
    grid,
    el('h2', {}, 'Study tools'),
    tools,
  );
}

import { SUBTESTS } from './config.js';
import { load } from './storage.js';
import { el } from './dom.js';

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

  app.replaceChildren(
    el('h1', {}, 'Raise your ASVAB score'),
    el('p', { class: 'lead' },
      'Practice the four subtests that make up your AFQT score. Every question comes with a ' +
      'step-by-step explanation. Your progress is saved in this browser.'),
    el('h2', {}, 'AFQT subtests'),
    grid,
  );
}

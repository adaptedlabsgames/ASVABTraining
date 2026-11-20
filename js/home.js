import { SUBTESTS } from './config.js';
import { load } from './storage.js';
import { el } from './dom.js';

const grid = document.getElementById('subtests');
const history = load().questions;

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
    ? el('a', { class: 'btn primary', href: `practice.html?s=${s.id}` }, 'Practice')
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

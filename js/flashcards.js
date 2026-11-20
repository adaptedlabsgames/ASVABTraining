// Vocabulary flashcards with spaced repetition (see srs.js). Route: #flashcards
import { loadData } from './quiz.js';
import { loadCardStates, saveCardState } from './storage.js';
import { grade, buildQueue, deckStats, soonestCards, NEW_PER_SESSION } from './srs.js';
import { el, mount } from './dom.js';

const VOCAB_FILE = 'data/vocab.json';
const MAX_REPEATS = 2; // a missed card comes back at most twice per session

let app = null;
let cards = [];
let session = null; // { queue, index, flipped, repeats, firstTry, total }
let token = 0;

export function leaveFlashcards() {
  token += 1;
  session = null;
}

export async function renderFlashcards(container) {
  app = container;
  document.title = 'Flashcards · ASVAB Prep';
  const mine = ++token;
  mount(app, el('p', { class: 'muted' }, 'Loading…'));
  try {
    cards = (await loadData(VOCAB_FILE)).cards;
  } catch {
    if (mine === token) mount(app, el('p', { class: 'notice error' }, 'Could not load the flashcards. Check your connection and reload the page.'));
    return;
  }
  if (mine !== token) return;
  renderOverview();
}

/* ---------- Overview ---------- */

function renderOverview() {
  session = null;
  const states = loadCardStates();
  const st = deckStats(cards, states);
  const queue = buildQueue(cards, states);

  const tile = (n, label, hint) =>
    el('div', { class: 'deck-stat' }, el('strong', {}, String(n)), el('span', {}, label), el('span', { class: 'small muted' }, hint));

  let action;
  if (queue.length) {
    const dueCount = Math.min(st.due, queue.length);
    const newCount = queue.length - dueCount;
    const parts = [dueCount ? `${dueCount} to review` : null, newCount ? `${newCount} new` : null].filter(Boolean).join(' and ');
    action = el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', onclick: () => start(queue) }, `Study ${queue.length} cards`),
      el('span', { class: 'small muted', style: 'align-self:center' }, parts),
    );
  } else {
    const when = st.nextDue ? new Date(st.nextDue).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : null;
    action = el('div', {},
      el('p', { class: 'notice' }, `You’re all caught up.${when ? ` More cards are due ${when}.` : ''}`),
      el('div', { class: 'actions' },
        el('button', { class: 'btn', type: 'button', onclick: () => start(soonestCards(cards, states, 10)) }, 'Study 10 cards anyway')),
    );
  }

  mount(app,
    el('h1', {}, 'Vocabulary flashcards'),
    el('p', { class: 'lead' },
      `${cards.length} words that often show up on the ASVAB. Flip each card and say whether you knew it. Cards you miss come back sooner; cards you know come back less often. A few minutes a day works best.`),
    el('div', { class: 'deck-stats' },
      tile(st.due, 'due now', 'ready to review'),
      tile(st.fresh, 'new', `${NEW_PER_SESSION} per session`),
      tile(st.learning, 'learning', 'seen, still practicing'),
      tile(st.mastered, 'mastered', 'known for a week or more'),
    ),
    action,
  );
}

/* ---------- Session ---------- */

function start(queue) {
  session = { queue: queue.slice(), index: 0, flipped: false, repeats: {}, firstTry: {}, total: queue.length };
  renderCard();
}

function renderCard() {
  const c = session.queue[session.index];
  const done = Object.keys(session.firstTry).length;
  const repeat = session.repeats[c.word] ? ' · again' : '';

  const card = el('button', {
    class: session.flipped ? 'flashcard flipped' : 'flashcard',
    type: 'button',
    'aria-label': session.flipped ? `${c.word}: ${c.def}` : `${c.word}. Show the meaning`,
    onclick: () => { if (!session.flipped) flip(); },
  },
  el('span', { class: 'fc-word' }, c.word),
  el('span', { class: 'fc-pos' }, c.pos),
  session.flipped
    ? el('span', { class: 'fc-back' },
      el('span', { class: 'fc-def' }, c.def),
      el('span', { class: 'fc-example' }, `“${c.example}”`))
    : el('span', { class: 'fc-hint' }, 'Tap to see the meaning'),
  );

  const controls = session.flipped
    ? el('div', { class: 'fc-grade' },
      el('button', { class: 'btn', type: 'button', onclick: () => answer(false) }, 'Didn’t know it'),
      el('button', { class: 'btn primary', type: 'button', onclick: () => answer(true) }, 'Knew it'),
    )
    : el('div', { class: 'fc-grade' },
      el('button', { class: 'btn primary', type: 'button', onclick: flip }, 'Show meaning'));

  mount(app,
    el('div', { class: 'quiz-top' },
      el('span', {}, `${done} of ${session.total} done${repeat}`),
      el('button', { class: 'link-btn', type: 'button', onclick: finish }, 'End session'),
    ),
    el('div', { class: 'progress' }, el('div', { style: `width:${(done / session.total) * 100}%` })),
    card,
    controls,
    el('p', { class: 'kbd-hint', style: 'text-align:center' },
      el('kbd', {}, 'Space'), ' to flip, ', el('kbd', {}, '1'), ' didn’t know, ', el('kbd', {}, '2'), ' knew it'),
  );
  app.querySelector(session.flipped ? '.fc-grade .btn.primary' : '.flashcard')?.focus({ preventScroll: true });
}

function flip() {
  if (!session || session.flipped) return;
  session.flipped = true;
  renderCard();
}

function answer(knew) {
  if (!session || !session.flipped) return;
  const c = session.queue[session.index];
  const states = loadCardStates();
  saveCardState(c.word, grade(states[c.word], knew));
  if (!(c.word in session.firstTry)) session.firstTry[c.word] = knew;
  if (!knew && (session.repeats[c.word] || 0) < MAX_REPEATS) {
    session.repeats[c.word] = (session.repeats[c.word] || 0) + 1;
    session.queue.push(c);
  }
  session.index += 1;
  session.flipped = false;
  if (session.index >= session.queue.length) finish();
  else renderCard();
}

function finish() {
  if (!session) return;
  const tried = Object.entries(session.firstTry);
  if (!tried.length) {
    renderOverview();
    return;
  }
  const missed = tried.filter(([, k]) => !k).map(([w]) => cards.find((c) => c.word === w));
  const knewCount = tried.length - missed.length;
  session = null;
  mount(app,
    el('h1', {}, 'Session complete'),
    el('div', { class: 'card' },
      el('div', { class: 'score-big' }, `${knewCount} / ${tried.length}`),
      el('div', { class: 'muted' }, 'known on the first try'),
      el('div', { class: 'actions' },
        el('button', { class: 'btn primary', type: 'button', onclick: renderOverview }, 'Back to flashcards'),
        el('a', { class: 'btn', href: '#' }, 'Home'),
      ),
    ),
    missed.length ? el('h2', {}, 'Words to keep practicing') : null,
    missed.length
      ? el('div', { class: 'card list-card' }, missed.map((c) =>
        el('div', { class: 'list-row word-row' },
          el('div', {}, el('strong', {}, c.word), ' ', el('span', { class: 'small muted' }, c.pos),
            el('div', { class: 'small' }, c.def)))))
      : el('p', { class: 'muted' }, 'You knew every card. Nice work.'),
    missed.length ? el('p', { class: 'small muted' }, 'These come back tomorrow.') : null,
  );
  window.scrollTo({ top: 0 });
}

/* ---------- Keyboard ---------- */

document.addEventListener('keydown', (e) => {
  if (!session || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target instanceof HTMLInputElement) return;
  if (!session.flipped && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    flip();
  } else if (session.flipped && (e.key === '1' || e.key === 'ArrowLeft')) {
    e.preventDefault();
    answer(false);
  } else if (session.flipped && (e.key === '2' || e.key === 'ArrowRight')) {
    e.preventDefault();
    answer(true);
  }
});

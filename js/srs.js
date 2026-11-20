// Flashcard scheduling (a simple Leitner system). Pure functions only.
//
// Each card sits in a box from 1 to 5. Knowing a card moves it up a box,
// so it comes back after a longer wait. Missing it sends it back to box 1,
// so it comes back tomorrow (and again later in the same session).

export const MAX_BOX = 5;
export const INTERVAL_DAYS = [0, 1, 2, 4, 7, 14]; // index = box
export const NEW_PER_SESSION = 10;
export const MASTERED_BOX = 4; // waits a week or more

export function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(t, n) {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + n);
  return d.getTime();
}

// Returns the card's new state after a "knew it" / "didn't know it" answer.
export function grade(state, knew, now = Date.now()) {
  const current = state?.box || 1; // a brand-new card counts as box 1
  const box = knew ? Math.min(MAX_BOX, current + 1) : 1;
  return { box, due: addDays(now, INTERVAL_DAYS[box]), seen: (state?.seen || 0) + 1 };
}

export function isDue(state, now = Date.now()) {
  return !!state && state.due <= now;
}

export function deckStats(cards, states, now = Date.now()) {
  let due = 0;
  let fresh = 0;
  let learning = 0;
  let mastered = 0;
  let nextDue = null;
  for (const c of cards) {
    const s = states[c.word];
    if (!s) { fresh += 1; continue; }
    if (s.box >= MASTERED_BOX) mastered += 1;
    else learning += 1;
    if (s.due <= now) due += 1;
    else if (nextDue == null || s.due < nextDue) nextDue = s.due;
  }
  return { due, fresh, learning, mastered, nextDue, total: cards.length };
}

// Cards due now (oldest first), then up to `newLimit` unseen cards in deck order.
export function buildQueue(cards, states, now = Date.now(), newLimit = NEW_PER_SESSION) {
  const due = cards
    .filter((c) => isDue(states[c.word], now))
    .sort((a, b) => states[a.word].due - states[b.word].due);
  const fresh = cards.filter((c) => !states[c.word]).slice(0, newLimit);
  return [...due, ...fresh];
}

// When nothing is due: the `n` cards that will come due soonest.
export function soonestCards(cards, states, n) {
  return cards
    .filter((c) => states[c.word])
    .sort((a, b) => states[a.word].due - states[b.word].due)
    .slice(0, n);
}

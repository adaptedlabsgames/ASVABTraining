// Study guides: an index of every topic, and one page per topic.
// Routes: #guides, #guide-<subtest>-<topic>
import { SUBTESTS, getSubtest } from './config.js';
import { loadBank, loadData } from './quiz.js';
import { accuracy, load } from './storage.js';
import { presetPractice } from './practice.js';
import { el, mount } from './dom.js';

const GUIDES_FILE = 'data/guides.json';
let token = 0;

export function leaveGuides() {
  token += 1;
}

export const guideHref = (subtestId, topicId) => `#guide-${subtestId}-${topicId}`;

// "guide-ar-word-problems" → { subtestId: "ar", topicId: "word-problems" }
export function parseGuideRoute(id) {
  const m = /^guide-([a-z]+)-([a-z0-9-]+)$/.exec(id);
  return m ? { subtestId: m[1], topicId: m[2] } : null;
}

async function loadAll() {
  const subtests = SUBTESTS.filter((s) => s.ready);
  const [guides, ...banks] = await Promise.all([loadData(GUIDES_FILE), ...subtests.map(loadBank)]);
  return { guides, items: subtests.map((s, i) => ({ subtest: s, bank: banks[i] })) };
}

function loadError() {
  return el('p', { class: 'notice error' }, 'Could not load the study guides. Check your connection and reload the page.');
}

/* ---------- Index ---------- */

export async function renderGuides(app) {
  document.title = 'Study Guides · ASVAB Prep';
  const mine = ++token;
  mount(app, el('p', { class: 'muted' }, 'Loading…'));
  let data;
  try {
    data = await loadAll();
  } catch {
    if (mine === token) mount(app, loadError());
    return;
  }
  if (mine !== token) return;
  const history = load().questions;

  const sections = data.items.map(({ subtest, bank }) => [
    el('h2', {}, subtest.name),
    el('div', { class: 'guide-grid' }, Object.entries(bank.topics).map(([id, label]) => {
      const a = accuracy(bank.questions.filter((q) => q.topic === id), history);
      return el('a', { class: 'guide-link', href: guideHref(subtest.id, id) },
        el('span', { class: 'guide-link-title' }, label),
        el('span', { class: 'small muted' }, a.pct == null ? 'Not practiced yet' : `${a.pct}% correct in practice`),
      );
    })),
  ]);

  mount(app,
    el('h1', {}, 'Study guides'),
    el('p', { class: 'lead' },
      'Short lessons for every topic on the AFQT: the rules and formulas to know, a worked example and the trap to avoid. Each guide ends with practice questions on that topic.'),
    sections,
  );
}

/* ---------- One guide ---------- */

function block(b) {
  if (b.p) return el('p', {}, b.p);
  if (b.h) return el('h2', {}, b.h);
  if (b.list) return el('ul', { class: 'guide-list' }, b.list.map((t) => el('li', {}, t)));
  if (b.formula) return el('div', { class: 'formula' }, b.formula.map((t) => el('div', {}, t)));
  if (b.example) {
    return el('div', { class: 'example' },
      el('div', { class: 'example-label' }, 'Worked example'),
      el('p', { class: 'example-q' }, b.example.q),
      el('ol', {}, b.example.steps.map((s) => el('li', {}, s))),
      b.example.answer ? el('p', { class: 'example-a' }, 'Answer: ', el('strong', {}, b.example.answer)) : null,
    );
  }
  if (b.tip) return el('div', { class: 'tip' }, el('strong', {}, 'Watch out: '), b.tip);
  return null;
}

export async function renderGuide(app, subtestId, topicId) {
  const mine = ++token;
  mount(app, el('p', { class: 'muted' }, 'Loading…'));
  const subtest = getSubtest(subtestId);
  let guides;
  let bank;
  try {
    if (!subtest?.ready) throw new Error('unknown subtest');
    [guides, bank] = await Promise.all([loadData(GUIDES_FILE), loadBank(subtest)]);
  } catch {
    if (mine === token) mount(app, loadError());
    return;
  }
  if (mine !== token) return;

  const blocks = guides[subtestId]?.[topicId];
  const label = bank.topics[topicId];
  if (!blocks || !label) {
    mount(app,
      el('p', { class: 'notice error' }, 'That study guide doesn’t exist.'),
      el('p', {}, el('a', { href: '#guides' }, '← All study guides')));
    return;
  }
  document.title = `${label} · Study Guide · ASVAB Prep`;

  const topicIds = Object.keys(bank.topics);
  const i = topicIds.indexOf(topicId);
  const prev = topicIds[i - 1];
  const next = topicIds[i + 1];
  const count = bank.questions.filter((q) => q.topic === topicId).length;

  mount(app,
    el('p', { class: 'small' }, el('a', { href: '#guides' }, '← All study guides')),
    el('div', { class: 'eyebrow' }, subtest.name),
    el('h1', {}, label),
    el('article', { class: 'card guide' }, blocks.map(block)),
    el('div', { class: 'actions' },
      el('button', {
        class: 'btn primary',
        type: 'button',
        onclick: () => {
          presetPractice(subtestId, { topics: [topicId] });
          location.hash = subtestId;
        },
      }, `Practice ${label} (${count} questions)`),
    ),
    el('nav', { class: 'guide-pager', 'aria-label': 'More guides' },
      prev ? el('a', { href: guideHref(subtestId, prev) }, `← ${bank.topics[prev]}`) : el('span', {}),
      next ? el('a', { href: guideHref(subtestId, next) }, `${bank.topics[next]} →`) : el('span', {}),
    ),
  );
}

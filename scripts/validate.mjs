#!/usr/bin/env node
// Checks every question bank in data/ for format mistakes.
// Usage: node scripts/validate.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const errors = [];
const allIds = new Set();
let total = 0;

const SPECIAL = ['guides.json', 'vocab.json'];
const bankTopics = {};
for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.json') && !SPECIAL.includes(f))) {
  const where = (msg) => errors.push(`${file}: ${msg}`);
  let bank;
  try {
    bank = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
  } catch (e) {
    where(`invalid JSON — ${e.message}`);
    continue;
  }
  if (bank.subtest !== file.replace('.json', '')) where(`"subtest" should be "${file.replace('.json', '')}"`);
  if (!bank.name) where('missing "name"');
  if (!bank.topics || typeof bank.topics !== 'object') where('missing "topics" object');
  if (!Array.isArray(bank.questions)) {
    where('missing "questions" array');
    continue;
  }

  const counts = {};
  for (const [i, q] of bank.questions.entries()) {
    const at = (msg) => where(`question ${q.id || `#${i + 1}`}: ${msg}`);
    total += 1;
    if (!q.id) at('missing id');
    else if (allIds.has(q.id)) at('duplicate id');
    else allIds.add(q.id);
    if (!bank.topics?.[q.topic]) at(`unknown topic "${q.topic}"`);
    else counts[q.topic] = (counts[q.topic] || 0) + 1;
    if (![1, 2, 3].includes(q.difficulty)) at('difficulty must be 1, 2 or 3');
    if (!q.question?.trim()) at('missing question text');
    if (!Array.isArray(q.choices) || q.choices.length < 2) at('needs at least 2 choices');
    else {
      if (new Set(q.choices).size !== q.choices.length) at('duplicate choices');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
        at('answer must be the 0-based index of the correct choice');
      }
    }
    if (!q.explanation?.trim()) at('missing explanation');
    if (q.passage !== undefined && !bank.passages?.[q.passage]) at(`unknown passage "${q.passage}"`);
  }
  for (const id of Object.keys(bank.passages || {})) {
    if (!bank.questions.some((q) => q.passage === id)) where(`passage "${id}" has no questions`);
  }
  bankTopics[bank.subtest] = Object.keys(bank.topics || {});
  console.log(`${file}: ${bank.questions.length} questions`);
  for (const [t, label] of Object.entries(bank.topics || {})) {
    console.log(`  ${label.padEnd(30)} ${counts[t] || 0}`);
  }
}

// Study guides: one per topic, known block types only.
const BLOCKS = ['p', 'h', 'list', 'formula', 'example', 'tip'];
try {
  const guides = JSON.parse(readFileSync(join(dataDir, 'guides.json'), 'utf8'));
  let n = 0;
  for (const [sub, topics] of Object.entries(bankTopics)) {
    for (const t of topics) {
      const blocks = guides[sub]?.[t];
      if (!Array.isArray(blocks) || !blocks.length) { errors.push(`guides.json: missing guide for ${sub}/${t}`); continue; }
      n += 1;
      blocks.forEach((b, i) => {
        const keys = Object.keys(b);
        if (keys.length !== 1 || !BLOCKS.includes(keys[0])) errors.push(`guides.json: ${sub}/${t} block ${i + 1} should have exactly one of ${BLOCKS.join(', ')}`);
        if (b.example && (!b.example.q || !Array.isArray(b.example.steps))) errors.push(`guides.json: ${sub}/${t} example ${i + 1} needs q and steps`);
      });
    }
  }
  console.log(`guides.json: ${n} topic guides`);
} catch (e) {
  errors.push(`guides.json: ${e.message}`);
}

// Flashcards: word, pos, def, example; no duplicate words.
try {
  const { cards } = JSON.parse(readFileSync(join(dataDir, 'vocab.json'), 'utf8'));
  const seen = new Set();
  cards.forEach((c, i) => {
    for (const k of ['word', 'pos', 'def', 'example']) if (!c[k]?.trim()) errors.push(`vocab.json: card ${i + 1} missing ${k}`);
    if (seen.has(c.word)) errors.push(`vocab.json: duplicate word "${c.word}"`);
    seen.add(c.word);
  });
  console.log(`vocab.json: ${cards.length} flashcards`);
} catch (e) {
  errors.push(`vocab.json: ${e.message}`);
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`\nAll ${total} questions OK.`);

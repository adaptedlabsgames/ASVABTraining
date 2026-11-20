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

for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
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
  }
  console.log(`${file}: ${bank.questions.length} questions`);
  for (const [t, label] of Object.entries(bank.topics || {})) {
    console.log(`  ${label.padEnd(30)} ${counts[t] || 0}`);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`\nAll ${total} questions OK.`);

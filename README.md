# ASVAB Prep

A free, static ASVAB practice site. It focuses on the four AFQT subtests: Arithmetic Reasoning, Math Knowledge, Word Knowledge and Paragraph Comprehension.

- Plain HTML, CSS and JavaScript. There is no build step and nothing to install.
- Progress is saved in each student's browser (localStorage). Students don't need accounts.
- Questions live in editable JSON files in `data/`.

## Run it locally

The pages load question files with `fetch`, so they need a web server. Opening `index.html` directly from disk won't work.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project layout

```
index.html          The whole site. Views switch by the address part after "#"
                    (no hash = home, #ar = Arithmetic Reasoning practice,
                    #test = timed practice test)
css/style.css
js/config.js        Subtest registry: add new subtests here
js/quiz.js          Loading banks, picking and shuffling questions
js/storage.js       Saved progress (localStorage)
js/app.js           Picks the view from the address
js/dom.js           Small helpers for building the page
js/practice.js      Practice view
js/test.js          Timed test view (sections, timer, review, results)
js/scoring.js       Test formats, section scoring and the AFQT estimate
js/home.js          Home view
data/<id>.json      Question banks
scripts/validate.mjs  Checks question banks for mistakes
```

## Question format

Each bank in `data/` looks like this:

```json
{
  "subtest": "ar",
  "name": "Arithmetic Reasoning",
  "topics": { "percents": "Percents", "rates": "Rate, Distance & Work" },
  "questions": [
    {
      "id": "ar-001",
      "topic": "percents",
      "difficulty": 1,
      "question": "A jacket that normally costs $80 is on sale for 25% off. What is the sale price?",
      "choices": ["$55", "$60", "$64", "$20"],
      "answer": 1,
      "explanation": "25% of $80 = $20 off.\n$80 − $20 = $60."
    }
  ]
}
```

- `id` must be unique across all banks and should start with the subtest id (for example `ar-061`). Don't reuse or renumber an id: students' saved progress is stored by id.
- `topic` must be one of the keys in `topics`.
- `difficulty` is 1 (easy), 2 (medium) or 3 (hard).
- `answer` is the position of the correct choice, counting from 0. The first choice is 0.
- Choices are shuffled every time a question is shown, so their order in the file doesn't matter. Don't write choices like "all of the above".
- In `explanation`, `\n` starts a new line.
- Reading questions can share a passage. Put the passage text in a top-level `"passages"` object, such as `"passages": { "p01": "Passage text…" }`. Then give each question that uses it `"passage": "p01"`. See `data/pc.json`.

After editing a bank, run:

```sh
node scripts/validate.mjs
```

## Adding a subtest

1. Create `data/<id>.json` in the format above.
2. In `js/config.js`, set `ready: true` on that subtest. To add a new subtest, add an entry to the list.

## Timed test and AFQT estimate

Question counts and time limits for the timed test are in `FORMATS` in `js/scoring.js`. They follow the paper ASVAB: AR 30 questions in 36 min, WK 35 in 11, PC 15 in 13, MK 25 in 24. Half length uses roughly half of each.

The estimated AFQT range weights each section the way the AFQT does: Word Knowledge and Paragraph Comprehension together count twice. It applies that weighting to percent correct and shows a band of ±8. Real AFQT scores are percentiles based on national norms that aren't public, so the estimate is only a rough guide. The site says so wherever the estimate appears.

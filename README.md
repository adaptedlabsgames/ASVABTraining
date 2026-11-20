# ASVAB Prep

A free, static ASVAB practice site. It covers the four AFQT subtests (Arithmetic Reasoning, Math Knowledge, Word Knowledge and Paragraph Comprehension) plus all five technical subtests: General Science, Auto & Shop, Electronics, Mechanical Comprehension and Assembling Objects.

- Plain HTML, CSS and JavaScript. There is no build step and nothing to install.
- Progress is saved in each student's browser (localStorage). Students don't need accounts.
- Questions live in editable JSON files in `data/`.

## Live site

Hosted on GitHub Pages from the `main` branch: https://adaptedlabsgames.github.io/ASVABTraining/

To make changes, work on a separate branch and merge it into `main`. The live site updates a minute or two after each merge.

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
                    #test = timed practice test, #progress = progress,
                    #guides = study guides, #guide-ar-percents = one guide,
                    #flashcards = vocabulary flashcards,
                    #plan = study plan from a score report)
css/style.css
js/config.js        Subtest registry: add new subtests here
js/quiz.js          Loading banks, picking and shuffling questions
js/storage.js       Saved progress (localStorage)
js/app.js           Picks the view from the address
js/dom.js           Small helpers for building the page
js/practice.js      Practice view
js/test.js          Timed test view (sections, timer, review, results)
js/scoring.js       Test formats, section scoring and the AFQT estimate
js/progress.js      Progress view (accuracy, missed-question review, history, reset)
js/guides.js        Study guide index and topic pages
js/flashcards.js    Vocabulary flashcards
js/srs.js           Flashcard scheduling (spaced repetition)
js/plan.js          Study plan built from a student's score report
js/share.js         The progress summary students send to their teacher
js/home.js          Home view
data/<id>.json      Question banks
data/guides.json    Study guide content, one per topic
data/vocab.json     Flashcard words
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

Question counts and time limits for the timed test are in `FORMATS` in `js/scoring.js`. They follow the paper ASVAB: AR 30 questions in 36 min, WK 35 in 11, PC 15 in 13, MK 25 in 24, GS 25 in 11, AS 25 in 11, EI 20 in 9, MC 25 in 19, AO 25 in 15. Half length uses roughly half of each. Any live subtest with an entry in `FORMATS` can be taken as a single timed section. Only the four AFQT sections produce an AFQT estimate.

The estimated AFQT range weights each section the way the AFQT does: Word Knowledge and Paragraph Comprehension together count twice. It applies that weighting to percent correct and shows a band of ±8. Real AFQT scores are percentiles based on national norms that aren't public, so the estimate is only a rough guide. The site says so wherever the estimate appears.

## Progress

The Progress page reads everything from the browser's saved data:

- **Accuracy** counts every answer a student has given, in practice and on tests. Topics are listed weakest first. A topic needs at least 3 answers before it gets a level ("Needs work" under 60%, "Getting there" from 60%, "Strong" from 80%).
- **Review what you missed** lists questions the student got wrong the last time they answered them. A question leaves the list once it's answered correctly.
- **Send your progress to your teacher** builds a short plain-text summary that a student can copy (or share on a phone) and paste into a text or email. It includes an optional name, days active in the last two weeks, practice sets and timed tests, the latest AFQT estimate, accuracy by subtest, the five weakest topics (with at least 3 answers each), the study plan focus, flashcard progress and how many missed questions are left to review. Nothing is sent automatically, and the student can see the full text before copying it.
- **Reset progress** erases this device's saved answers, scores and any test in progress, after the student confirms.

## Study guides

`data/guides.json` holds one guide for each topic, stored by subtest and topic id (for example `"ar": { "percents": [ … ] }`). A guide is a list of blocks, and each block has exactly one of these keys:

| Block | Shows |
|---|---|
| `{ "p": "text" }` | a paragraph |
| `{ "h": "text" }` | a subheading |
| `{ "list": ["…", "…"] }` | a bulleted list |
| `{ "formula": ["…", "…"] }` | a highlighted box of rules or formulas |
| `{ "example": { "q": "…", "steps": ["…"], "answer": "…" } }` | a worked example |
| `{ "tip": "text" }` | a "Watch out" box |
| `{ "figure": { "src": "data/figures/….svg", "alt": "…" } }` | a diagram |

The validator checks that every topic in every question bank has a guide.

## Flashcards

`data/vocab.json` holds the words, each with `word`, `pos` (part of speech), `def` and `example`. Scheduling works like this:

- A session holds every card that's due, plus up to 10 new ones.
- "Knew it" moves a card up a box, so it waits longer before coming back: 2, 4, 7, then 14 days.
- "Didn't know it" sends a card back to box 1. It returns tomorrow, and up to twice more in the same session.

Progress is saved by word, so you can add new words without resetting students' progress.

## Hosting on GitHub Pages (one-time setup)

1. In the repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then click **Save**.
4. After a minute or two, the site is live at https://adaptedlabsgames.github.io/ASVABTraining/.

The empty `.nojekyll` file tells GitHub Pages to serve the files as they are, without processing them first. The site is plain static files and has no build step.

## Difficulty

Every question has a `difficulty` from 1 to 3. On the practice setup page, students can choose **Easy first** (the default: every level, easiest first), **Easy**, **Medium**, **Hard** or **Mixed**. Questions a student missed last time still come first when "Focus on weak spots" is on.

## Study plan

On the **Study plan** page (`#plan`), a student types in the percentile scores from their ASVAB score report. The page then:

- Shows their AFQT category and their next goal: 31 to enlist with most branches, then 50 (Category IIIA).
- Ranks the four AFQT subtests from lowest to highest and marks the two lowest "Focus first".
- Suggests a practice difficulty for each subtest: Easy below the 20th percentile, Easy first from 20 to 49, and Mixed from 50 up.
- Builds a simple weekly routine.
- Lists any technical subtest scores they entered.
- Shows any Career Exploration Scores they entered (Verbal Skills, Math Skills, Science and Technical Skills) as a summary. These combine several subtests, so they don't change the plan.

The scores are saved only in that browser. "Reset progress" on the Progress page clears them along with everything else.

## Diagrams

A question can show a diagram. Add `"figure": "data/figures/name.svg"` and `"figureAlt": "a text description for screen readers"` to the question. Guides can include one as a `figure` block (see above).

The diagrams (circuits, levers, pulleys, gears and so on) are drawn by `scripts/make_figures.py`. To change one, edit the script and run `python3 scripts/make_figures.py`; don't edit the SVG files by hand. The site shows diagrams on a light panel, so dark lines work in both light and dark mode. The validator checks that every figure file exists and has a description.

## Assembling Objects

Assembling Objects questions have picture answers. A question with picture choices has `"choiceImages": [ … ]`, one picture per choice, and `choices` holds a text description of each picture for screen readers. Choices are shuffled with their pictures.

The questions and their pictures are generated by `scripts/make_ao.py`, which writes `data/ao.json` and the `data/figures/ao-*.svg` files. Don't edit those by hand; change the script and run `python3 scripts/make_ao.py`. Each wrong answer is built from a different set of pieces (shape puzzles) or a different pair of attachment points (connections), so no wrong choice can also be correct.

The first 36 questions (ao-001 to ao-036) come from the original shape families and random seed. Questions added later use a separate seed and separate pattern lists (`EXTRA` and `NEW_FAMILIES`), so the originals and students' saved progress on them never change. When adding more, append new patterns to those lists or raise the connection count; don't edit `FAMILIES`.

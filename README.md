# Ety / 에티 — V1

A local, frontend-only English vocabulary test generator built with React,
TypeScript and Vite. The fixed Excel workbook is the authoritative source.

## Run

Node.js 22.12 or newer is recommended.

```sh
cd ety
npm install
npm run dev
```

Open the localhost URL printed by Vite.

```sh
npm run lint
npm test
npm run build
```

The production output is in `dist/`. Serve it over HTTP; opening its HTML
directly as a file does not support workbook fetching.

## What works

- 암기: one chapter per session, Chapters 16–18, Easy/Medium/Hard.
- Ten question slides: five meaning-match and five sentence-blank questions
  for each supplied chapter.
- Previous/next navigation, stored answers and reload recovery.
- No correctness feedback during the test.
- Final score, correct/incorrect counts and ten clickable review items.
- Review shows recorded selections, the complete correct choice set, and
  original meanings for all four meaning pairs. Review inputs are disabled.
- 모의고사 and 공지 are deliberately simple coming-soon pages.
- Original Thoth image and official local Libron webfonts.
- Exact `--ety-blue: #9EBFE2`, responsive layout and semantic controls.

## Architecture

| Area | Files / responsibility |
| --- | --- |
| Original source | `public/data/Ety_Vocab_Ch16_18.xlsx` |
| Original artwork | `public/brand/thoth.png` |
| Typography | `public/fonts/`, official Libron v0.25 WOFF2 files and OFL |
| Workbook loader | `src/engine/loadVocabulary.ts` |
| Data and session types | `src/engine/types.ts` |
| Similarity and seeded randomness | `src/engine/distractors.ts` |
| Question generation | `src/engine/generateQuestion.ts` |
| Scoring / question-index lookup | `src/engine/scoring.ts` |
| Validated device-local storage | `src/engine/session.ts` |
| Screen and tab state | `src/App.tsx` |
| Settings / slides / results | `src/components/` |
| Layout and tokens | `src/styles.css` |
| Engine, DOM-flow, storage checks | `tests/` |

There is no backend, login, AI API, cloud database or analytics.
The build separates the Excel parser into its own bundle.

## Workbook loading and integrity

The loader fetches the original workbook as bytes and reads it with SheetJS.
It requires the four specified headers and uses the configured chapter names.
It preserves original word, meaning and example strings, including literal
backslash-n sequences present in some cells. It does not normalize or rewrite
the workbook or its text.

Missing sheets, malformed rows and exact duplicate word strings produce
diagnostics. The first valid row for a duplicate word is used; the source file
remains untouched. Unusable chapter data disables that chapter. A failed fetch
shows a retry action.

Source SHA-256, recorded immediately after copying:

```text
80a07901af2e39e27d7962f49631b3cdb5c00a29430fc650ff203e9bc6b173ed
```

The original download and committed copy were compared byte-for-byte.
Automated tests pin the source checksum and verify it after generation.

SheetJS is vendored at `vendor/xlsx-0.20.3.tgz` from its official CDN, following
the official installation instructions:
https://docs.sheetjs.com/docs/getting-started/installation/frameworks/
The older npm-registry release was replaced after dependency auditing.

## Question generation

**Type 1:** sample four distinct source words. Randomly choose 1–4 pair indices
to be correct. Correct pairs retain their original meaning. Other pairs use a
different source meaning, preferring words according to difficulty. Meanings
identical to the target's meaning cannot be used as wrong choices. If a
different meaning does not exist, that pair remains correct.

**Type 2:** use an unchanged source example cell. Find exact, case-sensitive
target occurrences bounded by non-letter/non-number characters. Escape
punctuation in target words and handle multi-word targets. Replace every exact
occurrence with a blank to avoid revealing the answer elsewhere in the cell.
Skip rows with no safe occurrence. Inflections, different case and substrings
are not treated as exact matches. Add two distinct source-word distractors and
shuffle the three choices. Exactly one is the original target.

Sentence targets do not repeat within the five-question batch when at least
five eligible entries exist. If no source rows are safe for sentence blanks,
generation falls back to meaning-match questions instead of inventing text.
Chapters with fewer than four distinct words show a clear generation error.

**Difficulty:** Easy shuffles the available chapter words. Medium combines
normalized Levenshtein similarity, prefix/suffix overlap and random ranking
noise. Hard uses the same similarity score with much less noise. When a chapter
has few similar words, the available candidates are still used without
duplicates. These are visual similarity heuristics, not semantic judgments.

A session stores its random seed. The same chapter, difficulty and seed
reproduce the same questions. Question count is a generator argument, default
10, so future configuration does not require changing the generator.

## Scoring and review

Each question is worth one point. Meaning-match questions require the exact
complete selected set; there is no partial credit. Sentence questions require
the one correct option. Unanswered questions count as incorrect.

Results derive from the stored questions and answers. Result items carry the
original array index and question ID, so Question N opens the same recorded
Question N. Reviewing changes only the current index. It cannot alter answers.
Starting a new session replaces the saved session only when Start is pressed.

Storage is device-local. A quota/access failure displays a warning; malformed
stored sessions are ignored. This is progress recovery, not secure exam
delivery: a person using developer tools can inspect client-side answers.

## Verification and limitations

Final checks:

- `npm install` and clean `npm ci`: successful.
- ESLint: successful.
- Vitest: 32 passing tests across engine, UI and storage.
- Production TypeScript/Vite build: successful.
- `npm audit`: zero reported vulnerabilities.
- Engine coverage: all nine chapter/difficulty combinations across 30 seeds
  each, 2,700 generated questions; both question structures and scoring.
- DOM interaction coverage: all chapter/difficulty combinations, keyboard
  answer selection, back/forward persistence, reload, submission, Question 5
  review mapping, complete answer sets, disabled review inputs and load errors.
- Local HTTP checks: app, original Excel, original logo and regular Libron font
  all returned HTTP 200.
- Workbook and logo copies matched the downloaded originals byte-for-byte.
- Font files have WOFF2 signatures; license is included.

The cloud browser refused localhost with `ERR_BLOCKED_BY_CLIENT`. Therefore
live browser visual inspection, responsive screenshots and confirmation of
actual font rendering were not completed. DOM tests do not replace those
checks. A secondary Python font-decoding check could not run because its
optional Brotli module was unavailable; the official font bytes were retained.

The environment initially could not start Vite with host 0.0.0.0 because network
interface enumeration failed. The checked-in configuration uses 127.0.0.1;
the normal `npm run dev` command and local HTTP checks then succeeded.

No known core-flow failure remains in the automated checks. Long source
example cells are intentionally shown intact, which can make individual
slides lengthy. Multiple choice words can recur across different questions,
as the fixed chapter is sampled locally. Difficulty is constrained by the 40
source words in each chapter. Korean uses readable system fallback fonts.

## Repository safety and delivery

The workspace was inspected before creation. It was not a Git repository and
had no applicable Git remote. A new isolated `ety` repository was initialized
on branch `main`. All application changes and commits were made inside it.
No other Git or GitHub repository was modified.

GitHub repository creation was not exposed by the available GitHub operations,
and the GitHub CLI was unavailable. No remote was configured and nothing was
pushed. This deliverable is a local repository, not a deployed website.

The downloadable archive includes tracked source files, original assets,
dependency lockfile, the official SheetJS package and `.git` commit history.
It excludes node_modules, build output and temporary download files.

All tracked files were created for this new repository. Existing user source
files were read only; none were edited. See `git ls-files` for the exact
inventory and `git log --oneline` for the incremental development history.

## Next steps

1. Run a desktop/tablet/mobile visual review in a browser with local access.
2. For Chapters 19–22, supply an authoritative expanded workbook, add its sheet
   names to `CHAPTER_NAMES`, and extend source-integrity tests. The chapter
   selector reads that shared list. Do not edit the existing workbook in place
   to manufacture future data.
3. Define the actual 모의고사 source, formats and scoring before implementing
   that mode. Keep its test policy separate while reusing slides/results where
   their rules match.
4. Create a private GitHub repository named exactly `ety` and push this history
   when repository-creation access becomes available.

Libron source and license:
https://github.com/nicoverbruggen/libron
The upstream repository was inspected read-only and was not modified.

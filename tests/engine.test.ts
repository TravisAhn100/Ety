import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { parseVocabulary } from "../src/engine/loadVocabulary";
import {
  blankSentence,
  generateQuestions,
} from "../src/engine/generateQuestion";
import { isCorrect, scoreSession, reviewQuestion } from "../src/engine/scoring";
import { similarity } from "../src/engine/distractors";
import type {
  Difficulty,
  TestSession,
  VocabularyEntry,
} from "../src/engine/types";
const bytes = readFileSync("public/data/Ety_Vocab_Ch16_18.xlsx");
const { chapters } = parseVocabulary(bytes);
const entry = (word: string, sentence: string): VocabularyEntry => ({
  id: "x",
  no: "1",
  word,
  meaning: "뜻",
  sentence,
});
describe("source integrity", () => {
  it("loads exactly Chapters 16–18 with 40 entries each", () => {
    expect(chapters.map((c) => c.id)).toEqual([
      "Chapter 16",
      "Chapter 17",
      "Chapter 18",
    ]);
    expect(chapters.map((c) => c.entries.length)).toEqual([40, 40, 40]);
  });
  it("leaves the original source byte-for-byte unchanged after parsing and generation", () => {
    const hash = (b: Uint8Array) =>
      createHash("sha256").update(b).digest("hex");
    chapters.forEach((c) => generateQuestions(c, "Hard", 42));
    expect(hash(readFileSync("public/data/Ety_Vocab_Ch16_18.xlsx"))).toBe(
      "80a07901af2e39e27d7962f49631b3cdb5c00a29430fc650ff203e9bc6b173ed",
    );
    expect(hash(bytes)).toBe(
      hash(readFileSync("public/data/Ety_Vocab_Ch16_18.xlsx")),
    );
  });
  it("preserves original word, meaning and example strings", () => {
    const wb = XLSX.read(bytes, { type: "array" });
    const row = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Chapter 16"], {
      header: 1,
    })[1];
    expect(chapters[0].entries[0]).toMatchObject({
      word: row[1],
      meaning: row[2],
      sentence: row[3],
    });
  });
});
describe.each(chapters)("$id engine", (chapter) => {
  it.each(["Easy", "Medium", "Hard"] as Difficulty[])(
    "%s generates valid questions across 30 seeds",
    (difficulty) => {
      for (let seed = 0; seed < 30; seed++) {
        const qs = generateQuestions(chapter, difficulty, seed);
        expect(qs).toHaveLength(10);
        expect(qs.filter((q) => q.type === "sentence")).toHaveLength(5);
        expect(qs).toEqual(generateQuestions(chapter, difficulty, seed));
        for (const q of qs) {
          expect(new Set(q.choices.map((c) => c.word)).size).toBe(
            q.choices.length,
          );
          expect(q.choices).toHaveLength(q.type === "meaning" ? 4 : 3);
          expect(q.correctIds.length).toBeGreaterThanOrEqual(1);
          expect(isCorrect(q, q.correctIds)).toBe(true);
          expect(isCorrect(q, [])).toBe(false);
          if (q.type === "sentence") {
            expect(q.correctIds).toHaveLength(1);
            expect(
              q.choices.filter((c) => c.word === q.targetWord),
            ).toHaveLength(1);
            expect(q.choices.find((c) => c.id === q.correctIds[0])?.word).toBe(
              q.targetWord,
            );
            expect(q.sentence).toContain("______");
          } else {
            expect(new Set(q.choices.map((c) => c.meaning)).size).toBe(4);
            expect(q.correctIds.length).toBeLessThanOrEqual(4);
            for (const c of q.choices)
              expect(c.meaning === q.originals[c.id]).toBe(
                q.correctIds.includes(c.id),
              );
          }
        }
      }
    },
  );
});
describe("scoring and review", () => {
  const questions = generateQuestions(chapters[0], "Medium", 27);
  const s: TestSession = {
    version: 1,
    questions,
    chapter: chapters[0].id,
    difficulty: "Medium",
    seed: 27,
    index: 0,
    completed: true,
    answers: Object.fromEntries(
      questions.map((q, i) => [q.id, i < 7 ? q.correctIds : []]),
    ),
  };
  it("scores seven correct answers stably without mutating state", () => {
    const before = JSON.stringify(s);
    expect(scoreSession(s)).toMatchObject({
      total: 10,
      correct: 7,
      incorrect: 3,
      score: 70,
    });
    expect(scoreSession(s)).toEqual(scoreSession(s));
    expect(JSON.stringify(s)).toBe(before);
  });
  it("requires exactly the complete multi-select answer set", () => {
    const q = {
      ...questions.find((q) => q.type === "meaning")!,
      correctIds: ["A", "C"],
    };
    expect(isCorrect(q, ["C", "A"])).toBe(true);
    expect(isCorrect(q, ["A"])).toBe(false);
    expect(isCorrect(q, ["A", "B", "C"])).toBe(false);
  });
  it("maps clickable review indices to the same original question", () => {
    scoreSession(s).items.forEach((item) => {
      expect(reviewQuestion(s, item.index)).toBe(s.questions[item.index]);
      expect(reviewQuestion(s, item.index).id).toBe(item.questionId);
    });
  });
  it("generates 1, 2, 3 and 4 correct meaning pairs", () => {
    const counts = new Set<number>();
    for (let seed = 0; seed < 50; seed++)
      generateQuestions(chapters[0], "Easy", seed).forEach((q) => {
        if (q.type === "meaning") counts.add(q.correctIds.length);
      });
    expect([...counts].sort()).toEqual([1, 2, 3, 4]);
  });
});
describe("edge cases", () => {
  it("does not match inflections or substrings, and blanks capitalized occurrences", () => {
    expect(blankSentence(entry("act", "Actors acted."))).toBeNull();
    expect(blankSentence(entry("word", "Word"))).toBe("______");
    expect(blankSentence(entry("act", "We act and act."))).toBe(
      "We ______ and ______.",
    );
  });
  it("escapes punctuation and handles multi-word entries", () => {
    expect(blankSentence(entry("a+b", "Use a+b."))).toBe("Use ______.");
    expect(blankSentence(entry("in turn", "They help in turn."))).toBe(
      "They help ______.",
    );
  });
  it("skips unsafe sentence rows instead of fabricating examples", () => {
    const c = {
      id: "test",
      entries: chapters[0].entries
        .slice(0, 4)
        .map((e) => ({ ...e, sentence: "unrelated" })),
    };
    expect(
      generateQuestions(c, "Hard", 1).every((q) => q.type === "meaning"),
    ).toBe(true);
  });
  it("reports missing sheets, malformed rows and duplicate words", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["No.", "Word", "Korean Translation", "Example Sentence"],
        [1, "word", "뜻", "word"],
        [2, "word", "뜻", "word"],
        [3, "", "", ""],
      ]),
      "Chapter 16",
    );
    const result = parseVocabulary(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }),
    );
    expect(result.chapters[0].entries).toHaveLength(1);
    expect(result.warnings.length).toBe(4);
  });
  it("rejects insufficient vocabulary clearly", () =>
    expect(() =>
      generateQuestions(
        { id: "x", entries: chapters[0].entries.slice(0, 2) },
        "Easy",
        1,
      ),
    ).toThrow("최소 4"));
  it("ranks confusable words over unrelated words", () =>
    expect(similarity("complaisant", "complacent")).toBeGreaterThan(
      similarity("complaisant", "fireman"),
    ));
});

describe("combined chapter safeguards", () => {
  it("uses only selected source entries and no repeated words or meanings across combined chapters", () => {
    for (const selection of [
      [chapters[0], chapters[1]],
      [chapters[1], chapters[2]],
      chapters,
    ]) {
      for (const difficulty of ["Easy", "Medium", "Hard"] as Difficulty[]) {
        for (let seed = 0; seed < 25; seed++) {
          const qs = generateQuestions(selection, difficulty, seed);
          const sourceWords = new Set(
            selection.flatMap((c) => c.entries.map((e) => e.word)),
          );
          for (const q of qs) {
            expect(
              new Set(q.choices.map((c) => c.word.toLowerCase())).size,
            ).toBe(q.choices.length);
            expect(q.choices.every((c) => sourceWords.has(c.word))).toBe(true);
            if (q.type === "meaning")
              expect(new Set(q.choices.map((c) => c.meaning)).size).toBe(4);
            else
              expect(
                q.sentence
                  .split("\n")
                  .every((example) => example.includes("______")),
              ).toBe(true);
          }
        }
      }
    }
  });
  it("blanks all occurrences in each displayed example and skips unblankable examples", () => {
    const e = entry(
      "word",
      "① Word and word.\\n② A word here.\\nⒺ Some words here.",
    );
    expect(blankSentence(e)).toBe("① ______ and ______.\n② A ______ here.");
    expect(e.sentence).toBe(
      "① Word and word.\\n② A word here.\\nⒺ Some words here.",
    );
  });
  it("deduplicates bilingual even when it occurs in multiple selected chapters", () => {
    const bilingual = {
      ...chapters[0].entries[0],
      word: "bilingual",
      sentence: "A bilingual person.",
    };
    const selection = [
      { id: "a", entries: [...chapters[0].entries, bilingual] },
      { id: "b", entries: [bilingual, ...chapters[1].entries] },
    ];
    for (let seed = 0; seed < 30; seed++)
      for (const q of generateQuestions(selection, "Hard", seed))
        expect(
          q.choices.filter((c) => c.word === "bilingual").length,
        ).toBeLessThanOrEqual(1);
  });
});

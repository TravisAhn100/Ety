import type { Chapter, Difficulty, Question, VocabularyEntry } from "./types";
import { distractors, seededRandom, shuffle } from "./distractors";
export function blankSentence(entry: VocabularyEntry): string | null {
  const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Exact, case-sensitive target; reject inflections and substrings. All exact occurrences
  // are blanked so another copy of the target cannot give the answer away.
  const regex = new RegExp(
    "(?<![\\p{L}\\p{N}_])" + escaped + "(?![\\p{L}\\p{N}_])",
    "gu",
  );
  return regex.test(entry.sentence)
    ? entry.sentence.replace(regex, "______")
    : null;
}
export function generateQuestions(
  chapter: Chapter,
  difficulty: Difficulty,
  seed: number,
  count = 10,
): Question[] {
  const random = seededRandom(seed),
    pool = [...new Map(chapter.entries.map((e) => [e.word, e])).values()];
  if (pool.length < 4)
    throw new Error("이 범위에는 최소 4개의 서로 다른 단어가 필요합니다.");
  const eligible = shuffle(
    pool.filter((e) => blankSentence(e) !== null),
    random,
  );
  const sentenceCount = eligible.length ? Math.floor(count / 2) : 0;
  const questions: Question[] = [];
  for (let n = 0; n < count; n++) {
    const id = "q" + (n + 1);
    if (n < sentenceCount) {
      const target = eligible[n % eligible.length],
        others = distractors(target, pool, 2, difficulty, random);
      if (others.length < 2) throw new Error("빈칸 선택지가 부족합니다.");
      const choices = shuffle([target, ...others], random).map((e, i) => ({
        id: String.fromCharCode(65 + i),
        word: e.word,
      }));
      questions.push({
        id,
        type: "sentence",
        sentence: blankSentence(target)!,
        originalSentence: target.sentence,
        targetWord: target.word,
        choices,
        correctIds: choices
          .filter((c) => c.word === target.word)
          .map((c) => c.id),
      });
    } else {
      const targets = shuffle(pool, random).slice(0, 4),
        correctCount = 1 + Math.floor(random() * 4);
      const good = new Set(
        shuffle([0, 1, 2, 3], random).slice(0, correctCount),
      );
      const originals: Record<string, string> = {};
      const correctIds: string[] = [];
      const choices = targets.map((target, i) => {
        const letter = String.fromCharCode(65 + i);
        originals[letter] = target.meaning;
        const wrong = distractors(target, pool, 1, difficulty, random, true)[0];
        const correct = good.has(i) || !wrong;
        if (correct) correctIds.push(letter);
        return {
          id: letter,
          word: target.word,
          meaning: correct ? target.meaning : wrong.meaning,
        };
      });
      questions.push({ id, type: "meaning", choices, correctIds, originals });
    }
  }
  return shuffle(questions, random).map((q, i) => ({
    ...q,
    id: "q" + (i + 1),
  }));
}

import type { Chapter, Difficulty, Question, VocabularyEntry } from "./types";
import { distractors, seededRandom, shuffle } from "./distractors";
// Identity keys affect comparison only; source strings are never rewritten.
export const identity = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\\n|\s+/g, " ");
export function blankSentence(entry: VocabularyEntry): string | null {
  const escaped = entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    "(?<![\\p{L}\\p{N}_])" + escaped + "(?![\\p{L}\\p{N}_])",
    "giu",
  );
  // A cell may contain numbered examples separated by real or literal newlines.
  // Only display source examples with an exact target occurrence. Do not invent
  // inflection replacements or show an unblanked second example.
  const examples = entry.sentence
    .split(/\\n|\r?\n|(?=[①-⑳Ⓔ])/u)
    .filter(Boolean);
  const safe = examples
    .filter((example) => {
      regex.lastIndex = 0;
      return regex.test(example);
    })
    .map((example) => example.replace(regex, "______"));
  return safe.length ? safe.join("\n") : null;
}
export function generateQuestions(
  chapter: Chapter | Chapter[],
  difficulty: Difficulty,
  seed: number,
  count = 10,
): Question[] {
  const chapters = Array.isArray(chapter) ? chapter : [chapter];
  const random = seededRandom(seed),
    pool = [
      ...new Map(
        chapters.flatMap((c) => c.entries).map((e) => [identity(e.word), e]),
      ).values(),
    ];
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
        others = distractors(target, pool, 2, difficulty, random, true);
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
      const distinctMeanings = new Map<string, VocabularyEntry>();
      for (const entry of shuffle(pool, random)) {
        if (!distinctMeanings.has(identity(entry.meaning)))
          distinctMeanings.set(identity(entry.meaning), entry);
      }
      const targets = [...distinctMeanings.values()].slice(0, 4);
      if (targets.length < 4)
        throw new Error("서로 다른 뜻이 최소 4개 필요합니다.");
      const correctCount = 1 + Math.floor(random() * 4);
      const good = new Set(
        shuffle([0, 1, 2, 3], random).slice(0, correctCount),
      );
      const originals: Record<string, string> = {};
      const correctIds: string[] = [];
      // Reserve correct meanings before choosing wrong ones, so later correct
      // options can never collide with an earlier distractor meaning.
      const usedMeanings = new Set(
        targets.filter((_, i) => good.has(i)).map((e) => identity(e.meaning)),
      );
      const choices = targets.map((target, i) => {
        const letter = String.fromCharCode(65 + i);
        originals[letter] = target.meaning;
        const remainingCorrect = new Set(
          targets
            .filter((_, j) => !good.has(j) && j > i)
            .map((e) => identity(e.meaning)),
        );
        const candidates = pool.filter(
          (e) =>
            !usedMeanings.has(identity(e.meaning)) &&
            !remainingCorrect.has(identity(e.meaning)),
        );
        const wrong = distractors(
          target,
          candidates,
          1,
          difficulty,
          random,
          true,
        )[0];
        const correct = good.has(i) || !wrong;
        if (correct) correctIds.push(letter);
        const meaning = correct ? target.meaning : wrong.meaning;
        usedMeanings.add(identity(meaning));
        return {
          id: letter,
          word: target.word,
          meaning,
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

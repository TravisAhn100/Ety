import type { Question, TestSession } from "./types";
import { identity } from "./generateQuestion";
const KEY = "ety.session.v1";
function validQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Question;
  if (
    typeof q.id !== "string" ||
    !Array.isArray(q.choices) ||
    !Array.isArray(q.correctIds)
  )
    return false;
  if (
    !q.choices.every(
      (c) => c && typeof c.id === "string" && typeof c.word === "string",
    )
  )
    return false;
  if (new Set(q.choices.map((c) => c.id)).size !== q.choices.length)
    return false;
  if (new Set(q.choices.map((c) => identity(c.word))).size !== q.choices.length)
    return false;
  // Old cached questions must not resurrect duplicate pairs after an update.
  if (
    q.type === "meaning" &&
    new Set(q.choices.map((c) => identity(c.meaning ?? ""))).size !== 4
  )
    return false;
  if (!q.correctIds.every((id) => q.choices.some((c) => c.id === id)))
    return false;
  if (q.type === "meaning")
    return (
      q.choices.length === 4 &&
      q.correctIds.length >= 1 &&
      q.correctIds.length <= 4 &&
      q.originals !== null &&
      typeof q.originals === "object" &&
      q.choices.every(
        (c) =>
          typeof c.meaning === "string" &&
          typeof q.originals[c.id] === "string",
      )
    );
  return (
    q.type === "sentence" &&
    q.choices.length === 3 &&
    q.correctIds.length === 1 &&
    typeof q.sentence === "string" &&
    q.sentence
      .split(/\\n|\r?\n|(?=[①-⑳Ⓔ])/u)
      .filter(Boolean)
      .every((example) => example.includes("______")) &&
    typeof q.targetWord === "string" &&
    typeof q.originalSentence === "string"
  );
}
export function readSession(): TestSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      s?.version !== 1 ||
      typeof s.chapter !== "string" ||
      !["Easy", "Medium", "Hard"].includes(s.difficulty) ||
      typeof s.completed !== "boolean" ||
      !Number.isInteger(s.seed)
    )
      return null;
    if (
      !Array.isArray(s.questions) ||
      !s.questions.length ||
      !s.questions.every(validQuestion) ||
      new Set(s.questions.map((q: Question) => q.id)).size !==
        s.questions.length
    )
      return null;
    if (
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index >= s.questions.length ||
      !s.answers ||
      typeof s.answers !== "object" ||
      Array.isArray(s.answers)
    )
      return null;
    if (
      !Object.entries(s.answers).every(
        ([id, answer]) =>
          Array.isArray(answer) &&
          answer.every(
            (choice) =>
              typeof choice === "string" &&
              s.questions.some(
                (q: Question) =>
                  q.id === id && q.choices.some((c) => c.id === choice),
              ),
          ),
      )
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export function saveSession(s: TestSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

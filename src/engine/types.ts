export type Difficulty = "Easy" | "Medium" | "Hard";
export interface VocabularyEntry {
  id: string;
  no: string;
  word: string;
  meaning: string;
  sentence: string;
}
export interface Chapter {
  id: string;
  entries: VocabularyEntry[];
}
export interface Choice {
  id: string;
  word: string;
  meaning?: string;
}
interface BaseQuestion {
  id: string;
  choices: Choice[];
  correctIds: string[];
}
export interface MeaningMatchQuestion extends BaseQuestion {
  type: "meaning";
  originals: Record<string, string>;
}
export interface SentenceBlankQuestion extends BaseQuestion {
  type: "sentence";
  sentence: string;
  originalSentence: string;
  targetWord: string;
}
export type Question = MeaningMatchQuestion | SentenceBlankQuestion;
export type UserAnswer = string[];
export interface TestSession {
  version: 1;
  chapter: string;
  difficulty: Difficulty;
  seed: number;
  questions: Question[];
  answers: Record<string, UserAnswer>;
  index: number;
  completed: boolean;
}
export interface TestResult {
  total: number;
  correct: number;
  incorrect: number;
  score: number;
  items: { questionId: string; index: number; correct: boolean }[];
}

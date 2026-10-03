// @vitest-environment jsdom
import { it, expect } from "vitest";
import { readSession, saveSession } from "../src/engine/session";
it("ignores malformed stored JSON and incomplete question data", () => {
  localStorage.setItem("ety.session.v1", "not JSON");
  expect(readSession()).toBeNull();
  localStorage.setItem(
    "ety.session.v1",
    JSON.stringify({
      version: 1,
      chapter: "Chapter 16",
      difficulty: "Easy",
      completed: false,
      seed: 1,
      questions: [{}],
      index: 0,
      answers: {},
    }),
  );
  expect(readSession()).toBeNull();
});
it("reports storage failure without throwing", () => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    throw new Error("quota");
  };
  try {
    expect(
      saveSession({
        version: 1,
        chapter: "x",
        difficulty: "Easy",
        seed: 1,
        questions: [],
        answers: {},
        index: 0,
        completed: false,
      }),
    ).toBe(false);
  } finally {
    Storage.prototype.setItem = original;
  }
});

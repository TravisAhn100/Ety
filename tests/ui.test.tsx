// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { parseVocabulary } from "../src/engine/loadVocabulary";
import { generateQuestions } from "../src/engine/generateQuestion";
import type { Difficulty, TestSession } from "../src/engine/types";
const source = readFileSync("public/data/Ety_Vocab_Ch16_18.xlsx");
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        source.buffer.slice(
          source.byteOffset,
          source.byteOffset + source.byteLength,
        ),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("complete study flow", () => {
  it("supports keyboard answer selection with no correctness feedback", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    await user.tab();
    await user.keyboard(" ");
    expect(
      (screen.getByRole("group").querySelector("input") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.queryByText(/^정답:/)).toBeNull();
  });
  it.each(["Chapter 16", "Chapter 17", "Chapter 18"])(
    "%s starts for every difficulty",
    async (chapter) => {
      for (const difficulty of ["Easy", "Medium", "Hard"]) {
        cleanup();
        localStorage.clear();
        render(<App />);
        await waitFor(() =>
          expect(
            (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
              .disabled,
          ).toBe(false),
        );
        if (chapter !== "Chapter 16") {
          fireEvent.click(screen.getByRole("checkbox", { name: "Chapter 16" }));
          fireEvent.click(screen.getByRole("checkbox", { name: chapter }));
        }
        fireEvent.click(
          screen.getByRole("radio", { name: new RegExp(difficulty) }),
        );
        fireEvent.click(screen.getByRole("button", { name: "시작" }));
        expect(screen.getByText("Question 1 / 10")).toBeTruthy();
        expect(screen.queryByText(/^정답:/)).toBeNull();
      }
    },
  );
  it("keeps answers across slides and reload, submits, and reviews the exact question without edits", async () => {
    render(<App />);
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "시작" }));
    fireEvent.click(screen.getByRole("group").querySelector("input")!);
    const stored = JSON.parse(
      localStorage.getItem("ety.session.v1")!,
    ) as TestSession;
    const firstAnswer = stored.answers[stored.questions[0].id];
    fireEvent.click(screen.getByRole("button", { name: "다음 →" }));
    fireEvent.click(screen.getByRole("button", { name: "← 이전" }));
    expect(
      (screen.getByRole("group").querySelector("input") as HTMLInputElement)
        .checked,
    ).toBe(true);
    cleanup();
    render(<App />);
    expect(
      (screen.getByRole("group").querySelector("input") as HTMLInputElement)
        .checked,
    ).toBe(true);
    for (let i = 0; i < 9; i++)
      fireEvent.click(screen.getByRole("button", { name: "다음 →" }));
    expect(screen.queryByText(/^정답:/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "제출하고 결과 보기" }));
    expect(screen.getByText("Well studied.")).toBeTruthy();
    const answers = JSON.parse(localStorage.getItem("ety.session.v1")!).answers;
    fireEvent.click(
      screen.getByRole("button", { name: "Question 5 오답 복습" }),
    );
    expect(screen.getByText("Question 5 / 10")).toBeTruthy();
    expect(screen.getByText(/^정답:/)).toBeTruthy();
    expect(screen.getByText("내 답: 미응답")).toBeTruthy();
    expect(
      Array.from(screen.getByRole("group").querySelectorAll("input")).every(
        (input) => input.disabled,
      ),
    ).toBe(true);
    expect(JSON.parse(localStorage.getItem("ety.session.v1")!).answers).toEqual(
      answers,
    );
    fireEvent.click(screen.getByRole("button", { name: "결과 목록" }));
    const result = screen.getByRole("button", { name: /Question 1 .* 복습/ });
    fireEvent.click(result);
    expect(screen.getByText("내 답: " + firstAnswer.join(", "))).toBeTruthy();
  });
  it("shows complete correct option sets in review", () => {
    const chapter = parseVocabulary(source).chapters[0],
      questions = generateQuestions(chapter, "Hard" as Difficulty, 24);
    const index = questions.findIndex(
      (q) => q.type === "meaning" && q.correctIds.length > 1,
    );
    const s: TestSession = {
      version: 1,
      questions,
      chapter: chapter.id,
      difficulty: "Hard",
      seed: 24,
      index: 0,
      completed: true,
      answers: {},
    };
    localStorage.setItem("ety.session.v1", JSON.stringify(s));
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Question " + (index + 1) + " 오답 복습",
      }),
    );
    expect(
      screen.getByText("정답: " + questions[index].correctIds.join(", ")),
    ).toBeTruthy();
    expect(screen.getAllByText("정답 ✓")).toHaveLength(
      questions[index].correctIds.length,
    );
  });
  it("shows a load failure and retry control rather than crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("어휘 파일을 불러오지 못했습니다.")),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeTruthy();
  });
  it("keeps both secondary pages as simple placeholders", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "모의고사" }));
    expect(screen.getByText("모의고사는 준비 중입니다.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "공지" }));
    expect(screen.getByText("공지는 준비 중입니다.")).toBeTruthy();
  });
});

it("removes the left introduction, supports multiple chapters and returns home through the logo", async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  expect(screen.queryByText(/Words worth/)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Chapter 17" }));
  fireEvent.click(screen.getByRole("button", { name: "시작" }));
  const session = JSON.parse(localStorage.getItem("ety.session.v1")!);
  expect(session.chapter).toBe("Chapter 16 + Chapter 17");
  fireEvent.click(screen.getByRole("link", { name: /Ety Thoth/ }));
  expect(screen.getByRole("button", { name: "시작" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "진행 중인 테스트 이어하기 →" }),
  ).toBeTruthy();
});
it("disables Start with no chapters selected", async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Chapter 16" }));
  expect(
    (screen.getByRole("button", { name: "시작" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("renders an underlined blank for every replacement", () => {
  const chapter = parseVocabulary(source).chapters[0];
  const questions = generateQuestions(chapter, "Easy", 3);
  const index = questions.findIndex((q) => q.type === "sentence");
  localStorage.setItem(
    "ety.session.v1",
    JSON.stringify({
      version: 1,
      chapter: chapter.id,
      difficulty: "Easy",
      seed: 3,
      questions,
      index,
      completed: false,
      answers: {},
    }),
  );
  const { container } = render(<App />);
  const q = questions[index];
  if (q.type !== "sentence") throw new Error("Expected sentence");
  expect(container.querySelectorAll(".sentence-blank").length).toBe(
    q.sentence.split("______").length - 1,
  );
});

import { useState } from "react";
import type { Chapter, Difficulty } from "../engine/types";
import { CHAPTER_NAMES } from "../engine/loadVocabulary";
export default function Settings({
  chapters,
  onStart,
  busy,
}: {
  chapters: Chapter[];
  onStart: (chapter: Chapter, difficulty: Difficulty) => void;
  busy: boolean;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [chapter, setChapter] = useState("Chapter 16");
  const selected = chapters.find((c) => c.id === chapter);
  return (
    <section className="settings">
      <div className="intro">
        <p className="eyebrow">A LITTLE EVERY DAY.</p>
        <h1>
          Words worth
          <br />
          <em>remembering.</em>
        </h1>
        <p className="lead">
          단어를 만나고, 뜻을 기억하고.
          <br />열 문제로 시작하는 나만의 어휘 공부.
        </p>
        <div className="edition">
          <span>01 / VOCABULARY</span>
          <span>CHAPTERS 16—18</span>
        </div>
      </div>
      <div className="setup">
        <p className="eyebrow">오늘의 암기</p>
        <h2>Let’s study.</h2>
        <fieldset>
          <legend>
            <span>01</span> 난이도
          </legend>
          <div className="difficulty">
            {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
              <label key={d} className={difficulty === d ? "selected" : ""}>
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={difficulty === d}
                  onChange={() => setDifficulty(d)}
                />
                <span className="display">{d}</span>
                <small>
                  {d === "Easy"
                    ? "가볍게 시작"
                    : d === "Medium"
                      ? "조금 더 집중"
                      : "비슷한 단어까지"}
                </small>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <span>02</span> 범위
          </legend>
          <div className="chapters">
            {CHAPTER_NAMES.map((id) => (
              <label key={id} className={chapter === id ? "selected" : ""}>
                <input
                  type="radio"
                  name="chapter"
                  checked={chapter === id}
                  disabled={!chapters.some((c) => c.id === id)}
                  onChange={() => setChapter(id)}
                />
                <span className="display">{id}</span>
                <span aria-hidden="true">{chapter === id ? "●" : "○"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="session-note">
          <span>10문제 · 뜻 연결 + 문장 빈칸</span>
          <span>정답은 마지막에 공개됩니다.</span>
        </div>
        <button
          className="primary start"
          disabled={busy || !selected}
          onClick={() => selected && onStart(selected, difficulty)}
        >
          시작 <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

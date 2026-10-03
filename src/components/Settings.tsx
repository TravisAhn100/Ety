import { useState } from "react";
import type { Chapter, Difficulty } from "../engine/types";
import { CHAPTER_NAMES } from "../engine/loadVocabulary";
export default function Settings({
  chapters,
  onStart,
  busy,
}: {
  chapters: Chapter[];
  onStart: (chapters: Chapter[], difficulty: Difficulty) => void;
  busy: boolean;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [selectedIds, setSelectedIds] = useState(["Chapter 16"]);
  const selected = chapters.filter((c) => selectedIds.includes(c.id));
  return (
    <section className="settings">
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
            <span>02</span> 범위 · 복수 선택 가능
          </legend>
          <div className="chapters">
            {CHAPTER_NAMES.map((id) => (
              <label
                key={id}
                className={selectedIds.includes(id) ? "selected" : ""}
              >
                <input
                  type="checkbox"
                  name="chapter"
                  checked={selectedIds.includes(id)}
                  disabled={!chapters.some((c) => c.id === id)}
                  onChange={() =>
                    setSelectedIds((ids) =>
                      ids.includes(id)
                        ? ids.filter((value) => value !== id)
                        : [...ids, id],
                    )
                  }
                />
                <span className="display">{id}</span>
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
          disabled={busy || selected.length === 0}
          onClick={() => onStart(selected, difficulty)}
        >
          시작 <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}

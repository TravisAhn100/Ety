import { useEffect, useState } from "react";
import type { Chapter, Difficulty, TestSession } from "./engine/types";
import { loadVocabulary } from "./engine/loadVocabulary";
import { generateQuestions } from "./engine/generateQuestion";
import { readSession, saveSession } from "./engine/session";
import Settings from "./components/Settings";
import QuestionSlide from "./components/QuestionSlide";
import Results from "./components/Results";
type Screen = "settings" | "test" | "results" | "review";
export default function App() {
  const [session, setSession] = useState<TestSession | null>(readSession);
  const [screen, setScreen] = useState<Screen>(() => {
    const s = readSession();
    return s ? (s.completed ? "results" : "test") : "settings";
  });
  const [tab, setTab] = useState("암기"),
    [chapters, setChapters] = useState<Chapter[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let active = true;
    loadVocabulary()
      .then((data) => {
        if (active) {
          setChapters(data.chapters);
          setWarnings(data.warnings);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "파일을 불러오지 못했습니다.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (session) setStorageError(!saveSession(session));
  }, [session]);
  function start(chapter: Chapter, difficulty: Difficulty) {
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      setSession({
        version: 1,
        chapter: chapter.id,
        difficulty,
        seed,
        questions: generateQuestions(chapter, difficulty, seed),
        answers: {},
        index: 0,
        completed: false,
      });
      setScreen("test");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제 생성에 실패했습니다.");
    }
  }
  const current = session?.questions[session.index];
  return (
    <>
      <header>
        <a
          className="brand"
          href="#study"
          onClick={(e) => {
            e.preventDefault();
            setTab("암기");
          }}
        >
          <img src="/brand/thoth.png" alt="Ety Thoth 원본 로고" />
          <span className="display">
            Ety<span className="brand-korean">에티</span>
          </span>
        </a>
        <nav aria-label="주 메뉴">
          {["암기", "모의고사", "공지"].map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <span className="header-note">THE VOCABULARY NOTEBOOK</span>
      </header>
      <main id="study">
        {storageError && (
          <p role="alert" className="notice">
            이 브라우저에서 진행 상황을 저장할 수 없습니다. 창을 닫기 전에
            테스트를 마쳐 주세요.
          </p>
        )}
        {tab !== "암기" ? (
          <section className="placeholder">
            <p className="eyebrow">NEXT CHAPTER</p>
            <h1>
              {tab === "모의고사" ? "Practice, in time." : "Notes to come."}
            </h1>
            <p>{tab}는 준비 중입니다.</p>
            <button className="primary" onClick={() => setTab("암기")}>
              암기로 돌아가기 →
            </button>
          </section>
        ) : (
          <>
            {error && (
              <div role="alert" className="notice">
                {error}{" "}
                <button onClick={() => window.location.reload()}>
                  다시 불러오기
                </button>
              </div>
            )}
            {screen === "settings" && (
              <>
                {loading && <p role="status">어휘를 불러오는 중입니다…</p>}
                <Settings chapters={chapters} busy={loading} onStart={start} />
                {session && !session.completed && (
                  <button
                    className="secondary"
                    onClick={() => setScreen("test")}
                  >
                    진행 중인 테스트 이어하기 →
                  </button>
                )}
                {warnings.length > 0 && (
                  <details className="data-notes">
                    <summary>데이터 확인 사항 ({warnings.length})</summary>
                    {warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </details>
                )}
              </>
            )}
            {(screen === "test" || screen === "review") &&
              session &&
              current && (
                <>
                  <div className="session-bar">
                    <span>
                      {session.chapter} / {session.difficulty}
                    </span>
                    {!session.completed && (
                      <button
                        className="text-button"
                        onClick={() => setScreen("settings")}
                      >
                        설정으로
                      </button>
                    )}
                  </div>
                  <QuestionSlide
                    question={current}
                    index={session.index}
                    total={session.questions.length}
                    answer={session.answers[current.id] || []}
                    review={screen === "review"}
                    onAnswer={(answer) =>
                      setSession({
                        ...session,
                        answers: { ...session.answers, [current.id]: answer },
                      })
                    }
                    onPrevious={() =>
                      setSession({
                        ...session,
                        index: Math.max(0, session.index - 1),
                      })
                    }
                    onNext={() => {
                      if (session.index === session.questions.length - 1) {
                        setSession({ ...session, completed: true });
                        setScreen("results");
                      } else
                        setSession({ ...session, index: session.index + 1 });
                    }}
                    onResults={() => setScreen("results")}
                  />
                </>
              )}
            {screen === "results" && session && (
              <Results
                session={session}
                onReview={(index) => {
                  setSession({ ...session, index });
                  setScreen("review");
                }}
                onNew={() => setScreen("settings")}
              />
            )}
          </>
        )}
      </main>
      <footer>
        <span className="display">Ety</span>
        <span>조금씩, 오래 기억하기.</span>
        <span>VOL. 01 — ENGLISH VOCABULARY</span>
      </footer>
    </>
  );
}

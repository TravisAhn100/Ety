import type {TestSession} from '../engine/types';
import {scoreSession} from '../engine/scoring';
export default function Results({session,onReview,onNew}:{session:TestSession;onReview:(i:number)=>void;onNew:()=>void}){
 const result=scoreSession(session);
 return <section className="results"><p className="eyebrow">A PAGE OF PROGRESS.</p><h1>Well studied.</h1><p className="lead">{session.chapter} · {session.difficulty}<br/>오늘 기억한 단어를 확인해 보세요.</p><div className="score"><strong className="display">{result.score}<small>/ 100</small></strong><div><span>전체 {result.total}문제</span><span>정답 {result.correct} · 오답 {result.incorrect}</span></div></div><h2>문제별 복습</h2><p className="hint">문제 번호를 누르면 내 답과 정답을 확인할 수 있습니다.</p><div className="result-grid">{result.items.map(item=><button key={item.questionId} className={item.correct?'correct':'incorrect'} onClick={()=>onReview(item.index)} aria-label={'Question '+(item.index+1)+' '+(item.correct?'정답':'오답')+' 복습'}><span className="display">{String(item.index+1).padStart(2,'0')}</span><span>{item.correct?'✓ 정답':'✕ 오답'}</span></button>)}</div><button className="primary" onClick={onNew}>새 테스트 시작 ↗</button></section>;
}

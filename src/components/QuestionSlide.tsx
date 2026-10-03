import {useEffect,useRef} from 'react';
import type {Question,UserAnswer} from '../engine/types';
import {isCorrect} from '../engine/scoring';
export default function QuestionSlide({question,index,total,answer,review,onAnswer,onPrevious,onNext,onResults}:{question:Question;index:number;total:number;answer:UserAnswer;review:boolean;onAnswer:(a:UserAnswer)=>void;onPrevious:()=>void;onNext:()=>void;onResults:()=>void}){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus()},[question.id,review]);
 const correct=isCorrect(question,answer);
 function choose(id:string){if(review)return;onAnswer(question.type==='meaning'?(answer.includes(id)?answer.filter(x=>x!==id):[...answer,id]):[id])}
 return <section className="question-shell"><div className="question-meta"><span>{review?'REVIEW':'VOCABULARY PRACTICE'}</span><span>Question {index+1} / {total}</span></div><div className="progress" aria-hidden="true"><span style={{width:((index+1)/total*100)+'%'}}/></div>
 <h1 ref={heading} tabIndex={-1}>{question.type==='meaning'?'올바르게 연결된 뜻을 모두 고르세요.':'빈칸에 들어갈 단어를 고르세요.'}</h1><p className="hint">{question.type==='meaning'?'복수 선택 · 정답은 1개부터 4개까지입니다.':'단일 선택 · 정답은 1개입니다.'}</p>
 {question.type==='sentence'&&<p className="sentence display">{question.sentence}</p>}
 <fieldset className="answers"><legend className="sr-only">{question.type==='meaning'?'맞는 단어와 뜻 선택':'빈칸 단어 선택'}</legend>{question.choices.map(choice=>{
 const checked=answer.includes(choice.id),right=review&&question.correctIds.includes(choice.id);
 return <label key={choice.id} className={'answer '+(checked?'chosen ':'')+(right?'right ':'')+(review&&checked&&!right?'wrong':'')}>
 <input type={question.type==='meaning'?'checkbox':'radio'} name="answer" checked={checked} disabled={review} onChange={()=>choose(choice.id)}/><span className="letter display">{choice.id}</span><span className="choice-content"><strong className="display">{choice.word}</strong>{choice.meaning!==undefined&&<span className="meaning">{choice.meaning}</span>}</span><span className="choice-status">{review?(right?'정답 ✓':checked?'내 선택 ✕':''):checked?'선택 ✓':'선택'}</span></label>
 })}</fieldset>
 {review&&<div className={'feedback '+(correct?'correct':'incorrect')}><strong>{correct?'✓ 정답입니다.':'✕ 다시 기억해 보세요.'}</strong><p>내 답: {answer.length?answer.join(', '):'미응답'}</p><p>정답: {question.correctIds.join(', ')}{question.type==='sentence'?' — '+question.targetWord:''}</p>{question.type==='meaning'&&<div className="originals"><p>원본 어휘의 뜻</p>{question.choices.map(c=><p key={c.id}>{c.id}. <b>{c.word}</b> — <span>{question.originals[c.id]}</span></p>)}</div>}</div>}
 <div className="slide-nav"><button className="secondary" disabled={index===0} onClick={onPrevious}>← 이전</button>{review&&<button className="secondary" onClick={onResults}>결과 목록</button>}<button className="primary" onClick={review&&index===total-1?onResults:onNext}>{index===total-1?(review?'결과 목록':'제출하고 결과 보기'):'다음 →'}</button></div></section>;
}

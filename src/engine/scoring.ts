import type {Question,TestSession,TestResult,UserAnswer} from './types';
export function isCorrect(question:Question,answer:UserAnswer=[]){const selected=new Set(answer);return selected.size===question.correctIds.length&&question.correctIds.every(id=>selected.has(id))}
export function scoreSession(session:TestSession):TestResult{
 const items=session.questions.map((q,index)=>({questionId:q.id,index,correct:isCorrect(q,session.answers[q.id])}));
 const correct=items.filter(i=>i.correct).length,total=items.length;
 return {total,correct,incorrect:total-correct,score:total?Math.round(correct/total*100):0,items};
}
export function reviewQuestion(session:TestSession,index:number){return session.questions[index]}

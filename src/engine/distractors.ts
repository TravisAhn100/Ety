import type { Difficulty,VocabularyEntry } from './types';
export function seededRandom(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function shuffle<T>(items:T[],random:()=>number):T[]{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
export function similarity(a:string,b:string){
 a=a.toLowerCase();b=b.toLowerCase();let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=next}
 let prefix=0,suffix=0;while(prefix<Math.min(a.length,b.length)&&a[prefix]===b[prefix])prefix++;
 while(suffix<Math.min(a.length,b.length)&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
 return 1-previous[b.length]/Math.max(a.length,b.length,1)+(prefix+suffix)/Math.max(a.length+b.length,1)*0.35;
}
export function distractors(target:VocabularyEntry,pool:VocabularyEntry[],count:number,difficulty:Difficulty,random:()=>number,meaningMustDiffer=false){
 const unique=[...new Map(pool.filter(e=>e.word!==target.word&&(!meaningMustDiffer||e.meaning!==target.meaning)).map(e=>[e.word,e])).values()];
 const randomized=shuffle(unique,random);
 if(difficulty==='Easy')return randomized.slice(0,count);
 const ranked=randomized.map(entry=>({entry,rank:similarity(target.word,entry.word)+(difficulty==='Medium'?random()*0.45:random()*0.05)})).sort((a,b)=>b.rank-a.rank);
 return ranked.slice(0,count).map(e=>e.entry);
}

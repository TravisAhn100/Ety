import type {TestSession} from './types';
const KEY='ety.session.v1';
export function readSession():TestSession|null{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s?.version!==1||!Array.isArray(s.questions)||!s.questions.length||!Number.isInteger(s.index)||s.index<0||s.index>=s.questions.length||!s.answers)return null;return s}catch{return null}}
export function saveSession(s:TestSession){try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}}

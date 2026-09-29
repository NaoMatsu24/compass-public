'use strict';
// Hours transcribed from the user's screenshots. Chapter 6 says "less than 1 hour".
const FAR_STUDY_HOURS=[2.9,3.7,13.3,5.9,7.7,1,1,5.2,7.8,4.9,9.1,11.5,6.6,4.1,5.8,4.5,2.9,1.6,6.2,7.2,2.1];
function farSourceMinutes(chapter){return Math.round((FAR_STUDY_HOURS[chapter-1]??3)*60);}
function farSourceLabel(chapter){return chapter===6?'1時間未満（配分上は60分）':`約${FAR_STUDY_HOURS[chapter-1]}時間`;}
function migrateFarWorkload(s){
 for(const f of s.far){
  if(f.estimatedMinutes===undefined)f.estimatedMinutes=farSourceMinutes(f.chapter);
  if(f.priorStudyMinutes===undefined)f.priorStudyMinutes=0;
  if(!Number.isInteger(f.estimatedMinutes)||f.estimatedMinutes<1||f.estimatedMinutes>60000||!Number.isInteger(f.priorStudyMinutes)||f.priorStudyMinutes<0||f.priorStudyMinutes>100000)throw Error('FAR学習時間が不正です');
 }
 for(const t of s.tasks)if(t.farStudyChapterId!==undefined){
  if(typeof t.farStudyChapterId!=='string'||!s.far.some(f=>f.id===t.farStudyChapterId)||typeof t.farStudyCredit!=='boolean')throw Error('FAR章別時間の記録が不正です');
 }
 return s;
}
function farStudyProgress(source,f,date=today()){
 let actual=f.priorStudyMinutes||0,reserved=0;
 for(const t of expandStudyTasks(source.tasks)){
  if(t.category!=='USCPA'||t.farStudyChapterId!==f.id||t.farStudyCredit!==true)continue;
  if(t.done){if((t.completedDate||t.date)<=date)actual+=t.actual;else reserved+=Math.max(t.minutes,t.actual);}
  else reserved+=t.minutes;
 }
 const target=f.estimatedMinutes??farSourceMinutes(f.chapter),remaining=Math.max(0,target-actual);
 return {target,actual,reserved,remaining,available:Math.max(0,remaining-reserved)};
}
// Weighted, capped allocation in 5-minute slots; estimates are rounded up only at the final slot.
function allocateFarMinutes(topics,total,source,date,maintenance=false){
 const entries=topics.map(f=>{const p=farStudyProgress(source,f,date);return {f,weight:maintenance?p.target:p.available,cap:maintenance?total:Math.ceil(p.available/5)*5,minutes:0};});
 let left=Math.min(Math.floor(total/5)*5,entries.reduce((n,e)=>n+e.cap,0));
 while(left>=5){
  const possible=entries.filter(e=>e.weight>0&&e.minutes+5<=e.cap);
  if(!possible.length)break;
  possible.sort((a,b)=>(a.minutes+5)/a.weight-(b.minutes+5)/b.weight||topics.indexOf(a.f)-topics.indexOf(b.f));
  possible[0].minutes+=5;left-=5;
 }
 return entries.filter(e=>e.minutes>0);
}
function splitFarActivityMinutes(total,template){
 const weight=template.reduce((n,t)=>n+t[2],0),rows=template.map(([slot,label,m],index)=>({slot,label,index,minutes:Math.floor(total*m/weight/5)*5,remainder:(total*m/weight)%5}));
 let remaining=total-rows.reduce((n,r)=>n+r.minutes,0);
 for(const r of [...rows].sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(remaining<5)break;r.minutes+=5;remaining-=5;}
 return rows.filter(r=>r.minutes>0);
}
function workloadFarTasks(source,date,type,make,budget=300,excluded=[]){
 const eligible=prioritizedFarTopics(source,date).filter(f=>!excluded.includes(f.id)),unfinished=source.far.some(f=>farStudyProgress(source,f,date).remaining>0);
 const topics=(unfinished?eligible.filter(f=>farStudyProgress(source,f,date).available>0):eligible).slice(0,source.far.length<=2?1:2);
 if(!topics.length)return [];
 const total=Math.min(budget,farPlans[type].tasks.reduce((n,t)=>n+t[2],0)),allocations=allocateFarMinutes(topics,total,source,date,!unfinished),tasks=[];
 for(const a of allocations){
  const p=farStudyProgress(source,a.f,date);
  for(const part of splitFarActivityMinutes(a.minutes,farPlans[type].tasks))tasks.push(make('USCPA',type,`${a.f.id}-${part.slot}`,`FAR ${part.label} · ${a.f.name}`,part.minutes,{
   deadline:source.settings.farDate,priority:'高',farTopicIds:[a.f.id],farStudyChapterId:a.f.id,farStudyCredit:unfinished,
   note:`${farPlans[type].label}。教材目安：${farSourceLabel(a.f.chapter)}。設定目安 ${p.target}分 / 記録済み ${p.actual}分 / 未完了の予約 ${p.reserved}分。${unfinished?`残り ${p.remaining}分のうち、本日はこの章に合計${a.minutes}分を配分（1タスクではなく章の合計）。長い章は別日に継続します。`:'目安時間に達しているため定着復習です。初回の章別実績には加算しません。'} ${unfinished?'完了時の実績時間をこの章に記録します。':'実績は通常の週間集計に反映します。'}`
  }));
 }
 return tasks;
}
function farWorkloadSummary(source=state,date=today()){
 const rows=source.far.map(f=>farStudyProgress(source,f,date)),target=rows.reduce((n,p)=>n+p.target,0),actual=rows.reduce((n,p)=>n+p.actual,0),remaining=rows.reduce((n,p)=>n+p.remaining,0);
 const daysNeeded=Math.ceil(remaining/Math.min(300,source.settings.target));
 return `<section class="panel"><h2>FARの必要学習時間</h2><p>設定目安 <strong>${hours(target)}</strong> · 記録済み ${hours(actual)} · 残り ${hours(remaining)}</p><p class="muted">教材目安の計画合計は115時間です（Chapter 6は「1時間未満」を60分で仮置き）。残りは時間だけで最低${daysNeeded}学習日分。章の順送り・未完了タスク・他の予定により長くなります。</p><p class="muted">新しい章別自動タスクの実績を加算します。以前の学習時間は各章の「記録開始前の学習時間」に入力できます。学習回数から時間を推測しません。</p></section>`;
}
function farStudyDetails(f){const p=farStudyProgress(state,f);return `<div class="far-study-detail"><span>教材：${esc(farSourceLabel(f.chapter))}</span><br><span>設定 ${p.target}分 · 実績 ${p.actual}分</span><br><span>残り ${p.remaining}分 · 予約 ${p.reserved}分</span></div>`;}

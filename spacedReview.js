'use strict';
// A transparent interval schedule, not a prediction of individual memory retention.
const REVIEW_INTERVALS=[1,3,7,14,30];
const REVIEW_OUTCOMES={good:'覚えていた',hard:'少し曖昧',again:'忘れていた'};
function migrateSpacedReview(s){
 if(s.planner.spacedEnabled===undefined)s.planner.spacedEnabled=true;
 if(typeof s.planner.spacedEnabled!=='boolean')throw Error('復習設定が不正です');
 for(const t of s.tasks){
  if(t.reviewOutcome!==undefined&&(typeof t.reviewOutcome!=='string'||!Object.hasOwn(REVIEW_OUTCOMES,t.reviewOutcome)))throw Error('復習結果が不正です');
  if(t.planType==='far-spaced'&&(!s.far.some(f=>f.id===t.farStudyChapterId)||t.farStudyCredit!==false))throw Error('復習の章情報が不正です');
 }
 return s;
}
function farReviewSchedule(source,f,date=today()){
 const daily=new Map();
 const add=(day,outcome)=>{if(!validDate(day)||day>date)return;if(!daily.has(day))daily.set(day,[]);daily.get(day).push(outcome);};
 if(f.last)add(f.last,'study');
 for(const t of expandStudyTasks(source.tasks))if(t.category==='USCPA'&&t.farStudyChapterId===f.id&&t.done&&t.actual>0)add(t.completedDate||t.date,t.planType==='far-spaced'?(t.reviewOutcome||'good'):'study');
 let stage=0,last='',interval=1,outcome='study';
 for(const [day,results]of [...daily].sort(([a],[b])=>a.localeCompare(b))){
  outcome=results.includes('again')?'again':results.includes('hard')?'hard':results.includes('good')?'good':'study';
  if(outcome==='again'||outcome==='study')stage=0;
  else if(outcome==='good'&&last)stage=Math.min(stage+1,REVIEW_INTERVALS.length-1);
  interval=outcome==='hard'?1:REVIEW_INTERVALS[stage];last=day;
 }
 const next=last?addDays(last,interval):'';
 const pending=expandStudyTasks(source.tasks).find(t=>!t.done&&t.category==='USCPA'&&t.farStudyChapterId===f.id);
 return {stage,last,next,interval,outcome,due:Boolean(next&&next<=date),pending};
}
function dueFarReviews(source,date=today()){
 return source.far.map(f=>({f,...farReviewSchedule(source,f,date)})).filter(r=>r.due&&!r.pending).sort((a,b)=>a.next.localeCompare(b.next)||a.f.chapter-b.f.chapter);
}
function farTasksWithReviews(source,date,type,make){
 if(!source.planner.spacedEnabled)return workloadFarTasks(source,date,type,make);
 // Reviews occupy up to 60 minutes inside FAR's existing 300-minute allocation.
 const reviews=dueFarReviews(source,date).slice(0,4).map(r=>make('USCPA','far-spaced',r.f.id,`FAR 間隔復習 · ${r.f.name}`,15,{
  priority:'高',deadline:source.settings.farDate,farTopicIds:[],farStudyChapterId:r.f.id,farStudyCredit:false,
  note:`復習予定日：${r.next}。まず資料を見ずに要点を思い出し、MCQやノートで確認します。完了時に思い出せた程度を記録してください。復習実績は週間集計に含み、教材の必要時間には重複加算しません。`
 }));
 return [...reviews,...workloadFarTasks(source,date,type,make,300-reviews.length*15,reviews.map(t=>t.farStudyChapterId))];
}
function spacedOutcomeField(task){
 if(task?.planType!=='far-spaced'&&!task?.studyParts?.some(p=>p.planType==='far-spaced'))return '';
 return `<div class="review-outcome">${field('reviewOutcome','復習で思い出せた程度','',task.reviewOutcome||'good',Object.entries(REVIEW_OUTCOMES))}<p class="muted">覚えていた：次の間隔へ。少し曖昧：翌日に再確認。忘れていた：1日後からやり直します。実績0分では復習日を進めません。</p></div>`;
}
function spacedReviewSummary(){
 const rows=state.far.map(f=>farReviewSchedule(state,f)),due=rows.filter(r=>r.due),next=rows.filter(r=>r.next&&!r.due).sort((a,b)=>a.next.localeCompare(b.next))[0];
 return `<section class="panel review-summary"><div class="section-head"><h2>FAR · 復習のタイミング</h2><a href="#far">詳しく見る →</a></div><p>${due.length?`今日までに復習予定の論点 <strong>${due.length}件</strong>（未完了タスクがある論点も含む）`:next?`次の復習予定：${esc(next.next)}`:'学習を記録すると、次の復習日が表示されます。'}</p><p class="muted">${state.planner.spacedEnabled?'次の未作成プランから、時間上限内で復習を配分します。':'復習の自動追加はOFFです。設定で変更できます。'}</p></section>`;
}
function spacedReviewPanel(){
 const rows=state.far.map(f=>({f,...farReviewSchedule(state,f)})).filter(r=>r.next).sort((a,b)=>a.next.localeCompare(b.next)||a.f.chapter-b.f.chapter);
 return `<section class="panel"><h2>忘却曲線を意識した間隔復習</h2><p>学習後、間隔を空けて思い出す練習をします。次の間隔は目安で、記憶率の予測ではありません。</p><div class="review-intervals" aria-label="復習間隔">${REVIEW_INTERVALS.map(n=>`<span>${n}日後</span>`).join('')}</div><p class="muted">各間隔は直前の学習・復習日から数えます。章別To Doを実績1分以上で完了するか、論点の「最終学習日」を登録すると開始します。通常学習は1日後から、復習で覚えていた場合は次の間隔へ進みます。同日の複数記録は1回分です。</p><p class="muted">復習は1論点15分・1日最大4論点を、FARの5時間枠の中に配分します。全体の上限が小さい日は時間も短縮されます。翌日の間隔復習は、高速2周目の重点論点の順送りとは別枠です。作成済みプランは変更しません。受験前日は従来の軽い復習プランを優先し、受験当日以降は新規生成しません。</p>${rows.length?rows.map(r=>`<article class="review-row"><div><strong>Chapter ${r.f.chapter} · ${esc(r.f.japanese)}</strong><p>${r.due?'<span class="badge">復習予定日を迎えています</span> ':''}次回：${esc(r.next)} · 間隔 ${r.interval}日</p><p class="muted">最終記録：${esc(r.last)}${r.pending?` · 未完了タスクあり（${esc(r.pending.date)}）`:''}</p></div>${button('edit-far','記録',r.f.id,'compact')}</article>`).join(''):'<p class="empty">学習記録のある論点はまだありません。下の論点マップから学習日を登録できます。</p>'}</section>`;
}
function spacedReviewSettings(){return `<section class="panel"><h2>間隔復習</h2><label><span><input id="spaced-review-enabled" type="checkbox" ${state.planner.spacedEnabled?'checked':''}> FARの間隔復習を学習プランに追加する</span></label><p class="muted">次の未作成プランから反映します。毎日の自動作成とFARがONのときに自動追加します。OFFにしても既存タスク・復習結果は保持します。</p></section>`;}

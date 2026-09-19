'use strict';
const mobileMedia=window.matchMedia('(max-width: 767px)');
const mobileTabs=[['home','今日','◷'],['tasks','To Do','✓'],['deadlines','締切','▦'],['more','その他','•••']];
function mobileNavigation(){
  const active=['home','tasks','deadlines'].includes(page)?page:'more';
  $('#mobile-nav').innerHTML=mobileTabs.map(([key,label,icon])=>`<a href="#${key}" ${active===key?'aria-current="page"':''}><span aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
}
function mobileDeadlineItems(){
  const grouped=new Map();for(const d of deadlines()){const key=[d.date,d.name,d.category].join('|');if(!grouped.has(key))grouped.set(key,{...d,count:1});else grouped.get(key).count++;}
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
function deadlineRoute(d){return ({USCPA:'far',IELTS:'ielts',放送大学:'ouj',大学院面接:'interview',奨学金:'scholarship',ハンガリー出願:'hungary',ドイツ出願:'germany'})[d.category]||'tasks';}
function deadlineRows(items){return items.length?items.map(d=>`<article class="mobile-deadline"><div><time datetime="${esc(d.date)}">${esc(d.date)}</time><span class="badge">${days(d.date)<0?`${-days(d.date)}日超過`:days(d.date)===0?'本日':`あと${days(d.date)}日`}</span></div><h3>${esc(d.name)}</h3><div class="row">${badge(d.category)}<a href="#${deadlineRoute(d)}">詳しく見る →</a></div>${d.count>1?`<p class="muted">同じ日付・内容の期限 ${d.count} 件</p>`:''}</article>`).join(''):'<p class="empty">登録された締切はありません。</p>';}
function mobileDeadlinePage(){const items=mobileDeadlineItems(),overdue=items.filter(d=>d.date<today()),upcoming=items.filter(d=>d.date>=today());return `<section class="panel"><h2>次の締切</h2><p class="muted">登録済みの試験・面接・提出期限を日付順に表示します。</p>${deadlineRows(upcoming)}</section><details class="panel mobile-accordion"><summary>過ぎた期限 · ${overdue.length} 件</summary>${deadlineRows(overdue)}</details><a class="library-link" href="#calendar">月間カレンダーで見る →</a>`;}
function mobileHome(){
  const tasks=state.tasks.filter(t=>t.date===today()),pending=state.tasks.filter(t=>!t.done&&t.date<today()),actual=sum(today()),next=mobileDeadlineItems().filter(d=>d.date>=today()).slice(0,2);
  return `<section class="panel mobile-today"><div class="section-head"><h2>今日の To Do</h2><span class="muted">${tasks.filter(t=>t.done).length} / ${tasks.length} 完了</span></div>${taskList(tasks)}<div class="mobile-progress"><span>実績 ${hours(actual)} / 目標 ${hours(dailyLimit(state))}</span><progress aria-label="今日の学習達成率" max="${Math.max(1,dailyLimit(state))}" value="${Math.min(actual,dailyLimit(state))}"></progress></div></section>${pending.length?`<section class="warning">過去の未完了タスク ${pending.length} 件 ${button('carry','繰越を確認')}</section>`:''}<section class="panel"><div class="section-head"><h2>次の締切</h2><a href="#deadlines">すべて見る →</a></div>${deadlineRows(next)}</section><details class="panel mobile-accordion"><summary>今日の学習プラン・配分</summary>${planPanel()}</details><details class="panel mobile-accordion"><summary>各分野の次にやること</summary>${homeActions()}</details><details class="panel mobile-accordion"><summary>今月の目標・週間の学習</summary><h3>今月の3大目標</h3><ol class="goals">${state.settings.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ol>${button('goals','目標を編集')}${chart()}<p>FAR受験予定：${esc(state.settings.farDate||'未登録')}</p><a href="#study">週間の詳しい記録 →</a></details><details class="panel mobile-accordion"><summary>締切・大学情報の確認</summary>${warnings().map(w=>`<p class="warning">${esc(w)}</p>`).join('')||'<p class="muted">締切警告はありません。</p>'}${universityLibraryWarnings()}</details>${backupReminder()}`;
}
function mobileMore(){const groups=[['学習',['study','far','ielts','ouj','interview']],['留学・出願',['scholarship','library','hungary','germany','documents','calendar']],['設定・バックアップ',['settings']]];return groups.map(([label,keys])=>`<section class="panel"><h2>${label}</h2><div class="mobile-menu">${keys.map(key=>`<a href="#${key}">${esc(pages[key])}<span aria-hidden="true">→</span></a>`).join('')}</div></section>`).join('')+pwaSettings();}
function adaptMobilePage(current,html){
  mobileNavigation();
  document.body.dataset.screen=current;
  if(current==='deadlines')return mobileDeadlinePage();
  if(current==='more')return mobileMore();
  if(current==='home'&&mobileMedia.matches)return mobileHome();
  return html;
}
function quickCompletionButtons(task){
  const choices=[...new Set([task.minutes,15,30,60])];
  return `<div class="wide quick-completion"><p>実績時間を選んで、そのまま完了</p><div class="quick-options">${choices.map((n,i)=>button('quick-complete',`${n}分${i===0?'（予定時間）':''}`,String(n),i===0?'primary':'')).join('')}</div><p class="muted">別の時間は下の入力欄で調整できます。</p></div>`;
}
function handleMobileClick(action,id){
  if(action!=='quick-complete')return false;
  if(edit?.type==='complete'&&Number.isFinite(Number(id))&&Number(id)>=0&&Number(id)<=1440){$('#fields [name="actual"]').value=Number(id);$('#form').requestSubmit();}
  return true;
}
mobileMedia.addEventListener('change',()=>{if(typeof state!=='undefined')render();});

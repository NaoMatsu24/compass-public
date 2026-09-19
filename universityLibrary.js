'use strict';
let libraryFilters={country:'',degree:'',field:'',english:'',intake:'',year:'2027/28'};
function latestLibraryYear(u){return [...u.years].sort((a,b)=>b.academicYear.localeCompare(a.academicYear))[0];}
function libraryYear(u,year=libraryFilters.year){return u.years.find(v=>v.academicYear===year)||latestLibraryYear(u);}
function libraryRoute(){const pieces=location.hash.slice(1).split('/');try{return {id:decodeURIComponent(pieces[1]||''),year:decodeURIComponent(pieces[2]||'')}}catch{return {id:'',year:''}}}
function libraryHref(id,year){return `#library/${encodeURIComponent(id)}/${encodeURIComponent(year)}`;}
function libraryAge(date){return date?days(date)*-1:null;}
function libraryStatus(status){return `<span class="library-status status-${esc(status)}">${esc(LIBRARY_STATUS[status]||LIBRARY_STATUS.recheck)}</span>`;}
function libraryYearNote(v){return `<span class="badge">${esc(v.academicYear)}年度</span> ${libraryStatus(v.verificationStatus)}${v.academicYear<'2027/28'?' <span class="library-status status-previous">🟡 過去年度情報</span>':''}<p class="muted">最終公式確認：${esc(v.lastVerified||'未確認')}${v.lastVerified&&libraryAge(v.lastVerified)>=90?' · 情報が古くなっている可能性があります':''}</p>`;}
function libraryPublication(v){const year=v.academicYear.slice(0,4);return v.publication==='unpublished'?`<p class="warning">${year}年度未公開 · 確定情報として扱わないでください。</p>`:v.publication==='unknown'?`<p class="muted">${year}年度の公開状況は未確認です。</p>`:'';}
function libraryLink(url,label){const safe=safeLibraryUrl(url);return safe?`<a class="library-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
function libraryTokens(value){return String(value||'').split(/[,、\n]/).map(s=>s.trim()).filter(Boolean);}
function libraryEnglishBand(v){const val=v.admission.ielts;if(val==='')return 'other';const n=Number(val);return n<=5.5?'5.5':n===6?'6.0':n===6.5?'6.5':'other';}
function filteredLibrary(){return state.universityLibrary.filter(u=>{const v=libraryYear(u),f=libraryFilters;return (!f.country||v.country===f.country)&&(!f.degree||(f.degree==='Master'?['MSc','MA','Master'].includes(v.degree):['B.A.','B.Sc.','Bachelor'].includes(v.degree)))&&(!f.field||libraryTokens(v.fields).includes(f.field))&&(!f.english||libraryEnglishBand(v)===f.english)&&(!f.intake||v.intake===f.intake);});}
function librarySelect(key,label,choices){return `<label>${label}<select id="library-filter-${key}">${choices.map(o=>{const [value,text]=Array.isArray(o)?o:[o,o];return `<option value="${esc(value)}" ${libraryFilters[key]===value?'selected':''}>${esc(text)}</option>`}).join('')}</select></label>`;}
function libraryApplications(u,v){return state.universities.filter(a=>a.libraryId===u.id);}
function libraryApplicationControl(u,v){return libraryApplications(u,v).length?`<a class="library-link" href="#${v.country==='Hungary'?'hungary':'germany'}">✓ 出願管理中 →</a>`:button('library-apply','出願管理に追加',`${u.id}|${v.academicYear}`);}
function libraryCard(u){const v=libraryYear(u);return `<section class="panel library-card"><div class="section-head"><span>${v.country==='Hungary'?'🇭🇺':'🇩🇪'} ${esc(v.country)}</span>${libraryStatus(v.verificationStatus)}</div><h2>${esc(v.university)}</h2><p>${esc(v.program)} ${esc(v.degree)}</p><p class="muted">${['MSc','MA','Master'].includes(v.degree)?'Master':'Bachelor'} / ${esc(v.duration||'期間未確認')}<br>${esc(v.language||'授業言語未確認')}<br>英語：${esc(v.admission.english||'未確認')}${v.admission.ielts?` / IELTS ${esc(v.admission.ielts)}`:''}</p><div class="library-tags">${libraryTokens(v.tags||v.fields).map(t=>`<span class="badge">${esc(t)}</span>`).join('')}</div>${libraryYearNote(v)}${v.academicYear!==libraryFilters.year?`<p class="warning">${esc(libraryFilters.year)}年度は未登録。参考：${esc(v.academicYear)}年度情報</p>`:''}${libraryPublication(v)}<div class="toolbar"><a class="library-link" href="${libraryHref(u.id,v.academicYear)}">詳しく見る →</a>${libraryApplicationControl(u,v)}</div></section>`;}
function libraryList(){const years=[...new Set(['2026/27','2027/28',...state.universityLibrary.flatMap(u=>u.years.map(v=>v.academicYear))])].sort().reverse();return `<section class="panel"><div class="section-head"><h2>大学情報ライブラリ</h2>${button('library-new','＋ プログラムを登録')}</div><p class="muted">一般情報を年度別に蓄積します。公式情報は手動で確認・更新してください。個人の提出状況や結果は出願管理で扱います。</p><div class="library-filters">${librarySelect('year','参照年度',years)}${librarySelect('country','国',[['','すべて'],'Hungary','Germany'])}${librarySelect('degree','学位',[['','すべて'],'Bachelor','Master'])}${librarySelect('field','分野',[['','すべて'],'Data Analytics','Statistics','Business Informatics','International Business','Management','Digital Innovation'])}${librarySelect('english','英語要件',[['','すべて'],['5.5','IELTS 5.5以下'],['6.0','IELTS 6.0'],['6.5','IELTS 6.5'],['other','その他・未確認']])}${librarySelect('intake','学期',[['','すべて'],'Summer','Winter','September intake'])}</div><p class="muted">${filteredLibrary().length} / ${state.universityLibrary.length} 件 · フィルターはカードに表示中の年度情報に適用します。</p></section><div class="grid2">${filteredLibrary().map(libraryCard).join('')||'<p class="panel empty">条件に一致するプログラムはありません。</p>'}</div>`;}
function libraryFieldView(v,key,label){const value=libraryGet(v,key),meta=v.metadata[key];return `<div class="library-fact fact-${esc(meta.status)}"><div class="section-head"><dt>${esc(label)}</dt>${libraryStatus(meta.status)}</div><dd>${esc(value||'未登録・未確認')}</dd><p class="muted">${esc(v.academicYear)}年度${meta.status==='previous'&&meta.referenceYear?` · 参考：${esc(meta.referenceYear)}年度情報`:''} · 最終公式確認：${esc(meta.lastVerified||'未確認')}${meta.lastVerified&&libraryAge(meta.lastVerified)>=90?' · 情報が古くなっている可能性があります':''}</p>${libraryLink(meta.url,'出典ページ')}</div>`;}
function libraryVersionView(v){return LIBRARY_FIELDS.map(([title,fields])=>`<section class="panel ${title==='調査メモ'?'library-personal':''}"><h2>${esc(title)}</h2><dl class="library-facts">${fields.map(([key,label])=>libraryFieldView(v,key,label)).join('')}</dl></section>`).join('');}
function libraryDetail(u,v){const previous=[...u.years].filter(y=>y.academicYear<v.academicYear).sort((a,b)=>b.academicYear.localeCompare(a.academicYear))[0];return `<p><a href="#library">← 大学一覧に戻る</a></p><section class="panel"><div class="section-head"><h2>${esc(v.university)}</h2>${button('library-edit','情報を更新',`${u.id}|${v.academicYear}`)}</div><p>${esc(v.program)} ${esc(v.degree)} · ${esc(v.country)}</p><div class="toolbar">${[...u.years].sort((a,b)=>b.academicYear.localeCompare(a.academicYear)).map(y=>`<a class="library-link" href="${libraryHref(u.id,y.academicYear)}" ${y===v?'aria-current="page"':''}>${esc(y.academicYear)}</a>`).join('')}${button('library-newyear','別年度の情報を追加',`${u.id}|${v.academicYear}`)}</div>${libraryYearNote(v)}${libraryPublication(v)}${v.publication==='unpublished'?`<div class="library-previous"><h3>参考：${previous?esc(previous.academicYear):'前年度'}年度情報</h3>${previous?`<p>前年度の期限や要件は ${esc(v.academicYear)} 年度の確定情報ではありません。</p><a href="${libraryHref(u.id,previous.academicYear)}">${esc(previous.academicYear)}の記録を見る →</a>`:'<p>前年度の情報はまだ登録されていません。</p>'}</div>`:''}<div class="toolbar">${Object.entries(LIBRARY_LINKS).map(([key,label])=>libraryLink(v.links[key],label)).join('')||'<span class="muted">公式リンク未登録</span>'}</div>${libraryApplicationControl(u,v)}<p class="muted">出願管理にはこのプログラムへの参照と個人の出願状況だけを保存します。一般要件はこの画面で一元管理します。</p></section><section class="panel library-personal"><div class="section-head"><h2>私の場合</h2>${button('library-personal','個人情報を編集',`${u.id}|${v.academicYear}`)}</div><p>${libraryStatus('personal')} 公式情報とは独立した個人の記録です。</p><dl class="record-details">${LIBRARY_PERSONAL.map(([key,label])=>`<div><dt>${esc(label)}</dt><dd>${esc(u.personal[key]||'未登録')}</dd></div>`).join('')}</dl></section>${libraryLegacyImports(u)}${libraryVersionView(v)}<section class="panel"><h2>変更履歴</h2>${u.updates.length?[...u.updates].reverse().map(x=>`<article class="library-update"><p><strong>${esc(x.date)}</strong> · ${esc(x.academicYear)}年度 · ${x.kind==='personal'?'⚪ 個人メモ':'大学情報'}</p><p>${esc(x.summary)}</p>${x.before?`<details><summary>更新前の情報を見る（保存時点のスナップショット）</summary>${libraryYearNote(x.before)}${libraryPublication(x.before)}<div class="toolbar">${Object.entries(LIBRARY_LINKS).map(([key,label])=>libraryLink(x.before.links[key],label)).join('')}</div>${libraryVersionView(x.before)}</details>`:''}${x.personalBefore?`<details><summary>更新前の個人メモ</summary><dl class="record-details">${LIBRARY_PERSONAL.map(([key,label])=>`<div><dt>${esc(label)}</dt><dd>${esc(x.personalBefore[key]||'未登録')}</dd></div>`).join('')}</dl></details>`:''}</article>`).join(''):'<p class="muted">まだ更新履歴はありません。情報の登録・変更時に自動で記録します。</p>'}</section>`;}
function renderUniversityLibrary(){const route=libraryRoute();if(!route.id)return libraryList();const u=state.universityLibrary.find(x=>x.id===route.id),v=u?.years.find(y=>y.academicYear===route.year);return u&&v?libraryDetail(u,v):'<section class="panel"><p>指定された大学・年度は見つかりません。</p><a href="#library">一覧へ戻る</a></section>';}
function universityLibraryWarnings(){const need=state.universityLibrary.map(u=>({u,v:libraryYear(u,'2027/28')})).filter(({v})=>!v.lastVerified||libraryAge(v.lastVerified)>=90);if(!need.length)return '';return `<section class="panel"><h2>大学情報の再確認</h2><details><summary>${need.length} 件の情報を確認してください</summary>${need.map(({u,v})=>`<p>⚠ <a href="${libraryHref(u.id,v.academicYear)}">${esc(v.university)}</a> · ${esc(v.academicYear)}年度<br><span class="muted">${v.lastVerified?`最終確認から${libraryAge(v.lastVerified)}日経過しています。情報が古くなっている可能性があります。`:'公式確認日が未登録です。'}</span></p>`).join('')}</details></section>`;}
function libraryMetadataEditor(v,key){const m=v.metadata[key];return `<div class="library-meta-editor">${field(`status:${key}`,'この項目の信頼度','',m.status,Object.entries(LIBRARY_STATUS),key==='memo'?'disabled':'')}${field(`url:${key}`,'出典URL','url',m.url)}${field(`verified:${key}`,'項目の最終公式確認日','date',m.lastVerified,null,`max="${today()}"`)}${field(`reference:${key}`,'参考にした年度（前年度情報の場合）','text',m.referenceYear||'',null,'placeholder="2026/27"')}</div>`;}
function openLibraryEditor(mode,id,academicYear){
 $('#form button[type=submit]').textContent='保存する';
  const u=state.universityLibrary.find(x=>x.id===id),source=u?.years.find(v=>v.academicYear===academicYear);
  let v=source?libraryClone(source):blankLibraryYear();
  if(mode==='newyear'){
    const first=Number(source.academicYear.slice(0,4))+1;v.academicYear=`${first}/${String((first+1)%100).padStart(2,'0')}`;
    v.publication='unknown';v.lastVerified='';v.verificationStatus='previous';
    // Copy context but never carry forward deadline or IELTS as a new year's requirement.
    const clean=['admission.english','admission.ielts','admission.german','admission.entranceExam','admission.interview','application.start','application.deadline','costs.tuition','costs.semesterContribution','costs.applicationFee'];
    for(const [,fs]of LIBRARY_FIELDS)for(const [key]of fs){v.metadata[key]={status:key==='memo'?'personal':'previous',url:'',lastVerified:'',referenceYear:source.metadata[key].referenceYear||source.academicYear};if(clean.includes(key)){librarySet(v,key,'');v.metadata[key].status='recheck';}}
  }
  edit={type:'library',mode,id,academicYear};
  $('#dialog-title').textContent=mode==='personal'?'私の場合':mode==='newyear'?'別年度の情報を追加':mode==='new'?'プログラムを登録':'大学情報を更新';
  let html;
  if(mode==='personal')html=LIBRARY_PERSONAL.map(([key,label])=>field(key,label,'textarea',u.personal[key]||'')).join('');
  else {
    html=field('academicYear','対象年度（例：2027/28）','text',v.academicYear,null,`required pattern="20[0-9]{2}/[0-9]{2}" ${mode==='edit'?'readonly':''}`)+field('publication','募集要項の公開状況','',v.publication,Object.entries(LIBRARY_PUBLICATION))+field('verificationStatus','記録全体の信頼度','',v.verificationStatus,Object.entries(LIBRARY_STATUS))+field('lastVerified','大学の最終公式確認日','date',v.lastVerified,null,`max="${today()}"`);
    html+='<p class="wide muted">情報ごとに信頼度・出典・確認日を記録してください。公式確認済みの項目にはURLと確認日が必要です。年度を変えるときは「別年度の情報を追加」を使います。</p>';
    html+=LIBRARY_FIELDS.map(([title,fs],i)=>`<details class="wide library-edit-section" ${i===0?'open':''}><summary>${esc(title)}</summary>${fs.map(([key,label,type,options])=>`<fieldset><legend>${esc(label)}</legend>${field(key,'内容',type,libraryGet(v,key),options,['university','program','country','degree'].includes(key)?'required':type==='number'?'min="0" max="9" step="0.5"':'')}${libraryMetadataEditor(v,key)}</fieldset>`).join('')}</details>`).join('');
    html+=`<details class="wide library-edit-section"><summary>公式リンク</summary>${Object.entries(LIBRARY_LINKS).map(([key,label])=>field(`link:${key}`,label,'url',v.links[key])).join('')}</details>`;
  }
  html+=field('changeSummary','今回の更新内容','textarea','',null,'required maxlength="2000"');
  $('#fields').innerHTML=html;$('#editor').showModal();
}
function submitLibrary(data){
  if(loadFailed){alert('既存データの読み込みエラーを解決してください。');return false;}
  const {mode,id,academicYear}=edit,summary=String(data.get('changeSummary')||'').trim();
  if(!summary){alert('今回の更新内容を入力してください。');return false;}
  const candidate=libraryClone(state),u=candidate.universityLibrary.find(x=>x.id===id),old=u?.years.find(v=>v.academicYear===academicYear);
  let resultId=id,resultYear=academicYear;
  if(mode==='personal'){
    const before=libraryClone(u.personal);for(const [key]of LIBRARY_PERSONAL)u.personal[key]=String(data.get(key)||'').trim();
    u.updates.push({date:today(),academicYear,kind:'personal',summary,personalBefore:before});
  }else{
    const v=blankLibraryYear(String(data.get('academicYear')||'').trim());
    v.publication=data.get('publication');v.verificationStatus=data.get('verificationStatus');v.lastVerified=String(data.get('lastVerified')||'');
    for(const [,fs]of LIBRARY_FIELDS)for(const [key]of fs){librarySet(v,key,String(data.get(key)||'').trim());v.metadata[key]={status:key==='memo'?'personal':data.get(`status:${key}`),url:String(data.get(`url:${key}`)||'').trim(),lastVerified:String(data.get(`verified:${key}`)||''),referenceYear:String(data.get(`reference:${key}`)||'').trim()};}
    for(const key of Object.keys(LIBRARY_LINKS))v.links[key]=String(data.get(`link:${key}`)||'').trim();
    if(!v.university||!v.program||!v.country||!v.degree){alert('大学名・プログラム名・国・学位を入力してください。');return false;}
    if(mode==='edit'&&v.academicYear!==academicYear){alert('別年度の情報は新しい年度として追加してください。');return false;}
    if(mode==='newyear'&&u.years.some(y=>y.academicYear===v.academicYear)){alert('この年度は登録済みです。既存年度の「情報を更新」を使用してください。');return false;}
    try{validateLibraryYear(v);}catch(e){alert(e.message);return false;}
    const update={date:today(),academicYear:v.academicYear,kind:'information',summary};
    if(mode==='new'){resultId=uid();candidate.universityLibrary.push({id:resultId,years:[v],personal:{},updates:[update]});}
    else if(mode==='newyear'){u.years.push(v);u.updates.push(update);}
    else{update.before=libraryClone(old);u.years[u.years.indexOf(old)]=v;u.updates.push(update);}
    resultYear=v.academicYear;
  }
  try{migrateUniversityLibrary(candidate);localStorage.setItem(KEY,JSON.stringify(candidate));}catch(e){alert('保存できませんでした：'+e.message);return false;}
  state=candidate;$('#editor').close();location.hash=libraryHref(resultId,resultYear);render();return true;
}
function handleLibraryClick(action,id){
  if(!action.startsWith('library-'))return false;
  const [recordId,year]=String(id||'').split('|');
  if(action==='library-new')openLibraryEditor('new');
  else if(['library-edit','library-newyear','library-personal'].includes(action))openLibraryEditor(action.slice(8),recordId,year);
  else if(action==='library-apply'){
    if(loadFailed){alert('既存データの読み込みエラーを解決してください。');return true;}
    const u=state.universityLibrary.find(x=>x.id===recordId),v=u?.years.find(x=>x.academicYear===year);
    if(!u||!v||libraryApplications(u,v).length)return true;
    const candidate=libraryClone(state);
    candidate.universities.push({id:uid(),libraryId:u.id,libraryAcademicYear:v.academicYear,status:'情報収集中',note:`大学情報ライブラリ ${v.academicYear}年度を参照。要件・締切は公式情報で別途確認してください。`});
    try{migrateApplications(candidate);localStorage.setItem(KEY,JSON.stringify(candidate));state=candidate;render();}catch{alert('出願管理へ保存できませんでした。');}
  }
  return true;
}

function libraryLegacyImports(u){
  if(!u.legacyImports?.length)return '';
  return `<section class="panel library-personal"><h2>旧出願管理から移した参考情報</h2><p>⚪ 移行記録・公式未確認。対象年度が不明な値を公式要件として扱わないでください。</p>${u.legacyImports.map(x=>`<details><summary>${esc(x.date)}移行 · 元の対象年度：${esc(x.sourceAcademicYear||'不明')}</summary><dl class="record-details">${Object.entries(x.values).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(typeof v==='string'?v:JSON.stringify(v))}</dd></div>`).join('')}</dl></details>`).join('')}</section>`;
}

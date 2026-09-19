'use strict';
// Dedicated screens extend the v1 data format without replacing existing records.
const programPages = {
  ielts: { title: 'IELTS', category: 'IELTS', fallback: '目標スコアと次の練習を決める' },
  ouj: { title: '放送大学', category: '放送大学', fallback: '履修科目と次の授業を確認する' },
  interview: { title: '大学院面接', category: '大学院面接', fallback: '志望大学の自己紹介を練習する' },
  scholarship: { title: 'Stipendium Hungaricum', category: '奨学金', fallback: '募集要項と締切を公式情報で確認する' }
};
const skillNames = ['Speaking', 'Writing', 'Reading', 'Listening'];
const scholarshipDocs = ['Motivation Letter', 'Academic Transcript', 'Graduation Certificate', 'IELTS', 'Passport', 'Medical Certificate', 'Recommendation Letter'];
const interviewQuestions = [];
const textField = (key, label, type = 'text', required = false) => ({ key, label, type, required });
const numberField = (key, label, max = 100000, step = 1) => ({ key, label, type: 'number', min: 0, max, step });
const selectField = (key, label, options) => ({ key, label, type: 'select', options });
const schemas = {
  skill: [selectField('name', '技能', skillNames), numberField('target', '目標スコア', 9, 0.5), numberField('minutes', '累計学習時間（分）'), numberField('count', '練習回数'), numberField('mock', '模試スコア', 9, 0.5), numberField('exam', '本試験スコア', 9, 0.5), textField('weak', '苦手項目', 'textarea'), textField('note', 'メモ', 'textarea')],
  result: [textField('date', '受験日', 'date', true), numberField('overall', 'Overall', 9, 0.5), ...skillNames.map(n => numberField(n.toLowerCase(), n, 9, 0.5)), textField('note', 'メモ', 'textarea')],
  course: [textField('name', '科目名', 'text', true), textField('start', '授業開始日', 'date'), numberField('progress', '授業進捗（%）', 100), numberField('minutes', '累計学習時間（分）'), textField('assignment', '課題'), textField('deadline', '課題提出期限', 'date'), textField('examDate', '試験日', 'date'), textField('result', '試験結果'), selectField('credits', '単位取得状況', ['未取得', '履修中', '取得済']), textField('note', 'メモ', 'textarea')],
  question: [textField('university', '大学名', 'university', true), textField('question', '面接質問', 'textarea', true), textField('japanese', '日本語メモ', 'textarea'), textField('answer', '英語回答', 'textarea'), textField('keywords', 'キーワード'), numberField('count', '練習回数'), textField('last', '最終練習日', 'date'), selectField('recording', '録音有無（外部で録音した記録）', ['なし', 'あり']), selectField('rating', '自己評価', ['未評価', '1：要練習', '2：やや不安', '3：普通', '4：おおむね良い', '5：自信あり']), textField('note', 'メモ', 'textarea')],
  ieltsconfig: [numberField('target', 'Overall目標', 9, 0.5), textField('examDate', '次の受験予定日', 'date')],
  scholarshipconfig: [textField('start', '募集開始日', 'date'), textField('deadline', '奨学金締切日', 'date'), textField('first', '第1希望（大学・プログラム）', 'university'), textField('second', '第2希望（大学・プログラム）', 'university'), textField('nomination', 'Nomination状況'), textField('selection', '大学選考'), textField('interview', '面接状況'), textField('interviewDate', '面接予定日', 'date'), selectField('result', '奨学金結果', ['未申請', '申請済', '結果待ち', '採用', '不採用', '辞退']), textField('note', 'メモ', 'textarea')],
  scholarshipdoc: [textField('name', '提出書類名', 'text', true), selectField('status', '提出状況', ['未着手', '準備中', '準備完了', '提出済', '対象外']), textField('deadline', '提出期限', 'date'), textField('note', 'メモ', 'textarea')]
};
function programDefaults() {
  return {
    ielts: { target: null, examDate: '', skills: skillNames.map(name => ({id: uid(), name, target: null, minutes: 0, count: 0, mock: null, exam: null, weak: '', note: ''})), results: [] },
    ouj: { courses: [] },
    interview: { questions: [] },
    scholarship: { start: '', deadline: '', first: '', second: '', nomination: '', selection: '', interview: '', interviewDate: '', result: '未申請', note: '', documents: scholarshipDocs.map(name => ({id: uid(), name, status: '未着手', deadline: '', note: ''})) }
  };
}
function validDate(value) {
  return typeof value === 'string' && (/^\d{4}-\d{2}-\d{2}$/.test(value)) && Number.isFinite(parse(value).getTime()) && dateKey(parse(value)) === value;
}
function checkRecord(record, schema) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('専用画面のデータが不正です');
  for (const f of schema) {
    const v = record[f.key];
    if (v === undefined || v === '' || v === null) { if (f.required) throw Error('必須項目がありません'); continue; }
    if (f.type === 'number') {
      if (!Number.isFinite(v) || v < f.min || v > f.max || Math.abs(v / f.step - Math.round(v / f.step)) > 1e-7) throw Error('数値が不正です');
    } else {
      if (typeof v !== 'string' || v.length > 20000) throw Error('文字列が不正です');
      if (f.type === 'date' && !validDate(v)) throw Error('日付が不正です');
      if (f.options && !f.options.includes(v)) throw Error('選択項目が不正です');
    }
  }
}
function migratePrograms(s) {
  if (s.programs === undefined) s.programs = programDefaults();
  const p = s.programs;
  if (!p || typeof p !== 'object') throw Error('専用画面データが不正です');
  for (const key of Object.keys(programPages)) if (!p[key] || typeof p[key] !== 'object' || Array.isArray(p[key])) throw Error('専用画面が不足しています');
  checkRecord(p.ielts, schemas.ieltsconfig);
  checkRecord(p.scholarship, schemas.scholarshipconfig);
  for (const [list, schema] of [[p.ielts.skills, schemas.skill], [p.ielts.results, schemas.result], [p.ouj.courses, schemas.course], [p.interview.questions, schemas.question], [p.scholarship.documents, schemas.scholarshipdoc]]) {
    if (!Array.isArray(list) || list.length > 10000 || new Set(list.map(r => r?.id)).size !== list.length) throw Error('一覧が不正です');
    for (const r of list) { if (typeof r?.id !== 'string') throw Error('IDが不正です'); checkRecord(r, schema); }
  }
  if (p.ielts.skills.length !== 4 || new Set(p.ielts.skills.map(r => r.name)).size !== 4 || p.ielts.skills.some(r => !skillNames.includes(r.name))) throw Error('IELTS技能が不正です');
  return s;
}
function programRecords(kind) {
  return ({skill: state.programs.ielts.skills, result: state.programs.ielts.results, course: state.programs.ouj.courses, question: state.programs.interview.questions, scholarshipdoc: state.programs.scholarship.documents})[kind];
}
function taskUrgency(task) {
  return task.deadline && task.deadline < today() ? 0 : task.deadline && days(task.deadline) <= 3 ? 1 : 2;
}
function compareActions(a, b) {
  const priority = {緊急: 0, 高: 1, 中: 2, 低: 3};
  return taskUrgency(a) - taskUrgency(b) || (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2) || (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}
function nextProgramAction(key) {
  return state.tasks.filter(t => t.category === programPages[key].category && !t.done).sort(compareActions)[0] || null;
}
function nextActionCard(key, home = false) {
  const cfg = programPages[key], task = nextProgramAction(key);
  return `<section class="${home ? 'action-item' : 'panel next-action'}"><div class="section-head"><h2>${home ? esc(cfg.title) : '次にやること'}</h2>${home ? `<a href="#${key}">専用画面 →</a>` : ''}</div>${task ? taskList([task]) : `<p>${esc(cfg.fallback)}</p><p class="muted">まだ未完了タスクがありません。</p>`}${button('program-task', task ? '＋ 次のタスクを追加' : 'このアクションを登録', key, 'compact')}</section>`;
}
function homeActions() {
  const actions = Object.keys(programPages).map(key => ({key, task: nextProgramAction(key)})).filter(x => x.task).sort((a,b) => compareActions(a.task,b.task));
  const top = actions[0];
  return `<section class="panel"><h2>最優先アクション</h2><p class="priority-action">${top ? `${esc(programPages[top.key].title)} · ${esc(top.task.name)}` : 'まずは、各分野の次の一歩を登録しましょう。'}</p><p class="muted">各分野1件。期限切れ → 3日以内の期限 → 優先度 → 締切 → 実施日の順で表示します。${top?.task.date > today() ? '最優先タスクは今後の予定です。' : ''}</p><div class="grid2">${Object.keys(programPages).sort((a,b)=>{let x=nextProgramAction(a),y=nextProgramAction(b);return x&&y?compareActions(x,y):x?-1:y?1:0}).map(key => nextActionCard(key,true)).join('')}</div></section>`;
}
function programDeadlines() {
  const p = state.programs, list = [];
  const push = (date,name,category) => { if (date) list.push({date,name,category}); };
  push(p.ielts.examDate, 'IELTS 受験予定', 'IELTS');
  for (const c of p.ouj.courses) { push(c.deadline, `${c.name} · 課題提出`, '放送大学'); push(c.examDate, `${c.name} · 試験`, '放送大学'); }
  push(p.scholarship.deadline, 'Stipendium Hungaricum · 奨学金締切', '奨学金');
  push(p.scholarship.interviewDate, 'Stipendium Hungaricum · 面接', '奨学金');
  for (const d of p.scholarship.documents) if (!['提出済','対象外'].includes(d.status)) push(d.deadline, `SH · ${d.name}`, '奨学金');
  return list;
}
const displayValue = v => v === null || v === undefined || v === '' ? '—' : esc(v);
function recordDetails(record, schema, excluded = []) {
  return `<dl class="record-details">${schema.filter(f => !excluded.includes(f.key)).map(f => `<div><dt>${esc(f.label)}</dt><dd>${displayValue(record[f.key])}</dd></div>`).join('')}</dl>`;
}
function recordButton(kind, label, id = '') { return button('program-edit',label,`${kind}:${id}`,'compact'); }
let interviewFilter = '';
function renderProgram(key) {
  const p = state.programs;
  let body = nextActionCard(key);
  if (key === 'ielts') {
    body += `<section class="panel"><div class="section-head"><h2>目標 Overall ${displayValue(p.ielts.target)}</h2>${recordButton('ieltsconfig','目標・受験日を編集')}</div><p>次の受験予定：${displayValue(p.ielts.examDate)}</p><p class="muted">技能別時間は手動の累計記録です。ホーム・週間集計はTo Doの実績のみを使用し、二重加算しません。</p></section><div class="grid2">${p.ielts.skills.map(s=>`<section class="panel"><div class="section-head"><h2>${esc(s.name)}</h2>${recordButton('skill','編集',s.id)}</div>${recordDetails(s,schemas.skill,['name'])}</section>`).join('')}</div><section class="panel"><div class="section-head"><h2>本試験結果の履歴</h2>${recordButton('result','＋ 結果を追加')}</div>${p.ielts.results.length ? `<div class="scroll"><table><thead><tr><th>受験日</th><th>Overall</th>${skillNames.map(n=>`<th>${n}</th>`).join('')}<th></th></tr></thead><tbody>${[...p.ielts.results].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${esc(r.date)}</td><td>${displayValue(r.overall)}</td>${skillNames.map(n=>`<td>${displayValue(r[n.toLowerCase()])}</td>`).join('')}<td>${recordButton('result','編集',r.id)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">本試験結果はまだありません。</p>'}</section>`;
  }
  if (key === 'ouj') body += `<div class="section-head"><h2>履修科目</h2>${recordButton('course','＋ 科目を追加')}</div><div class="grid2">${p.ouj.courses.map(c=>`<section class="panel"><div class="section-head"><h2>${esc(c.name)}</h2>${recordButton('course','編集',c.id)}</div><progress aria-label="${esc(c.name)}の授業進捗" max="100" value="${Number(c.progress)||0}"></progress>${recordDetails(c,schemas.course,['name'])}</section>`).join('') || '<p class="empty">科目を登録してください。</p>'}</div><p class="muted">科目の累計学習時間は手動記録です。週間集計への記録はTo Doの完了から行えます。</p>`;
  if (key === 'interview') {
    const names = [...new Set(p.interview.questions.map(q=>q.university))].sort();
    if (!names.includes(interviewFilter)) interviewFilter='';
    const questions = p.interview.questions.filter(q=>!interviewFilter||q.university===interviewFilter);
    body += `<div class="section-head"><label>大学で絞り込む<select id="interview-filter"><option value="">すべての大学</option>${names.map(n=>`<option ${interviewFilter===n?'selected':''} value="${esc(n)}">${esc(n)}</option>`).join('')}</select></label>${recordButton('question','＋ 質問を追加')}</div><p class="muted">録音有無は外部録音の管理用です。この画面では録音しません。</p>${questions.map(q=>`<section class="panel"><div class="section-head"><span class="badge">${esc(q.university)}</span>${recordButton('question','編集',q.id)}</div><h2>${esc(q.question)}</h2>${recordDetails(q,schemas.question,['university','question'])}</section>`).join('') || '<div class="panel empty">質問を登録してください。</div>'}`;
  }
  if (key === 'scholarship') {
    const s=p.scholarship;
    body += `<section class="panel"><div class="section-head"><h2>奨学金の申請情報</h2>${recordButton('scholarshipconfig','編集')}</div><p class="muted">大学出願とは別に管理します。年度ごとの対象・必要書類・日付は公式情報で確認してください。</p><div class="grid2"><div class="preference"><small>FIRST CHOICE</small><h3>第1希望</h3><p>${displayValue(s.first)}</p></div><div class="preference"><small>SECOND CHOICE</small><h3>第2希望</h3><p>${displayValue(s.second)}</p></div></div>${recordDetails(s,schemas.scholarshipconfig,['first','second'])}</section><section class="panel"><div class="section-head"><h2>提出書類</h2>${recordButton('scholarshipdoc','＋ 書類を追加')}</div><p class="muted">ここでは奨学金への提出状況を記録します。共通Documentsの所有状況とは独立しています。</p>${s.documents.map(d=>`<div class="task"><div class="task-body"><strong>${esc(d.name)}</strong><span class="badge">${esc(d.status)}</span><p class="muted">期限：${displayValue(d.deadline)} · ${esc(d.note||'')}</p></div>${recordButton('scholarshipdoc','編集',d.id)}</div>`).join('') || '<p class="empty">提出書類を登録してください。</p>'}</section>`;
  }
  return body;
}
function openProgramEditor(kind,id) {
 $('#form button[type=submit]').textContent='保存する';
  if (!schemas[kind]) return;
  edit={type:'program',kind,id};
  const record = kind==='ieltsconfig' ? state.programs.ielts : kind==='scholarshipconfig' ? state.programs.scholarship : programRecords(kind).find(r=>r.id===id) || {};
  $('#dialog-title').textContent = {skill:'IELTS 技能の記録',result:'IELTS 本試験結果',course:'放送大学 科目',question:'大学院面接 質問',ieltsconfig:'IELTS 目標と受験日',scholarshipconfig:'Stipendium Hungaricum 申請情報',scholarshipdoc:'奨学金 提出書類'}[kind];
  let html=schemas[kind].map(f=>{
    let extra = f.required ? 'required ' : '';
    if (f.type==='number') extra += `min="${f.min}" max="${f.max}" step="${f.step}"`;
    if (f.type==='university') extra += ' list="program-universities"';
    if (kind==='skill' && f.key==='name') extra += ' disabled';
    return field(f.key,f.label,f.type==='university'?'text':f.type,record[f.key]??'',f.options,extra);
  }).join('');
  html += `<datalist id="program-universities">${state.universities.map(u=>`<option value="${esc(u.name)}"></option>`).join('')}</datalist>`;
  if (id && !['skill','ieltsconfig','scholarshipconfig'].includes(kind)) html+=`<div class="wide">${button('program-delete','削除する',`${kind}:${id}`,'danger')}</div>`;
  $('#fields').innerHTML=html; $('#editor').showModal();
}
function submitProgram(data) {
  const {kind,id}=edit, values={};
  for (const f of schemas[kind]) {
    if (kind==='skill' && f.key==='name') continue;
    const v=data.get(f.key) ?? '';
    values[f.key]=f.type==='number' ? (v===''?null:Number(v)) : String(v).trim();
  }
  if (kind==='scholarshipconfig' && values.first && values.first===values.second) { alert('第1希望と第2希望には異なる大学・プログラムを入力してください。'); return false; }
  try { checkRecord(values,schemas[kind]); } catch(e) { alert('入力内容を確認してください。'); return false; }
  if (kind==='ieltsconfig') Object.assign(state.programs.ielts,values);
  else if (kind==='scholarshipconfig') Object.assign(state.programs.scholarship,values);
  else { const records=programRecords(kind), old=records.find(r=>r.id===id); if (old) Object.assign(old,values); else records.push({...values,id:uid()}); }
  return true;
}
function handleProgramClick(action,id) {
  if(action==='program-edit') { const [kind,recordId]=id.split(':');openProgramEditor(kind,recordId);return true; }
  if(action==='program-delete') {
    const [kind,recordId]=id.split(':');
    if (['result','course','question','scholarshipdoc'].includes(kind) && confirm('この記録を削除しますか？')) {
      const records=programRecords(kind), index=records.findIndex(r=>r.id===recordId);
      if(index>=0)records.splice(index,1);save();$('#editor').close();render();
    }return true;
  }
  if(action==='program-task' && programPages[id]) {
    const next=nextProgramAction(id);openEditor('task');
    $('#fields [name="category"]').value=programPages[id].category;
    if(!next)$('#fields [name="name"]').value=programPages[id].fallback;
    return true;
  }
  return false;
}

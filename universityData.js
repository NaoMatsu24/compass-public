'use strict';
// Seeded from user-provided candidate names. No seed is marked officially verified.
const UNIVERSITY_SEEDS = [];
const LIBRARY_STATUS = {official:'🟢 公式確認済み',previous:'🟡 前年度情報',recheck:'🟠 要再確認',personal:'⚪ 個人メモ'};
const LIBRARY_PUBLICATION = {unknown:'公開状況未確認',unpublished:'未公開',published:'公開済み'};
const LIBRARY_FIELDS = [
  ['基本情報', [
    ['university','大学名','text'],['program','プログラム名','text'],['country','国','select',['Hungary','Germany']],['city','都市','text'],
    ['degree','学位','select',['MSc','MA','B.A.','B.Sc.','Bachelor','Master']],['duration','期間','text'],['ects','ECTS','text'],['language','授業言語','text'],
    ['intake','開始学期','select',['','Summer','Winter','September intake']],['fields','分野（カンマ区切り）','text'],['tags','タグ（カンマ区切り）','text']
  ]],
  ['学べる内容', [['curriculum','カリキュラム（1行に1項目）','textarea'],['curriculumSummary','主要分野の説明','textarea']]],
  ['Admission Requirements', [
    ['admission.academic','学歴要件','textarea'],['admission.english','英語要件','text'],['admission.ielts','IELTS最低スコア（不明は空欄）','number'],['admission.german','ドイツ語要件','text'],
    ['admission.math','数学・統計要件','textarea'],['admission.entranceExam','Entrance Exam','textarea'],['admission.interview','Interview','textarea'],['admission.motivation','Motivation Letter','textarea'],['admission.other','その他の要件','textarea']
  ]],
  ['Application', [
    ['application.method','出願方法','textarea'],['application.portal','Application Portal URL','url'],['application.uniAssist','uni-assist','select',['未確認','必要','不要','条件による']],
    ['application.vpd','VPD','select',['未確認','必要','不要','条件による']],['application.dosv','DoSV','select',['未確認','必要','不要','条件による']],['application.start','出願開始','date'],['application.deadline','出願締切','date']
  ]],
  ['Cost', [['costs.tuition','Tuition（通貨・対象期間も記載）','text'],['costs.semesterContribution','Semester contribution','text'],['costs.applicationFee','Application fee','text'],['costs.other','その他費用','textarea']]],
  ['Scholarships', [['scholarships.stipendium','Stipendium Hungaricum対象','select',['未確認','対象','対象外','条件による']],['scholarships.university','大学独自奨学金','textarea'],['scholarships.other','その他奨学金','textarea']]],
  ['Career / 学べる方向性', [['career','公式情報に基づく進路・方向性','textarea']]],
  ['調査メモ', [['memo','調査・検討メモ（ChatGPT等での検討を含む）','textarea']]]
];
const LIBRARY_LINKS = {official:'公式ページを開く',admission:'Admissionページ',curriculum:'Curriculum',fees:'Fees',scholarship:'Scholarship'};
const LIBRARY_PERSONAL = [['currentIelts','現在のIELTS'],['targetIelts','目標IELTS'],['education','学歴'],['gaps','不足している可能性のある要件'],['preparing','準備中'],['pastResults','過去の出願結果'],['nextAction','次にやること'],['notes','個人的な評価・メモ']];
const libraryClone = value => JSON.parse(JSON.stringify(value));
function libraryGet(object,path) { return path.split('.').reduce((v,k)=>v?.[k],object); }
function librarySet(object,path,value) { const keys=path.split('.'),last=keys.pop();let cursor=object;for(const key of keys)cursor=cursor[key]||(cursor[key]={});cursor[last]=value; }
function blankLibraryYear(academicYear='2027/28') {
  const v={academicYear,lastVerified:'',verificationStatus:'recheck',publication:'unknown',metadata:{},links:{}};
  for(const [,fields] of LIBRARY_FIELDS)for(const [key] of fields){librarySet(v,key,'');v.metadata[key]={status:key==='memo'?'personal':'recheck',url:'',lastVerified:''};}
  for(const key of Object.keys(LIBRARY_LINKS))v.links[key]='';
  return v;
}
function initialUniversityLibrary() {
  return UNIVERSITY_SEEDS.map(s=>{
    const year=blankLibraryYear();
    for(const key of ['university','program','country','degree'])year[key]=s[key];
    year.fields=s.fields.join(', ');year.memo=s.memo;
    return {id:s.id,legacyName:s.legacy,years:[year],personal:{},updates:[]};
  });
}
function safeLibraryUrl(value) {
  if(!value)return '';
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
}
function validAcademicYear(year) {
  const match=/^(20\d{2})\/(\d{2})$/.exec(year||'');return Boolean(match&&((Number(match[1])+1)%100===Number(match[2])));
}
function validateLibraryYear(v) {
  if(!v||!v.university||!v.program||!v.country||!v.degree||!validAcademicYear(v.academicYear)||!Object.keys(LIBRARY_STATUS).includes(v.verificationStatus)||!Object.keys(LIBRARY_PUBLICATION).includes(v.publication)||!v.metadata||!v.links)throw Error('大学情報の年度が不正です');
  if(typeof v.lastVerified!=='string'||(v.lastVerified&&(!validDate(v.lastVerified)||v.lastVerified>today())))throw Error('確認日が不正です');
  for(const [,fields]of LIBRARY_FIELDS)for(const [key,,type,options]of fields){
    const value=libraryGet(v,key),m=v.metadata[key];
    if(typeof value!=='string'||value.length>30000||!m||!Object.keys(LIBRARY_STATUS).includes(m.status)||typeof m.url!=='string'||(m.url&&!safeLibraryUrl(m.url))||typeof m.lastVerified!=='string'||(m.lastVerified&&(!validDate(m.lastVerified)||m.lastVerified>today())))throw Error('大学情報の項目が不正です');
    if(m.referenceYear!==undefined&&m.referenceYear!==''&&!validAcademicYear(m.referenceYear))throw Error('参考年度が不正です');
    if(type==='date'&&value&&!validDate(value))throw Error('日付が不正です');
    if(type==='url'&&value&&!safeLibraryUrl(value))throw Error('URLが不正です');
    if(type==='number'&&value&&(Number(value)<0||Number(value)>9||!Number.isFinite(Number(value))||Number(value)*2%1!==0))throw Error('IELTSが不正です');
    if(options&&value&&!options.includes(value))throw Error('選択値が不正です');
    if(m.status==='official'&&value&&(!m.url||!m.lastVerified))throw Error('公式確認済みの項目には出典と確認日が必要です');
    if(key==='memo'&&m.status!=='personal')throw Error('調査メモは個人メモです');
  }
  for(const key of Object.keys(LIBRARY_LINKS))if(typeof v.links[key]!=='string'||(v.links[key]&&!safeLibraryUrl(v.links[key])))throw Error('公式URLが不正です');
  if(v.verificationStatus==='official'&&(!v.lastVerified||!v.links.official||v.publication!=='published'))throw Error('公式確認済みには確認日・公式URL・公開済み指定が必要です');
}
function migrateUniversityLibrary(s) {
  if(s.universityLibrary===undefined)s.universityLibrary=initialUniversityLibrary();
  if(!Array.isArray(s.universityLibrary)||s.universityLibrary.length>1000||new Set(s.universityLibrary.map(u=>u?.id)).size!==s.universityLibrary.length)throw Error('大学情報ライブラリが不正です');
  for(const u of s.universityLibrary){
    if(!u||typeof u.id!=='string'||!Array.isArray(u.years)||!u.years.length||new Set(u.years.map(v=>v?.academicYear)).size!==u.years.length||!Array.isArray(u.updates)||!u.personal||typeof u.personal!=='object')throw Error('大学情報が不正です');
    u.years.forEach(validateLibraryYear);
    if(u.legacyImports!==undefined){if(!Array.isArray(u.legacyImports))throw Error('旧要件の移行情報が不正です');for(const x of u.legacyImports)if(!x||typeof x.applicationId!=='string'||!validDate(x.date)||!validAcademicYear(x.academicYear)||(x.sourceAcademicYear&&!validAcademicYear(x.sourceAcademicYear))||!x.values||typeof x.values!=='object')throw Error('旧要件の移行情報が不正です');}
    for(const [key]of LIBRARY_PERSONAL)if(u.personal[key]!==undefined&&typeof u.personal[key]!=='string')throw Error('個人メモが不正です');
    for(const update of u.updates){if(!update||!validDate(update.date)||typeof update.summary!=='string'||!validAcademicYear(update.academicYear)||!['information','personal'].includes(update.kind))throw Error('変更履歴が不正です');if(update.before)validateLibraryYear(update.before);}
  }
  migrateApplications(s);
  return s;
}

// Single migration boundary: old application requirements move to this master store.
const LEGACY_UNIVERSITY_FIELDS=['ielts','german','requirements','math','portal','admission','curriculum','tuition','ects','language','duration','city','links','english','costs','scholarships','career'];
function migrateApplications(s){
  for(const u of s.universities){
    const own=key=>Object.prototype.propertyIsEnumerable.call(u,key);
    const legacy={};if(own('name')){legacy.identity={};for(const key of ['name','program','degree','country'])if(own(key))legacy.identity[key]=u[key];}for(const key of LEGACY_UNIVERSITY_FIELDS)if(own(key)&&u[key]!==undefined&&u[key]!==''&&u[key]!==null)legacy[key]=libraryClone(u[key]);
    let entry=s.universityLibrary.find(e=>e.id===u.libraryId);
    if(!entry){
      if(u.libraryId&&!own('name'))throw Error('出願管理の大学情報参照が見つかりません');
      const name=own('name')?u.name:'',program=own('program')?u.program:'',country=own('country')?u.country:'';
      entry=s.universityLibrary.find(e=>e.years.some(v=>(v.university===name||e.legacyName===name)&&(!country||(v.country==='Hungary'?'hungary':'germany')===country)&&(!program||v.program===program)));
      if(!entry){
        const v=blankLibraryYear(validAcademicYear(u.libraryAcademicYear)?u.libraryAcademicYear:'2027/28');
        v.university=name||'大学名未登録';v.program=program||'プログラム未登録';v.country=country==='hungary'?'Hungary':'Germany';v.degree=own('degree')&&u.degree==='学士'?'Bachelor':'Master';
        entry={id:uid(),years:[v],personal:{},updates:[{date:today(),academicYear:v.academicYear,kind:'information',summary:'旧出願管理の大学・プログラムをマスターへ移行（公式未確認）'}]};s.universityLibrary.push(entry);
      }
    }
    const target=entry.years.find(v=>v.academicYear===u.libraryAcademicYear)||entry.years.slice().sort((a,b)=>b.academicYear.localeCompare(a.academicYear))[0];
    if(Object.keys(legacy).length){
      const sourceAcademicYear=validAcademicYear(u.libraryAcademicYear)?u.libraryAcademicYear:'';
      if(!entry.legacyImports)entry.legacyImports=[];
      if(!entry.legacyImports.some(x=>x.applicationId===u.id&&JSON.stringify(x.values)===JSON.stringify(legacy))){
        entry.legacyImports.push({applicationId:u.id,date:today(),academicYear:target.academicYear,sourceAcademicYear,values:legacy});
        entry.updates.push({date:today(),academicYear:target.academicYear,kind:'information',summary:'旧出願管理から一般要件を移行。既存の公式情報は上書きせず、未確認の参考記録として保持。'});
      }
    }
    u.libraryId=entry.id;u.libraryAcademicYear=target.academicYear;
    for(const key of [...LEGACY_UNIVERSITY_FIELDS,'name','program','degree','country'])if(own(key))delete u[key];
    attachApplicationViews(u,s);
  }
  return s;
}

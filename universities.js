'use strict';
// Application records contain personal progress and pointers to universityData.js masters.
// Names, degree and country are derived non-enumerable views, never saved twice.
function initialApplications(){return UNIVERSITY_SEEDS.map(s=>({id:uid(),libraryId:s.id,libraryAcademicYear:'2027/28',status:'情報収集中'}));}
function applicationMaster(u,source=state){
  const entry=source.universityLibrary.find(v=>v.id===u.libraryId);
  return {entry,year:entry?.years.find(v=>v.academicYear===u.libraryAcademicYear)||entry?.years.slice().sort((a,b)=>b.academicYear.localeCompare(a.academicYear))[0]};
}
function attachApplicationViews(u,source){
  for(const key of ['name','program','country','degree'])Object.defineProperty(u,key,{enumerable:false,configurable:true,get(){
    const v=applicationMaster(this,source).year;if(!v)return key==='name'?'大学情報未登録':'';
    return key==='name'?v.university:key==='country'?(v.country==='Hungary'?'hungary':'germany'):key==='degree'?(['MSc','MA','Master'].includes(v.degree)?'修士':'学士'):v.program;
  }});
}
function universityReference(u){
  const {entry,year}=applicationMaster(u);
  if(!entry||!year)return '<p class="muted">大学情報未登録</p>';
  return `<div class="university-reference"><p class="muted">大学要件は大学情報ライブラリで一元管理しています。</p><a class="library-link" href="${libraryHref(entry.id,year.academicYear)}">${esc(year.academicYear)}年度の大学情報・要件 →</a></div>`;
}
function applicationEditor(o){
  const options=state.universityLibrary.flatMap(u=>u.years.map(v=>[`${u.id}|${v.academicYear}`,`${v.university} / ${v.program} (${v.academicYear})`]));
  return field('masterSelection','大学・プログラム・対象年度','',o.libraryId?`${o.libraryId}|${o.libraryAcademicYear}`:'',[['','選択してください'],...options],'required')+
    '<p class="wide muted">一般情報・語学要件は「大学情報」で編集してください。ここでは自分の出願予定と進捗を管理します。</p>'+
    field('status','出願状況','',o.status||'未着手',statuses)+field('semester','自分の出願学期','',o.semester||'未定',['未定','Sommersemester','Wintersemester'])+
    field('start','自分の出願開始予定','date',o.start)+field('deadline','自分の提出期限','date',o.deadline)+field('funding','利用予定の奨学金 / 自費','text',o.funding)+
    field('interviewDate','面接予定日','date',o.interviewDate)+field('assist','自分のuni-assist提出期限','date',o.assist)+field('vpd','自分のVPD申請期限','date',o.vpd)+
    field('dosv','自分のDoSV登録期限','date',o.dosv)+field('international','国際出願者としての提出期限','date',o.international)+field('note','自分の提出状況・結果・次にやること','textarea',o.note);
}

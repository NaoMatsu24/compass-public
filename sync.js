'use strict';
const SYNC_KEY='compass.study-abroad.sync.v1',SYNC_RECOVERY='compass.study-abroad.sync-recovery.v1';
const syncRuntime={adapter:null,user:null,busy:false,timer:null,generation:0,remote:null,message:'未接続',error:'',meta:null,connecting:false};
function syncMeta(){
 const raw=localStorage.getItem(SYNC_KEY);const m=raw?JSON.parse(raw):{enabled:false,owner:'',base:null,last:''};
 if(!m||typeof m.enabled!=='boolean'||typeof m.owner!=='string'||!(m.base===null||typeof m.base==='string'))throw Error('同期設定を読み込めません');return m;
}
function syncSummary(payload){
 if(!payload)return 'クラウドに記録はありません';
 const s=JSON.parse(payload);return `タスク ${s.tasks.length}件・完了 ${s.tasks.filter(t=>t.done).length}件・実績 ${s.tasks.reduce((n,t)=>n+(t.done?t.actual:0),0)}分・出願 ${s.universities.length}件`;
}
function syncPanel(){
 const r=syncRuntime,remote=r.remote,local=localStorage.getItem(KEY)||JSON.stringify(state);
 return `<section class="panel" id="compass-sync-panel"><h2>端末間の自動同期</h2><p role="status">${esc(r.message)}</p>${r.error?`<p class="warning">${esc(r.error)}</p>`:''}<p class="muted">${r.user?esc(r.user.email||'Googleアカウント'):'同じGoogleアカウントで各端末にログインします。'}${r.meta?.last?` · 最終同期 ${esc(new Date(r.meta.last).toLocaleString('ja-JP'))}`:''}</p><div class="toolbar">${!r.adapter?button('sync-connect','Googleログインを準備'):!r.user?button('sync-login','Googleでログイン'):button('sync-now','今すぐ同期')+button('sync-logout','同期を停止してログアウト')}</div>${remote?`<div class="warning"><h3>${r.meta?.base===null?'最初に使うデータを選択':'両方の端末で変更があります'}</h3><p>この端末：${esc(syncSummary(local))}</p><p>クラウド：${esc(syncSummary(remote.payload))}</p><p>選ばなかった記録は、この端末の同期前バックアップに保管します。データ全体を選択し、自動で合成しません。</p><div class="toolbar">${button('sync-use-local','この端末のデータを使う')}${remote.payload?button('sync-use-cloud','クラウドのデータを使う'):''}</div></div>`:''}<p><a href="#settings">同期状態・バックアップを確認</a></p><p class="muted">オフライン中はこの端末に保存し、オンライン復帰時に同期します。同時編集は確認後に解決します。同期できるデータは約900KBまでです。</p>${button('sync-recovery','同期前バックアップを書き出す')}</section>`;
}
function refreshCompassSync(){
 const node=document.querySelector('#compass-sync-panel');if(node)node.outerHTML=syncPanel();
 let notice=document.querySelector('#compass-sync-status');
 if(!notice){notice=document.createElement('div');notice.id='compass-sync-status';document.querySelector('#notice')?.after(notice);}
 if(notice)notice.innerHTML=syncRuntime.remote||syncRuntime.error?'<p class="warning">自動同期に確認が必要です。<a href="#settings">設定で確認</a></p>':'';
}
function syncArchive(local,remote){
 const rows=JSON.parse(localStorage.getItem(SYNC_RECOVERY)||'[]');
 rows.push({at:new Date().toISOString(),local,cloud:remote});
 localStorage.setItem(SYNC_RECOVERY,JSON.stringify(rows.slice(-5)));
}
function scheduleCompassSync(){
 clearTimeout(syncRuntime.timer);syncRuntime.timer=setTimeout(()=>runCompassSync(),1500);
}
function syncLocalRaw(){return localStorage.getItem(KEY)||JSON.stringify(state);}
function syncCanApply(gen,uid,raw){return gen===syncRuntime.generation&&syncRuntime.user?.uid===uid&&syncLocalRaw()===raw&&!document.querySelector('dialog[open]');}
async function runCompassSync(){
 const r=syncRuntime;if(!r.adapter||!r.user||r.busy||loadFailed)return;
 try{
  r.meta=syncMeta();if(!r.meta.enabled)return;
  if(r.meta.owner&&r.meta.owner!==r.user.uid)throw Error('以前と異なるアカウントです。元のGoogleアカウントでログインしてください。');
  if(!navigator.onLine){r.message='オフライン・この端末に保存中';refreshCompassSync();return;}
  if(document.querySelector('dialog[open]'))return;
  r.busy=true;r.message='同期を確認中';r.error='';refreshCompassSync();
  const gen=r.generation,uid=r.user.uid,local=syncLocalRaw();validate(JSON.parse(local));
  const remote=compassSyncEnvelope(await r.adapter.read(uid));
  if(!syncCanApply(gen,uid,local))return;
  const decision=compassSyncDecision(r.meta.base,local,remote.payload);
  if(decision==='setup'||decision==='conflict'){r.remote=remote;r.message=decision==='setup'?'初回のデータを選択してください':'同時変更を確認してください';return;}
  r.remote=null;
  if(decision==='upload'){
   compassSyncSize(local);await r.adapter.write(uid,remote.revision,local);
   if(gen!==r.generation||r.user?.uid!==uid)return;
   r.meta={...r.meta,owner:uid,base:local,last:new Date().toISOString()};localStorage.setItem(SYNC_KEY,JSON.stringify(r.meta));
   if(syncLocalRaw()!==local)scheduleCompassSync();
  }else{
   if(decision==='download'){
    if(remote.payload===null)throw Error('クラウドのデータがなくなっています。バックアップを確認してください。');
    syncArchive(local,remote.payload);
    const candidate=validate(JSON.parse(remote.payload));localStorage.setItem(KEY,JSON.stringify(candidate));state=candidate;
   }
   r.meta={...r.meta,owner:uid,base:remote.payload,last:new Date().toISOString()};localStorage.setItem(SYNC_KEY,JSON.stringify(r.meta));
   if(decision==='download')render();
  }
  r.message=syncLocalRaw()===r.meta.base?'同期済み':'変更を送信待ち';
 }catch(e){r.message='同期を一時停止';r.error=e.message.includes('SYNC_STALE')?'別の端末が更新しました。もう一度同期してください。':e.message;}
 finally{r.busy=false;refreshCompassSync();}
}
async function chooseSyncData(cloud){
 const r=syncRuntime;if(r.busy||!r.remote||!r.user||loadFailed)return;
 const remote=r.remote,local=syncLocalRaw(),uid=r.user.uid,gen=r.generation;
 const chosen=cloud?remote.payload:local;if(chosen===null)return;
 if(!confirm(`${cloud?'クラウド':'この端末'}のデータ全体を使います。\n${syncSummary(chosen)}\n選ばなかった記録は同期前バックアップへ保管します。続けますか？`))return;
 r.busy=true;
 try{
  const latest=compassSyncEnvelope(await r.adapter.read(uid));
  if(latest.revision!==remote.revision||!syncCanApply(gen,uid,local))throw Error('記録が更新されました。今すぐ同期で確認し直してください。');
  const candidate=validate(JSON.parse(chosen));compassSyncSize(chosen);syncArchive(local,remote.payload);
  if(!cloud)await r.adapter.write(uid,remote.revision,chosen);
  if(!syncCanApply(gen,uid,local))throw Error('操作中に端末の記録が変わりました。再確認してください。');
  if(cloud){localStorage.setItem(KEY,JSON.stringify(candidate));state=candidate;}
  r.meta={enabled:true,owner:uid,base:chosen,last:new Date().toISOString()};localStorage.setItem(SYNC_KEY,JSON.stringify(r.meta));
  r.remote=null;r.error='';r.message='同期済み';render();
 }catch(e){r.error=e.message;}
 finally{r.busy=false;refreshCompassSync();}
}
async function connectCompassSync(){
 const r=syncRuntime;if(r.connecting)return;r.connecting=true;
 try{
  if(!window.COMPASS_FIREBASE_CONFIG?.apiKey)throw Error('Firebase接続設定が未登録です');
  const m=syncMeta();localStorage.setItem(SYNC_KEY,JSON.stringify({...m,enabled:true}));
  r.message='Googleログインを準備中';refreshCompassSync();
  if(!r.adapter){const module=await import('./firebaseAdapter.js');r.adapter=module.connectFirebase(window.COMPASS_FIREBASE_CONFIG,user=>{
   r.generation++;r.user=user;r.remote=null;r.error='';r.meta=syncMeta();r.message=user?'接続済み・同期確認中':'Googleでログインしてください';refreshCompassSync();if(user)scheduleCompassSync();
  });}
  r.message='Googleでログインしてください';refreshCompassSync();
 }catch(e){r.error=e.message;r.message='同期に接続できません';refreshCompassSync();}finally{r.connecting=false;}
}
function handleCompassSync(action){
 if(!action.startsWith('sync-'))return false;
 const r=syncRuntime;
 if(action==='sync-connect')connectCompassSync();
 if(action==='sync-login'){try{const m=syncMeta();localStorage.setItem(SYNC_KEY,JSON.stringify({...m,enabled:true}));}catch(e){r.error=e.message;refreshCompassSync();return true;}r.adapter?.login().catch(e=>{r.error=e.message;refreshCompassSync();});}
 if(action==='sync-now')runCompassSync();
 if(action==='sync-use-local')chooseSyncData(false);
 if(action==='sync-use-cloud')chooseSyncData(true);
 if(action==='sync-logout'){
  if(r.busy){alert('同期処理が終わってから停止してください。');return true;}
  r.generation++;const m=syncMeta();localStorage.setItem(SYNC_KEY,JSON.stringify({...m,enabled:false}));r.remote=null;
  r.adapter?.logout().catch(e=>{r.error=e.message;refreshCompassSync();});r.message='同期を停止しました';refreshCompassSync();
 }
 if(action==='sync-recovery'){
  const raw=localStorage.getItem(SYNC_RECOVERY);if(!raw){alert('同期前バックアップはまだありません。');return true;}
  const rows=JSON.parse(raw),last=rows.at(-1);
  for(const [kind,payload]of [['local',last.local],['cloud',last.cloud]])if(payload){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));a.download=`compass-before-sync-${kind}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
 }
 return true;
}
window.addEventListener('online',()=>{try{if(syncMeta().enabled&&!syncRuntime.adapter)connectCompassSync();else scheduleCompassSync();}catch(e){syncRuntime.error=e.message;refreshCompassSync();}});
window.addEventListener('focus',scheduleCompassSync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCompassSync();});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===SYNC_KEY)scheduleCompassSync();});
setInterval(()=>{if(document.visibilityState==='visible')runCompassSync();},30000);
window.addEventListener('load',()=>{try{syncRuntime.meta=syncMeta();if(syncRuntime.meta.enabled)connectCompassSync();}catch(e){syncRuntime.error=e.message;refreshCompassSync();}});

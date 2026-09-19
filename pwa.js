'use strict';
const pwaState={prompt:null,registration:null,ready:false,error:'',updating:false,installed:window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true};
function pwaSettings(){return `<section class="panel pwa-panel" id="pwa-panel">${pwaPanelContent()}</section>`;}
function pwaPanelContent(){
  const supported=window.isSecureContext&&'serviceWorker'in navigator;
  return `<h2>ホーム画面から使う</h2><p class="pwa-status">${pwaState.installed?'アプリ表示で起動しています。':'ホーム画面に追加すると、独立した画面で開けます。'}</p>${pwaState.prompt?button('pwa-install','ホーム画面に追加','','primary'):''}<p class="pwa-help">iPhone・iPad：Safariの共有メニュー →「ホーム画面に追加」→「Webアプリとして開く」が表示される場合はON →「追加」。<br>Android・PC：ブラウザの「アプリをインストール」または「ホーム画面に追加」を選びます。</p><p class="pwa-status">${pwaState.ready?'アプリ本体のオフライン準備ができています。':supported?'初回のオンライン読み込み後、オフライン起動の準備をします。':'オフライン起動にはHTTPS（PCでの開発はlocalhost）が必要です。MacのLAN内HTTPアドレスでは準備できません。'}</p>${pwaState.error?`<p class="warning">${esc(pwaState.error)}</p>`:''}<p class="pwa-help">データは端末・ブラウザ・アクセス先ごとの保存です。別端末や別のURLへ移す場合は、設定のJSONバックアップを使ってください。外部の大学サイトはオフライン対象に含みません。</p>`;
}
function refreshPwaUi(){
  const panel=document.querySelector('#pwa-panel');if(panel)panel.innerHTML=pwaPanelContent();
  const notice=document.querySelector('#pwa-notice');if(!notice)return;
  notice.innerHTML=`${navigator.onLine?'':'<span>オフライン · この端末のデータで利用しています。</span>'}${pwaState.registration?.waiting?`<span>更新版を利用できます。</span>${button('pwa-update','更新して再読み込み')}`:''}`;
}
async function handlePwaAction(action){
  if(action==='pwa-install'&&pwaState.prompt){const event=pwaState.prompt;pwaState.prompt=null;try{await event.prompt();await event.userChoice;}catch{pwaState.error='ブラウザのメニューからホーム画面への追加をお試しください。';}refreshPwaUi();}
  if(action==='pwa-update'&&pwaState.registration?.waiting){
    if(document.querySelector('dialog[open]')){pwaState.error='入力中の内容を保存してから更新してください。';refreshPwaUi();return;}
    pwaState.updating=true;pwaState.registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  }
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pwaState.prompt=event;refreshPwaUi();});
window.addEventListener('appinstalled',()=>{pwaState.installed=true;pwaState.prompt=null;refreshPwaUi();});
window.addEventListener('online',refreshPwaUi);window.addEventListener('offline',refreshPwaUi);
window.addEventListener('load',async()=>{
  refreshPwaUi();
  if(!window.isSecureContext||!('serviceWorker'in navigator)||!['http:','https:'].includes(location.protocol))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(pwaState.updating)location.reload();else refreshPwaUi();});
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});pwaState.registration=registration;
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')refreshPwaUi();});});
    await navigator.serviceWorker.ready;pwaState.ready=true;refreshPwaUi();
  }catch{pwaState.error='オフライン準備に失敗しました。オンラインで再読み込みしてください。通常の機能は引き続き使えます。';refreshPwaUi();}
});

'use strict';
// Whole-snapshot revision control: concurrent edits are never silently merged.
function compassSyncDecision(base,local,remote){
 if(local===remote)return 'equal';
 if(base===null)return 'setup';
 if(local===base)return 'download';
 if(remote===base)return 'upload';
 return 'conflict';
}
function compassSyncEnvelope(data){
 if(!data)return {revision:0,payload:null};
 if(data.schema!==1||!Number.isSafeInteger(data.revision)||data.revision<1||typeof data.payload!=='string')throw Error('同期データの形式が不正です');
 validate(JSON.parse(data.payload));
 return {revision:data.revision,payload:data.payload};
}
function compassSyncSize(payload){
 if(new TextEncoder().encode(payload).length>900000)throw Error('同期できるデータ容量を超えています。JSONバックアップは引き続き利用できます。');
}
function persistCompassState(candidate){
 localStorage.setItem(KEY,JSON.stringify(candidate));
 if(typeof scheduleCompassSync==='function')scheduleCompassSync();
}

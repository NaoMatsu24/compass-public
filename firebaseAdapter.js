// Loaded on demand; offline app startup never depends on the Firebase CDN.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
export function connectFirebase(config,changed){
 const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,changed);
 const ref=uid=>doc(db,'users',uid,'compass','state');
 return {
  login:()=>signInWithPopup(auth,new GoogleAuthProvider()),
  logout:()=>signOut(auth),
  read:async uid=>{const s=await getDocFromServer(ref(uid));return s.exists()?s.data():null;},
  write:async(uid,expected,payload)=>runTransaction(db,async tx=>{
   if(auth.currentUser?.uid!==uid)throw Error('ログイン状態が変わりました');
   const r=ref(uid),s=await tx.get(r),revision=s.exists()?s.data().revision:0;
   if(revision!==expected)throw Error('SYNC_STALE');
   const value={schema:1,revision:revision+1,payload};tx.set(r,value);return value;
  })
 };
}

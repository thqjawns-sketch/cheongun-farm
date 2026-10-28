// Code.gs route_(b)의 const action 선언 바로 아래(다른 확장 분기보다 앞):
// const ledgerRoute=farmLedgerRoute_(b);if(ledgerRoute!==null)return ledgerRoute;
// TABLES에 추가하지 않습니다. 사육완료 초기화 대상과 분리합니다.
const FL_SHEET='사육장부';
const FL_HEADERS=['id','내용JSON','updatedAt'];
function farmLedgerRoute_(b){
 const a=String(b.action||'');
 if(a.indexOf('ledger')===0)return admin_(b,farmLedgerApi_);
 if(a==='pull'&&['ship','settings','haccp','ledger'].indexOf(String(b.page))>=0){const auth=admin_(b,()=>({ok:true}));if(!auth.ok)return auth;}
 if((a==='save'||a==='delete')&&String(b.sheet)===FL_SHEET)return{ok:false,error:'장부 전용 저장 기능을 이용해주세요.'};
 if(a==='saveShipment')return admin_(b,()=>saveShipment_(b.row||{},b));
 if((a==='save'||a==='delete')&&String(b.sheet)==='출하기록')return admin_(b,()=>a==='save'?saveOne_(b.sheet,b.row||{}):deleteOne_(b.sheet,b.id));
 return null;
}
function flSheet_(create){let s=ss_().getSheetByName(FL_SHEET);if(!s&&!create)return null;if(!s){s=ss_().insertSheet(FL_SHEET);s.getRange(1,1,1,3).setValues([FL_HEADERS]);s.setFrozenRows(1)}const h=s.getRange(1,1,1,3).getValues()[0];if(FL_HEADERS.some((x,i)=>x!==h[i]))throw Error('사육장부 시트 열 제목을 확인해주세요.');return s}
function flRows_(s){if(!s||s.getLastRow()<2)return[];return s.getRange(2,1,s.getLastRow()-1,3).getValues().filter(v=>v[0]).map(v=>{let e;try{e=JSON.parse(v[1])}catch(ignore){throw Error('장부 자료를 읽을 수 없습니다: '+v[0])}if(String(e.id)!==String(v[0]))throw Error('장부 식별값이 맞지 않습니다.');return e})}
function flDate_(x){const s=String(x||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(new Date(s+'T12:00:00Z').getTime())||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('날짜를 확인해주세요.');return s}
function flText_(x,n){return String(x==null?'':x).trim().slice(0,n)}
function flId_(x){const s=String(x||'');if(!/^[a-zA-Z0-9_-]{8,100}$/.test(s))throw Error('요청 식별값을 확인해주세요.');return s}
function flMoney_(x,zero){if(x===''||x===null||x===undefined||typeof x==='boolean')throw Error('금액을 입력해주세요.');const n=Number(x);if(!Number.isSafeInteger(n)||n<(zero?0:1)||n>999999999999)throw Error('금액은 1원~999,999,999,999원 범위의 정수로 입력해주세요.');return n}
function flPaid_(e){return(e.payments||[]).filter(p=>!p.voided).reduce((s,p)=>s+p.amount,0)}
function flEntry_(b){const r=b.entry||{},e={id:flId_(r.id),kind:String(r.kind),date:flDate_(r.date),category:flText_(r.category,40),party:flText_(r.party,80),meter:flText_(r.meter,100),billMonth:String(r.billMonth||''),amount:flMoney_(r.amount),usage:flText_(r.usage,30),memo:flText_(r.memo,1000)};if(['expense','income'].indexOf(e.kind)<0||!e.category)throw Error('수입·지출 항목을 확인해주세요.');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.billMonth))throw Error('청구월을 확인해주세요.');if(e.kind==='expense'&&e.category==='전기요금'&&!e.meter)throw Error('전기 명세서를 선택해주세요.');return e}
function flPay_(r){return{id:flId_(r.id),date:flDate_(r.date),amount:flMoney_(r.amount),voided:false}}
function farmLedgerApi_(b){
 const a=String(b.action);if(a==='ledgerList')return{ok:true,ledgerVersion:1,entries:flRows_(flSheet_(false))};
 if(['ledgerCreate','ledgerUpdate','ledgerPay','ledgerVoidPayment','ledgerVoid'].indexOf(a)<0)throw Error('지원하지 않는 장부 요청입니다.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
 const s=flSheet_(true),entries=flRows_(s),id=flId_(a==='ledgerCreate'?b.entry&&b.entry.id:b.id),index=entries.findIndex(e=>e.id===id),old=index>=0?entries[index]:null,op=flId_(b.opId);
 // 요청별 원문을 보관해 응답 유실 후 동일 요청만 중복 없이 재시도합니다.
 const request=JSON.stringify({action:a,entry:b.entry||null,payment:b.payment||null,paymentId:b.paymentId||null,expected:b.expected==null?null:b.expected});
 if(old&&old.receipts&&old.receipts[op]){if(old.receipts[op]!==request)throw Error('같은 요청번호에 다른 값이 있습니다. 새로고침 후 다시 입력해주세요.');return{ok:true,entry:old,duplicate:true}}
 let e;
 if(a==='ledgerCreate'){
  if(old)throw Error('이미 등록된 장부입니다. 새로고침 후 확인해주세요.');e=flEntry_(b);e.payments=[];
  if(b.payment){const p=flPay_(b.payment);if(p.amount>e.amount)throw Error('지급·수령 금액이 청구금액보다 큽니다.');e.payments.push(p)}e.createdAt=new Date().toISOString();e.revision=0;e.receipts={};
 }else{
  if(!old||old.voided)throw Error('삭제되었거나 없는 장부입니다.');e=JSON.parse(JSON.stringify(old));
  if(a==='ledgerPay'){
   const p=flPay_(b.payment),same=e.payments.find(x=>x.id===p.id);if(same)throw Error('이미 사용한 지급번호입니다. 새로고침 후 확인해주세요.');if(flPaid_(e)+p.amount>e.amount)throw Error('남은 금액을 초과했습니다. 새로고침 후 확인해주세요.');e.payments.push(p);
  }else{
   if(Number(b.expected)!==Number(e.revision))throw Error('다른 기기에서 수정되었습니다. 새로고침 후 다시 확인해주세요.');
   if(a==='ledgerUpdate'){const edit=flEntry_({entry:Object.assign({},b.entry,{id})});if(edit.kind!==e.kind)throw Error('수입·지출 구분은 변경할 수 없습니다.');if(edit.amount<flPaid_(e))throw Error('청구금액이 지급·수령 합계보다 작습니다. 지급 내역을 먼저 확인해주세요.');Object.assign(e,edit)}
   if(a==='ledgerVoidPayment'){const p=e.payments.find(x=>x.id===String(b.paymentId));if(!p||p.voided)throw Error('취소할 지급 내역이 없습니다.');p.voided=true;p.voidedAt=new Date().toISOString()}
   if(a==='ledgerVoid')e.voided=true;
  }
 }
 e.revision++;e.updatedAt=new Date().toISOString();e.receipts[op]=request;
 // 한 장부와 지급 이력을 하나의 셀에 함께 기록하여 청구/지급 저장 분리를 방지합니다.
 const encoded=JSON.stringify(e);if(encoded.length>45000)throw Error('이 장부의 변경 내역이 많습니다. 별도 장부로 나누어 기록해주세요.');
 if(index>=0){const vals=s.getRange(2,1,s.getLastRow()-1,3).getValues(),row=vals.findIndex(v=>String(v[0])===id)+2;s.getRange(row,1,1,3).setValues([[id,encoded,e.updatedAt]])}else s.appendRow([id,encoded,e.updatedAt]);
 SpreadsheetApp.flush();return{ok:true,entry:e};
 }finally{lock.releaseLock()}
}

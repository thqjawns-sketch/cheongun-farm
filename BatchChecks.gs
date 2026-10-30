// Code.gs route_(b)의 const action 선언 다음에 추가:
// if(action==='saveDailyChecks')return saveDailyChecks_(b);
// 기존 동별 점검과 같은 권한으로 사용합니다. TABLES·기존 기록은 변경하지 않습니다.
const BC_ITEMS=['사료 공급','급수 상태','환기 상태','온도·습도','계군 건강상태','깔짚·바닥','폐사체 처리','출입·소독 관리','시설·전기'];
function bcDate_(value){const s=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(new Date(s+'T12:00:00Z').getTime())||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('점검일을 확인해주세요.');return s}
function bcNumber_(value,min,max,name){if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='')throw Error(name+'를 입력해주세요.');const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' 범위를 확인해주세요.');return n}
function bcExisting_(rows,flockId,date,age,house){const key='CHECK-'+flockId+'-'+house+'-'+age;return rows.find(x=>String(x.id)===key||((!x['회차ID']||String(x['회차ID'])===flockId)&&Number(x['동'])===house&&(x['날짜']?String(x['날짜']).slice(0,10)===date:Number(x['일령'])===age)))}
function saveDailyChecks_(b){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  if(PropertiesService.getScriptProperties().getProperty('COMPLETING'))throw Error('사육완료 처리 중입니다. 완료 후 다시 확인해주세요.');
  const f=rows_('현재회차')[0];if(!f||String(f.id)!==String(b.flockId||''))throw Error('현재 사육 회차가 변경되었습니다. 최신자료를 받아 다시 확인해주세요.');
  const flockId=String(f.id),placement=bcDate_(String(f['입추일']).slice(0,10)),date=bcDate_(b.date),today=today_();if(date<placement||date>today)throw Error('점검일은 입추일부터 오늘 사이로 선택해주세요.');
  const age=Math.round((new Date(date+'T12:00:00Z')-new Date(placement+'T12:00:00Z'))/86400000)+1;
  const incoming=b.checks;if(!Array.isArray(incoming)||!incoming.length||incoming.length>5)throw Error('저장할 동을 선택해주세요.');
  const seen={},now=new Date().toISOString();
  // 모든 입력을 먼저 검증합니다. 한 동이라도 잘못 입력하면 아무 동도 새로 저장하지 않습니다.
  const records=incoming.map(r=>{const h=Number(r.house);if(!Number.isInteger(h)||h<1||h>5||seen[h])throw Error('1~5동을 중복 없이 선택해주세요.');seen[h]=true;const temp=bcNumber_(r.temp,-50,70,h+'동 온도'),hum=bcNumber_(r.hum,0,100,h+'동 습도'),states=r.states;if(!states||BC_ITEMS.some(item=>['정상','이상'].indexOf(states[item])<0))throw Error(h+'동의 모든 점검 항목을 확인해주세요.');const bad=BC_ITEMS.some(item=>states[item]==='이상'),detail=String(r.detail||'').trim();if(detail.length>4000)throw Error(h+'동 조치 내용이 너무 깁니다.');if(bad&&!detail)throw Error(h+'동 이상 내용과 조치사항을 입력해주세요.');return{id:'CHECK-'+flockId+'-'+h+'-'+age,회차ID:flockId,날짜:date,일령:age,동:h,온도:temp.toFixed(1),습도:hum,점검항목:BC_ITEMS.map(item=>item+':'+states[item]).join(' | '),결과:bad?'이상':'정상',내용및조치:detail,입력시간:now,updatedAt:now}});
  const existing=rows_('일일점검'),saved=[],skipped=[];
  records.forEach(row=>{const old=bcExisting_(existing,flockId,date,age,row['동']);if(old)skipped.push(Number(row['동']));else saved.push(row)});
  if(saved.length){const sheet=sheet_('일일점검'),headers=TABLES['일일점검'];if(['id','회차ID','날짜','일령','동','온도','습도','점검항목','결과','내용및조치','입력시간','updatedAt'].some(k=>headers.indexOf(k)<0))throw Error('일일점검 시트의 열 제목을 확인해주세요.');const values=saved.map(row=>headers.map(k=>{const v=norm_(row[k]);return typeof v==='string'&&/^[=+@-]/.test(v)?"'"+v:v}));sheet.getRange(sheet.getLastRow()+1,1,values.length,headers.length).setValues(values);SpreadsheetApp.flush()}
  const checks=[1,2,3,4,5].map(h=>bcExisting_(existing.concat(saved),flockId,date,age,h)).filter(Boolean);
  return{ok:true,batchChecksVersion:1,flockId,date,age,savedHouses:saved.map(r=>r['동']),skippedHouses:skipped,checks};
 }finally{lock.releaseLock()}
}

// Code.gs의 route_(b)에서 const action 선언 다음에 추가:
// if(['updateCurrentFlock','overviewReportData','overviewReportPhoto','completeOverviewPdf'].indexOf(action)>=0)return admin_(b,settingsReportApi_);
function settingsReportApi_(b){
 if(b.action==='updateCurrentFlock')return updateCurrentFlock_(b);
 if(b.action==='overviewReportData')return overviewReportData_(b);
 if(b.action==='overviewReportPhoto')return overviewReportPhoto_(b);
 if(b.action==='completeOverviewPdf')return completeOverviewPdf_(b);
 return{ok:false,error:'지원하지 않는 요청입니다.'};
}
function settingsReportRows_(){
 const f=rows_('현재회차')[0];if(!f)throw Error('현재 사육 회차가 없습니다.');
 const id=String(f.id),names=['농장정보','현재회차','계사정보','사육기록','일일점검','출하기록','첨부파일','약품기록'],data={};
 names.forEach(name=>{let r=rows_(name);if(['계사정보','사육기록','일일점검','출하기록','첨부파일'].indexOf(name)>=0)r=r.filter(x=>!x['회차ID']||String(x['회차ID'])===id);if(name==='약품기록')r=r.filter(x=>String(x['회차ID']||'')===id);data[name]=r});
 const token=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(data),Utilities.Charset.UTF_8));
 return{f,data,token};
}
function overviewReportData_(b){const s=settingsReportRows_();return{ok:true,complete:true,flockId:s.f.id,token:s.token,data:s.data}}
function overviewReportPhoto_(b){const f=rows_('현재회차')[0];if(!f||String(f.id)!==String(b.flockId))throw Error('현재 회차가 변경되었습니다.');const r=rows_('첨부파일').find(x=>String(x.id)===String(b.id)&&(!x['회차ID']||String(x['회차ID'])===String(f.id)));if(!r)throw Error('증빙사진을 찾을 수 없습니다.');const blob=DriveApp.getFileById(String(r['파일ID'])).getBlob();if(blob.getBytes().length>8*1024*1024)throw Error('증빙사진 용량이 큽니다.');return{ok:true,id:r.id,mimeType:blob.getContentType(),base64:Utilities.base64Encode(blob.getBytes())}}
function settingsWriteRows_(name,rows){const sheet=sheet_(name),headers=TABLES[name],height=Math.max(sheet.getLastRow()-1,rows.length);if(height>0){const vals=Array.from({length:height},(_,i)=>headers.map(h=>rows[i]?norm_(rows[i][h]):''));sheet.getRange(2,1,height,headers.length).setValues(vals)}}
function updateCurrentFlock_(b){
 const lock=LockService.getScriptLock();lock.waitLock(15000);try{
 if(PropertiesService.getScriptProperties().getProperty('COMPLETING'))throw Error('사육완료 처리 중입니다.');
 const currentRows=rows_('현재회차'),f=currentRows[0];if(!f||String(f.id)!==String(b.flockId))throw Error('현재 회차가 변경되었습니다. 새로고침해주세요.');
 if(String(f.updatedAt||'')!==String(b.expected||''))throw Error('다른 기기에서 수정되었습니다. 새로고침 후 다시 확인해주세요.');
 const houseRows=rows_('계사정보'),chosen=houseRows.filter(x=>String(x['회차ID'])===String(f.id));if(chosen.length!==5)throw Error('1~5동의 계사정보를 확인해주세요.');
 if(!Array.isArray(b.houseVersions)||chosen.some(x=>!b.houseVersions.some(v=>String(v.id)===String(x.id)&&String(v.updatedAt||'')===String(x.updatedAt||''))))throw Error('동별 정보가 변경되었습니다. 새로고침해주세요.');
 const nums=b.houses,fields=b.fields||{},bonus=Number(fields['덤비율']),avg=Number(fields['평균중량']);if(!Array.isArray(nums)||nums.length!==5||nums.some(n=>!Number.isInteger(n)||n<=0)||!Number.isFinite(bonus)||bonus<0||bonus>100||!Number.isFinite(avg)||avg<0)throw Error('입추수·덤 비율·중량을 확인해주세요.');
 const loss=rows_('사육기록').filter(x=>String(x['회차ID'])===String(f.id)),ships=rows_('출하기록').filter(x=>String(x['회차ID'])===String(f.id));for(let h=1;h<=5;h++){const used=loss.filter(x=>Number(x['동'])===h).reduce((s,x)=>s+Number(x['폐사']||0)+Number(x['도태']||0),0)+ships.filter(x=>Number(x['동'])===h).reduce((s,x)=>s+Number(x['출하수']||0),0);if(Math.round(nums[h-1]*(1+bonus/100))<used)throw Error(h+'동 입추수가 기존 폐사·도태·출하 합계보다 적습니다.');}
 const copy=JSON.parse(JSON.stringify(currentRows)),houseCopy=JSON.parse(JSON.stringify(houseRows)),now=new Date().toISOString();
 const allow=['덤비율','품종','평균중량','도입처','CCP점검항목','SE결과','개선조치','입추특이사항'];allow.forEach(k=>{f[k]=fields[k]==null?'':fields[k]});f.updatedAt=now;chosen.forEach(x=>{x['공식입추수']=nums[Number(x['동'])-1];x.updatedAt=now});
 try{settingsWriteRows_('계사정보',houseRows);settingsWriteRows_('현재회차',currentRows);SpreadsheetApp.flush()}catch(e){settingsWriteRows_('계사정보',houseCopy);settingsWriteRows_('현재회차',copy);SpreadsheetApp.flush();throw e}
 return{ok:true};
 }finally{lock.releaseLock()}
}
function completeOverviewPdf_(b){
 const lock=LockService.getScriptLock();lock.waitLock(15000);let pdf=null;try{
 const p=PropertiesService.getScriptProperties(),key='OVERVIEW_DONE_'+String(b.requestId||'');if(!/^[a-zA-Z0-9_-]{10,100}$/.test(String(b.requestId||'')))throw Error('저장 요청번호를 확인해주세요.');const prior=p.getProperty(key);if(prior)return JSON.parse(prior);
 if(p.getProperty('COMPLETING'))throw Error('다른 사육완료 처리가 진행 중입니다.');
 const snapshot=settingsReportRows_(),f=snapshot.f;if(String(f.id)!==String(b.flockId)||snapshot.token!==b.token)throw Error('기록이 변경되었습니다. 최신 자료로 보고서를 다시 만들어주세요.');
 const bytes=Utilities.base64Decode(String(b.base64||''));if(bytes.length<1000||bytes.length>24*1024*1024||String.fromCharCode.apply(null,bytes.slice(0,5))!=='%PDF-')throw Error('PDF 파일 확인에 실패했습니다. 자료는 초기화하지 않았습니다.');
 const names=['현재회차','계사정보','사육기록','일일점검','출하기록','첨부파일','완료보고서'],backup={};names.forEach(n=>backup[n]=rows_(n));
 p.setProperty('COMPLETING',new Date().toISOString());
 try{
  const title=safe_(((snapshot.data['농장정보']||[])[0]||{})['농장명']||'청운농장')+'_사육종합보고서_'+f.id+'.pdf';pdf=archiveFolder_().createFile(Utilities.newBlob(bytes,MimeType.PDF,title));if(pdf.getSize()!==bytes.length||pdf.getMimeType()!==MimeType.PDF)throw Error('PDF 보관 확인에 실패했습니다.');
  const archive={id:f.id,입추일:f['입추일'],종료일:today_(),품종:f['품종']||'',공식입추수:snapshot.data['계사정보'].reduce((s,x)=>s+Number(x['공식입추수']||0),0),보고서파일ID:pdf.getId(),보고서URL:pdf.getUrl(),보고서명:title,생성일:new Date().toISOString()};const archives=backup['완료보고서'].filter(x=>String(x.id)!==String(f.id));archives.push(archive);settingsWriteRows_('완료보고서',archives);
  ['계사정보','사육기록','일일점검','출하기록','첨부파일'].forEach(n=>settingsWriteRows_(n,backup[n].filter(x=>x['회차ID']&&String(x['회차ID'])!==String(f.id))));settingsWriteRows_('현재회차',backup['현재회차'].filter(x=>String(x.id)!==String(f.id)));SpreadsheetApp.flush();
  const result={ok:true,completed:true,url:pdf.getUrl(),fileId:pdf.getId(),name:title};p.setProperty(key,JSON.stringify(result));
  // PDF에 포함된 임시 증빙사진은 보관 성공 후에만 휴지통으로 이동.
  snapshot.data['첨부파일'].forEach(x=>{try{DriveApp.getFileById(String(x['파일ID'])).setTrashed(true)}catch(e){}});
  return result;
 }catch(e){names.forEach(n=>settingsWriteRows_(n,backup[n]));SpreadsheetApp.flush();if(pdf)try{pdf.setTrashed(true)}catch(ignore){}throw e}finally{p.deleteProperty('COMPLETING')}
 }finally{lock.releaseLock()}
}

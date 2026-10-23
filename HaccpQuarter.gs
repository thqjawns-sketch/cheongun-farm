// Code.gs의 route_(b) 안에서 const action 선언 바로 다음 줄에 추가:
// if(action==='haccpQuarter')return admin_(b,haccpQuarter_);
// 이 파일은 기존 시트에서 읽기만 합니다. 초기 설정을 실행하지 마세요.
function haccpQuarter_(b){
  const year=Number(b.year),quarter=Number(b.quarter),allowed=['소독방역','약품기록','교육기록'];
  if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(quarter)||quarter<1||quarter>4)return{ok:false,error:'연도와 분기를 확인해주세요.'};
  if(!Array.isArray(b.items)||!b.items.length||b.items.some(x=>allowed.indexOf(x)<0))return{ok:false,error:'출력항목을 확인해주세요.'};
  const first=(quarter-1)*3+1,last=quarter*3,start=year+'-'+String(first).padStart(2,'0')+'-01',end=year+'-'+String(last).padStart(2,'0')+'-'+new Date(year,last,0).getDate(),out={},ss=ss_();
  // 화면의 최근 100건 제한과 사육회차 필터를 사용하지 않고 분기 전체 조회.
  [...new Set(b.items)].forEach(name=>{const sheet=ss.getSheetByName(name);if(!sheet)throw Error(name+' 시트를 찾을 수 없습니다.');const values=sheet.getDataRange().getValues(),headers=values.shift()||[],key=name==='교육기록'?'교육일':'날짜';if(headers.indexOf(key)<0)throw Error(name+' 날짜 항목을 찾을 수 없습니다.');out[name]=values.filter(r=>r.some(v=>v!=='')).map(r=>{const row={};headers.forEach((h,i)=>{if(h)row[String(h)]=ser_(r[i])});return row}).filter(r=>{const d=String(r[key]||'').slice(0,10);return d>=start&&d<=end}).sort((a,b)=>String(a[key]).localeCompare(String(b[key]))||String(a['입력시간']||'').localeCompare(String(b['입력시간']||'')))});
  const farmSheet=ss.getSheetByName('농장정보'),farm={};if(farmSheet&&farmSheet.getLastRow()>1){const v=farmSheet.getRange(1,1,2,farmSheet.getLastColumn()).getValues();v[0].forEach((h,i)=>{if(h)farm[String(h)]=ser_(v[1][i])})}
  return{ok:true,complete:true,year,quarter,start,end,data:out,farm};
}

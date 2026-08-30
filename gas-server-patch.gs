// 코드.gs에서 기존 doGet 함수를 아래 함수로 교체하세요.
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('청운농장 육계 사육관리')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

// 코드.gs 맨 아래에 이 함수를 추가하세요.
function apiRequest(payloadText) {
  const body = JSON.parse(payloadText || '{}');
  if (!verifyPassword_(String(body.password || ''))) return {ok:false, error:'비밀번호가 맞지 않습니다.'};
  if (body.action === 'login') return {ok:true, farmName:FARM_NAME};
  if (body.action === 'pull') return {ok:true, data:pullAll_(), serverTime:new Date().toISOString()};
  if (body.action === 'push') return pushOperations_(body.operations || []);
  return {ok:false, error:'지원하지 않는 요청입니다.'};
}

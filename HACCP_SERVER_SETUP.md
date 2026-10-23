# HACCP 분기별 출력 서버 연결

기존 Code.gs를 교체하거나 최초 설정을 실행하지 않습니다.

1. Apps Script에서 새 스크립트 파일 `HaccpQuarter`를 만들고 같은 저장소의 `HaccpQuarter.gs` 내용을 붙여넣습니다.
2. 기존 Code.gs의 `function route_(b)` 안에서 `const action=String(b.action||'');` 바로 다음 줄에 아래 한 줄을 추가합니다.

```javascript
if(action==='haccpQuarter')return admin_(b,haccpQuarter_);
```

3. 저장 후 배포 관리 → 기존 웹앱 편집 → 새 버전으로 배포합니다. 기존 웹앱 주소를 유지합니다.
4. 앱에서 HACCP → 분기별 기록 출력 → 연도·분기·항목 선택 → 미리보기를 확인합니다.
5. PDF 저장·인쇄는 브라우저 인쇄 창의 PDF로 저장을 사용합니다. 앱·드라이브에 보고서 파일을 만들지 않습니다.

이 기능은 기존 시트의 전체 행을 읽어 분기 날짜로 조회합니다. 최근 100건 제한 및 현재 회차 제한을 사용하지 않습니다. 관리자 확인은 기존 admin_ 함수를 사용합니다. 초기화·삭제·새 권한 추가가 없습니다.

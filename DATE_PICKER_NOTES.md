# v2.9.2 공통 날짜 선택

앱의 날짜·월·조회연도 입력을 공통 선택창으로 통일했습니다. Apps Script 변경이나 재배포는 필요 없습니다.

- 연도: 한 화면의 연도 버튼 또는 직접 입력. 월: 1~12월 버튼. 일: 해당 월 달력에서 직접 선택.
- 날짜 입력은 월 목록을 먼저 보여주어 과거 월로 바로 이동합니다. 월을 고르면 일 선택으로 이동합니다.
- 날짜·월·연도만 필요한 입력은 각각 알맞은 항목만 표시합니다.
- 오늘·이번 달·올해 바로 선택 및 기존 입력의 비우기 동작을 지원합니다.
- 취소·닫기·휴대폰 뒤로가기는 값 변경 없이 선택창만 닫습니다.
- 윤년·월별 말일 및 기존 입력의 최소·최대 범위를 지킵니다.
- 입추일 등 원래 읽기 전용인 항목은 수정 가능하게 바꾸지 않습니다.
- 선택 확정 때만 기존 input의 ISO 값과 input/change 이벤트로 전달합니다. 장부의 지급 건별 날짜·변경 이력·집계는 기존 기능을 사용합니다.
- HACCP 연결 기록에서 날짜가 자동으로 채워지거나 저장 실패 후 입력이 잠기면 표시 버튼도 함께 동기화합니다.

## 검증

독립 가상자료 검수 화면: `review-fast-dates.html`. 실제 농장 API와 연결하지 않습니다.

Node 22+ 및 jsdom 26 환경에서:

```
node test-date-picker.cjs index.html
node test-date-picker-forms.cjs
node test-ledger-dates.cjs FarmLedger.gs index.html
node test-page-header.cjs index.html
node test-check-view.cjs index.html
```

실제 앱 양식 22개의 날짜·월·연도 입력, 취소 시 원본 보존, 윤년, min/max, 프로그램 자동 입력, 저장 중 잠금, 뒤로가기, 잘못된 날짜 방지 및 장부 저장·집계 회귀를 검증했습니다.

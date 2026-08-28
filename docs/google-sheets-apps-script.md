# Google Sheets 연동 가이드

기준 날짜: 2026-08-28

`캠페인 신청하기` 버튼으로 아래 시트에 한 줄씩 적재하려면 Google Apps Script 웹앱을 중간에 두는 방식이 가장 간단합니다.

대상 시트:
`https://docs.google.com/spreadsheets/d/1V1476ZgCyUd8q0DB-8rSp6mi_Q4PRHAwYbU8UoZEhSU/edit?gid=1621616972#gid=1621616972`

시트 컬럼 순서:

1. `캠페인 명`
2. `시작일`
3. `종료일`
4. `채널`
5. `구분`
6. `쿠폰`
7. `타겟`
8. `부서`
9. `담당자`

## 1. Apps Script 코드

구글시트에서 `확장 프로그램 > Apps Script`로 들어간 뒤 아래 코드를 붙여넣습니다.

```javascript
function doPost(e) {
  const SHEET_ID = '1V1476ZgCyUd8q0DB-8rSp6mi_Q4PRHAwYbU8UoZEhSU';
  const SHEET_NAME = '시트1';

  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.cmpgnNm || '',
      data.startDate || '',
      data.endDate || '',
      data.channel || '',
      data.category || '',
      data.coupon || '',
      data.target || '',
      data.department || '',
      data.owner || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

`SHEET_NAME`은 실제 탭 이름으로 바꿔야 합니다.

## 2. 배포 방법

1. Apps Script 화면 우측 상단 `배포 > 새 배포`를 누릅니다.
2. 유형은 `웹 앱`을 선택합니다.
3. 설명은 예: `campaign request append`
4. 실행 사용자: `나`
5. 액세스 권한:
   `링크가 있는 모든 사용자`
   또는 조직 정책에 맞는 공개 범위
6. 배포 후 생성된 `웹 앱 URL`을 복사합니다.

이 URL은 보통 `https://script.google.com/macros/s/.../exec` 형태입니다.

## 3. 현재 페이지에 연결하는 위치

[public/report.html](/Users/yukyungcho/Documents/vs code 연동/playground-cmpgn-1/public/report.html) 안에서 아래 상수를 찾습니다.

```javascript
const APPS_SCRIPT_URL = '';
```

여기에 배포된 웹앱 URL을 넣으면 됩니다.

예:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec';
```

## 4. 현재 페이지 동작 방식

지금 버튼 클릭 시 2곳으로 저장되도록 준비되어 있습니다.

1. 로컬 백엔드 JSON 저장
   `[server/data/applications.json](/Users/yukyungcho/Documents/vs code 연동/playground-cmpgn-1/server/data/applications.json)`
2. Apps Script URL이 비어 있지 않으면 구글시트에도 append

즉, URL만 넣으면 같은 버튼으로 로컬 저장 + 구글시트 적재가 같이 됩니다.

## 5. 프런트에서 보내는 데이터 예시

```json
{
  "cmpgnNm": "B tv+ 12개월 50% 할인",
  "startDate": "2026-09-01",
  "endDate": "2026-09-30",
  "channel": "토스트팝업",
  "category": "일회성",
  "coupon": "쿠폰",
  "target": "100000",
  "department": "B tv플러스팀",
  "owner": "조유경"
}
```

## 6. 자주 막히는 지점

1. Apps Script 배포는 했지만 권한 범위가 좁아서 403이 나는 경우
2. `SHEET_NAME`이 실제 탭명과 달라 append가 실패하는 경우
3. 브라우저 캐시 때문에 예전 `report.html`이 남아 있는 경우

페이지 반영 확인 링크:
`http://localhost:5174/campaign-dashboard0-v2-4/report.html#calendar`

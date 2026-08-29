const SHEET_ID = '1V1476ZgCyUd8q0DB-8rSp6mi_Q4PRHAwYbU8UoZEhSU';
const SHEET_NAME = 'new_dashboard';

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function targetSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('탭을 찾을 수 없습니다: ' + SHEET_NAME);
  return sheet;
}

function doGet() {
  return json_({ ok: true, sheet: targetSheet_().getName() });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('POST 데이터가 없습니다.');
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'updateExecution') {
      const rowNumber = Number(data.rowNumber);
      if (!Number.isInteger(rowNumber) || rowNumber < 2 || !data.executionAt) {
        throw new Error('행 번호와 실행시각이 필요합니다.');
      }
      const sheet = targetSheet_();
      sheet.getRange(rowNumber, 10).setValue(data.executionAt);
      sheet.getRange(rowNumber, 13).setValue('배정 완료');
      sheet.getRange(rowNumber, 14).setValue(new Date().toISOString());
      return json_({ ok: true, updatedRow: rowNumber });
    }
    const row = [
      data.cmpgnNm || '', data.startDate || '', data.endDate || '', data.channel || '',
      data.category || '', data.coupon || '', data.target || '', data.department || '',
      data.owner || '', ''
    ];
    if (!row[0] || !row[1] || !row[2] || !row[3] || !row[8]) {
      throw new Error('캠페인명, 시작일, 종료일, 채널, 담당자는 필수입니다.');
    }
    targetSheet_().appendRow(row);
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  }
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');

const app = express();
const port = process.env.APP_PORT || 3000;
const host = process.env.APP_HOST || '0.0.0.0';
const publicPath = path.join(__dirname, 'public');
const calendarCachePath = path.join(__dirname, '.calendar-cache');
const calendarSnapshotPath = path.join(__dirname, 'data');
const calendarSyncIntervalMs = Math.max(Number(process.env.CALENDAR_SYNC_INTERVAL_MS) || 300000, 60000);
const calendarRuntimeSyncEnabled = process.env.CALENDAR_RUNTIME_SYNC_ENABLED === 'true';
const calendarSources = {
  calendar: {
    url: process.env.CALENDAR_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJDqgcPmC1RsB_57OgHxXZ9uqKNiGDICkSKqftjk6CbflfyhVWA2G0LrqLBwuQtTNsffKBtc-aKbD0/pub?output=csv',
    file: path.join(calendarCachePath, 'calendar.csv'),
    snapshotFile: path.join(calendarSnapshotPath, 'calendar.csv')
  },
  requestHistory: {
    url: process.env.CALENDAR_REQUEST_HISTORY_CSV_URL || 'https://docs.google.com/spreadsheets/d/1BdzZj8Rr-9Twi7seNBGLomHm1FH__Rc-OtLEdTGyLmA/gviz/tq?tqx=out:csv&gid=1998435625',
    file: path.join(calendarCachePath, 'request-history.csv'),
    snapshotFile: path.join(calendarSnapshotPath, 'request-history.csv')
  }
};
const calendarSyncState = Object.fromEntries(Object.keys(calendarSources).map((key) => [key, {
  lastSuccessAt: null,
  lastAttemptAt: null,
  lastError: null,
  syncing: false
}]));

function downloadText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'campaign-dashboard-calendar-sync/1.0' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirectCount >= 5) return reject(new Error('Google Sheets redirect limit exceeded'));
        return resolve(downloadText(new URL(response.headers.location, url).toString(), redirectCount + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Google Sheets returned HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    request.setTimeout(20000, () => request.destroy(new Error('Google Sheets request timed out')));
    request.on('error', reject);
  });
}

async function syncCalendarSource(key) {
  const source = calendarSources[key];
  const state = calendarSyncState[key];
  if (!source || state.syncing) return;
  state.syncing = true;
  state.lastAttemptAt = new Date().toISOString();
  try {
    const csv = await downloadText(source.url);
    if (!csv.trim()) throw new Error('Google Sheets returned empty CSV');
    fs.mkdirSync(calendarCachePath, { recursive: true });
    const temporaryFile = `${source.file}.tmp`;
    fs.writeFileSync(temporaryFile, csv, 'utf8');
    fs.renameSync(temporaryFile, source.file);
    state.lastSuccessAt = new Date().toISOString();
    state.lastError = null;
    console.log(`[calendar-sync] ${key} updated at ${state.lastSuccessAt}`);
  } catch (error) {
    state.lastError = error.message;
    console.error(`[calendar-sync] ${key} failed: ${error.message}`);
  } finally {
    state.syncing = false;
  }
}

async function syncCalendarSources() {
  await Promise.all(Object.keys(calendarSources).map(syncCalendarSource));
}

function sendCalendarCsv(req, res, key) {
  const source = calendarSources[key];
  const dataFile = calendarRuntimeSyncEnabled && fs.existsSync(source.file)
    ? source.file
    : source.snapshotFile;
  if (!fs.existsSync(dataFile)) {
    return res.status(503).json({
      error: 'calendar_cache_unavailable',
      message: '캘린더 스냅샷 데이터가 없습니다. 외부 배치 동기화를 실행해주세요.',
      sync: calendarSyncState[key]
    });
  }
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Calendar-Data-Source': dataFile === source.snapshotFile ? 'repository-snapshot' : 'runtime-cache',
    'X-Calendar-Last-Sync': calendarSyncState[key].lastSuccessAt || fs.statSync(dataFile).mtime.toISOString()
  });
  res.send(fs.readFileSync(dataFile, 'utf8'));
}
function resolveCampaignDataPath() {
  const candidates = fs.readdirSync(__dirname)
    .filter((name) => /^cmpgn_tmp_\d{4}(?: \(\d+\))?\.csv$/i.test(name))
    .map((name) => ({ path: path.join(__dirname, name), modified: fs.statSync(path.join(__dirname, name)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified);

  if (!candidates.length) throw new Error('CMPGN_TMP_0000.csv 형식의 캠페인 파일을 찾을 수 없습니다.');
  return candidates[0].path;
}
function resolveToastDataPath() {
  const candidates = fs.readdirSync(__dirname)
    .filter((name) => /^cmpgn_toast_tmp_\d{4}(?: \(\d+\))?\.csv$/i.test(name))
    .map((name) => ({ path: path.join(__dirname, name), modified: fs.statSync(path.join(__dirname, name)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified);
  return candidates[0]?.path || null;
}
function resolvePopupDataPath() {
  const candidates = fs.readdirSync(__dirname)
    .filter((name) => /^cmpgn_popup_(?:tmp_)?\d{4}(?: \(\d+\))?\.csv$/i.test(name))
    .map((name) => ({ path: path.join(__dirname, name), modified: fs.statSync(path.join(__dirname, name)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified);
  return candidates[0]?.path || null;
}
function resolveCouponDailyDataPath() {
  const candidates = fs.readdirSync(__dirname)
    .filter((name) => /^cmpgn_(?:copn|toast)_tmp_\d{4}(?: \(\d+\))?\.csv$/i.test(name))
    .map((name) => ({ path: path.join(__dirname, name), modified: fs.statSync(path.join(__dirname, name)).mtimeMs }))
    .sort((a, b) => b.modified - a.modified);
  return candidates[0]?.path || null;
}
// 일반 웹 배포에서는 루트(/)를 사용하고, 하위 경로 배포가 필요한 경우에만 BASE_PATH를 지정한다.
const basePath = String(process.env.BASE_PATH || '').trim().replace(/\/+$/, '');

const router = express.Router();

function number(value) {
  const parsed = Number(String(value ?? '').replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferMonth(name) {
  const text = String(name || '');
  const explicit = text.match(/(?:20)?(\d{2})년[^0-9]{0,4}(\d{1,2})월/);
  if (explicit) return `20${explicit[1]}-${explicit[2].padStart(2, '0')}`;

  const monthOnly = text.match(/(?:^|[_\s(])(\d{1,2})월/);
  return monthOnly ? `2026-${monthOnly[1].padStart(2, '0')}` : '2026-07';
}

function classifyProduct(campaignName, couponName) {
  const text = `${campaignName} ${couponName}`;
  if (/월정액|정기|B\s*tv\+/i.test(text)) return { type: 'PPM', product: '월정액' };
  if (/영화|무비|VOD|PPV|콘서트|시리즈/i.test(text)) return { type: 'PPV', product: 'PPV 콘텐츠' };
  return { type: '기타', product: '기타 캠페인' };
}

function transformCampaignRecords(records) {
  return records.flatMap((record) => {
    const campaign = record.cmpgn_nm || record.cmpgn_id || '캠페인명 없음';
    const hasCoupon = Boolean(record.copn_plcy_num && record.copn_plcy_num !== 'DummyOffer');
    const coupon = hasCoupon
      ? (record.copn_plcy_nm && record.copn_plcy_nm !== '-' ? record.copn_plcy_nm : record.copn_plcy_num)
      : '쿠폰 없음';
    const classification = classifyProduct(campaign, coupon);
    const productName = String(record.prod_nm || '').trim() || 'PPV외';
    const common = {
      month: inferMonth(campaign),
      campaignId: record.cmpgn_id || '',
      campaign,
      product: productName,
      coupon,
      couponPolicyId: record.copn_plcy_num || '',
      type: classification.type
    };

    const channelRow = (prefix, channel, includeCoupon) => ({
      ...common,
      channel,
      target: number(record[`${prefix}_cmpgn_cnt`]),
      exposed: number(record[`${prefix}_show_cnt`]),
      click: number(record[`${prefix}_click_cnt`]),
      shortcut: number(record[`${prefix}_go_cnt`]),
      close: number(record[`${prefix}_exit_cnt`]),
      couponIssued: includeCoupon && hasCoupon ? number(record.cmpgn_svc_cnt) : 0,
      couponUsed: includeCoupon && hasCoupon ? number(record.copn_use_cnt) : 0
    });

    return [
      channelRow('toast', '토스트팝업', true),
      channelRow('smart', '스마트알림', false)
    ];
  });
}
function isYes(value) {
  return /^(?:y|yes|1|true)$/i.test(String(value ?? '').trim());
}
function transformToastRecords(records) {
  return records.map((record) => {
    const digits = String(record.toast_dt || '').replace(/\D/g, '');
    const year = digits.length >= 8 ? digits.slice(0, 4) : '';
    const month = digits.length >= 8 ? digits.slice(4, 6) : '';
    const day = digits.length >= 8 ? number(digits.slice(6, 8)) : 0;
    return {
      campaignId: record.cmpgn_id || '',
      campaign: record.cmpgn_nm || record.cmpgn_id || '\uCEA0\uD398\uC778\uBA85 \uC5C6\uC74C',
      month: year && month ? year + '-' + month : '',
      day,
      target: isYes(record.toast_yn) ? 1 : 0,
      exposed: isYes(record.toast_show_yn) ? 1 : 0,
      response: isYes(record.toast_click_yn) ? 1 : 0,
      shortcut: isYes(record.toast_go_yn) ? 1 : 0,
      close: isYes(record.toast_exit_yn) ? 1 : 0
    };
  }).filter((record) => record.month && record.day >= 1 && record.day <= 31);
}
function popupProductName(productId) {
  const names = {
    PM30000107: 'B tv+',
    PM30000150: '지상파3사',
    PM30000154: 'CJ ENM',
    PM30000269: 'JTBC 월정액',
    PM30000176: '19월정액',
    PM3500007: 'SPOTV 프라임',
    PM35000007: 'SPOTV 프라임'
  };
  return names[productId] || productId || '상품 없음';
}
function transformPopupRecords(records, campaignRecords) {
  const couponNameByPolicy = new Map();
  [...campaignRecords, ...records].forEach((record) => {
    const policyId = record.copn_plcy_num || record.cmpgn_ofer_id || '';
    const couponName = String(record.copn_plcy_nm || '').trim();
    if (policyId && policyId !== 'DummyOffer' && couponName && couponName !== '-') couponNameByPolicy.set(policyId, couponName);
  });
  return records.map((record) => {
    const digits = String(record.pt_dt || '').replace(/\D/g, '');
    const channelCode = String(record.cl || '').trim().toUpperCase();
    const couponPolicyId = record.cmpgn_ofer_id || '';
    return {
      campaignId: record.cmpgn_id || '',
      campaign: record.cmpgn_nm || record.cmpgn_id || '\uCEA0\uD398\uC778\uBA85 \uC5C6\uC74C',
      couponPolicyId,
      policyStart: record.copn_plcy_sta_dt || '',
      policyEnd: record.copn_plcy_end_dt || '',
      product: popupProductName(record.cnts_prod_id),
      coupon: couponPolicyId === 'DummyOffer' ? '\uCFE0\uD3F0 \uC5C6\uC74C' : (record.copn_plcy_nm || couponNameByPolicy.get(couponPolicyId) || '\uCFE0\uD3F0\uBA85 \uBBF8\uB4F1\uB85D'),
      month: digits.length >= 8 ? digits.slice(0, 4) + '-' + digits.slice(4, 6) : '',
      day: digits.length >= 8 ? number(digits.slice(6, 8)) : 0,
      channel: channelCode === 'TOAST' ? '\uD1A0\uC2A4\uD2B8\uD31D\uC5C5' : channelCode === 'SMART' ? '\uC2A4\uB9C8\uD2B8\uC54C\uB9BC' : '',
      response: number(record.cnt ?? record.cell_node_id)
    };
  }).filter((record) => record.channel && record.month && record.day >= 1 && record.day <= 31);
}
function transformCouponDailyRecords(records) {
  return records.map((record) => {
    const digits = String(record.copn_use_sta_dt || '').replace(/\D/g, '');
    const couponPolicyId = record.cmpgn_ofer_id || '';
    return {
      campaignId: record.cmpgn_id || '',
      campaign: record.cmpgn_nm || record.cmpgn_id || '\uCEA0\uD398\uC778\uBA85 \uC5C6\uC74C',
      couponPolicyId,
      coupon: record.copn_plcy_nm || '\uCFE0\uD3F0\uBA85 \uBBF8\uB4F1\uB85D',
      product: popupProductName(record.cnts_prod_id),
      policyStart: record.copn_plcy_sta_dt || '',
      policyEnd: record.copn_plcy_end_dt || '',
      month: digits.length >= 8 ? digits.slice(0, 4) + '-' + digits.slice(4, 6) : '',
      day: digits.length >= 8 ? number(digits.slice(6, 8)) : 0,
      response: number(record.copn_cnt)
    };
  }).filter((record) => record.month && record.day >= 1 && record.day <= 31);
}
router.use(express.static(publicPath));

router.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/api/info', (req, res) => {
  res.json({
    app: process.env.APP_NAME || 'Campaign Performance Dashboard',
    version: '1.0.0',
    environment: process.env.APP_ENV || 'development',
    basePath,
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

router.get('/api/calendar', (req, res) => sendCalendarCsv(req, res, 'calendar'));

router.get('/api/calendar/request-history', (req, res) => sendCalendarCsv(req, res, 'requestHistory'));

router.get('/api/calendar/sync-status', (req, res) => {
  res.json({ runtimeSyncEnabled: calendarRuntimeSyncEnabled, intervalMs: calendarSyncIntervalMs, sources: calendarSyncState });
});

router.get('/api/campaigns', (req, res, next) => {
  try {
    const csv = iconv.decode(fs.readFileSync(resolveCampaignDataPath()), 'euc-kr');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    const couponDailyPath = resolveCouponDailyDataPath();
    const couponDailyRecords = couponDailyPath
      ? parse(iconv.decode(fs.readFileSync(couponDailyPath), 'euc-kr'), { columns: true, skip_empty_lines: true, trim: true })
      : [];
    const popupPath = resolvePopupDataPath();
    const popupRecords = popupPath
      ? parse(iconv.decode(fs.readFileSync(popupPath), 'euc-kr'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
      : [];
    const toastPath = resolveToastDataPath();
    const toastRecords = toastPath
      ? parse(iconv.decode(fs.readFileSync(toastPath), 'euc-kr'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
      : [];
    res.json({
      rows: transformCampaignRecords(records),
      toastDailyRows: transformToastRecords(toastRecords),
      popupDailyRows: transformPopupRecords(popupRecords, records),
      couponDailyRows: transformCouponDailyRecords(couponDailyRecords)
    });
  } catch (error) {
    next(error);
  }
});

app.use(basePath || '/', router);

let calendarSyncTimer = null;
if (calendarRuntimeSyncEnabled) {
  syncCalendarSources();
  calendarSyncTimer = setInterval(syncCalendarSources, calendarSyncIntervalMs);
  calendarSyncTimer.unref();
}

if (require.main === module) {
  const server = app.listen(port, host, () => {
    console.log(`Campaign Dashboard listening on port ${port}`);
    console.log(`Host: ${host}`);
    console.log(`Base Path: ${basePath}`);
    console.log(`Environment: ${process.env.APP_ENV || 'development'}`);
  });

  process.on('SIGTERM', () => {
    if (calendarSyncTimer) clearInterval(calendarSyncTimer);
    server.close(() => process.exit(0));
  });
}

module.exports = app;

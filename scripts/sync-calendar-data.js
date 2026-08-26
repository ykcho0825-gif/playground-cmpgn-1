const fs = require('fs');
const https = require('https');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..');
const dataDirectory = path.join(repositoryRoot, 'data');
const sources = [
  {
    name: 'calendar',
    url: process.env.CALENDAR_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJDqgcPmC1RsB_57OgHxXZ9uqKNiGDICkSKqftjk6CbflfyhVWA2G0LrqLBwuQtTNsffKBtc-aKbD0/pub?output=csv',
    target: path.join(dataDirectory, 'calendar.csv')
  },
  {
    name: 'request-history',
    url: process.env.CALENDAR_REQUEST_HISTORY_CSV_URL || 'https://docs.google.com/spreadsheets/d/1BdzZj8Rr-9Twi7seNBGLomHm1FH__Rc-OtLEdTGyLmA/gviz/tq?tqx=out:csv&gid=1998435625',
    target: path.join(dataDirectory, 'request-history.csv')
  }
];

function download(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'campaign-dashboard-snapshot-sync/1.0' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirectCount >= 5) return reject(new Error('Redirect limit exceeded'));
        return resolve(download(new URL(response.headers.location, url).toString(), redirectCount + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    request.setTimeout(30000, () => request.destroy(new Error('Request timed out')));
    request.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const downloads = [];
  for (const source of sources) {
    const content = await download(source.url);
    const preview = content.toString('utf8', 0, Math.min(content.length, 200));
    if (content.length < 10 || !preview.includes(',')) {
      throw new Error(`${source.name} did not return valid CSV data`);
    }
    downloads.push({ source, content });
  }
  for (const { source, content } of downloads) {
    const temporaryFile = `${source.target}.tmp`;
    fs.writeFileSync(temporaryFile, content);
    fs.renameSync(temporaryFile, source.target);
    console.log(`[snapshot-sync] ${source.name}: ${content.length} bytes`);
  }
}

main().catch((error) => {
  console.error(`[snapshot-sync] failed: ${error.message}`);
  process.exitCode = 1;
});

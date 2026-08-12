$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repositoryRoot

git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Could not update the local main branch.' }

node --use-system-ca (Join-Path $PSScriptRoot 'sync-calendar-data.js')
if ($LASTEXITCODE -ne 0) { throw 'Google Sheets snapshot synchronization failed.' }

$changed = git status --porcelain -- data/calendar.csv data/request-history.csv
if (-not $changed) {
  Write-Output '[snapshot-sync] No data changes.'
  exit 0
}

git add -- data/calendar.csv data/request-history.csv
git commit -m 'Update calendar snapshot'
if ($LASTEXITCODE -ne 0) { throw 'Snapshot commit failed.' }

git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Snapshot push failed.' }

Write-Output '[snapshot-sync] Snapshot committed and pushed.'

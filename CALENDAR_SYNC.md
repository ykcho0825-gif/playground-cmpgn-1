# Calendar snapshot synchronization

The intranet dashboard reads committed CSV snapshots from `data/` and does not
need direct access to Google. A Windows PC that can access both Google Sheets
and the internal GitLab acts as the synchronization bridge.

## Manual synchronization

Run from PowerShell:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\sync-calendar-and-push.ps1
```

The script downloads both CSV files, validates them, commits changes, and pushes
the `main` branch. If downloaded data is invalid, existing snapshots remain
unchanged.

## Windows Task Scheduler

Register the prepared tasks under the GitLab-authenticated Windows account:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\install-calendar-sync-tasks.ps1
```

This creates two tasks:

- Every 30 minutes from 09:00 through 17:30
- A final daily synchronization at 18:00

The PC must be running and must have access to both Google and the internal
GitLab when the task starts.

## Optional runtime synchronization

Runtime Google access is disabled by default. Set
`CALENDAR_RUNTIME_SYNC_ENABLED=true` only where the server may access Google.

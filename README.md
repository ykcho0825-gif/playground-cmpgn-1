# Campaign Performance Dashboard

기존 Playground 화면과 CSV 데이터 가공 로직을 그대로 사용하는 일반 Node.js/Express 웹 애플리케이션입니다. 기본 배포 경로는 도메인의 루트(`/`)입니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm ci
npm start
```

실행 후 `http://localhost:3000`에서 확인할 수 있습니다.

## Docker로 실행

```bash
docker build -t campaign-dashboard .
docker run --rm -p 3000:3000 --env-file .env campaign-dashboard
```

`.env.example`을 `.env`로 복사해 필요한 값을 조정하세요. Docker, Render, Railway, Fly.io, AWS, Azure, GCP 등 콘테이너를 실행할 수 있는 일반 웹 호스팅에 동일하게 배포할 수 있습니다.

## 주요 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `APP_PORT` | `3000` | 웹 서버 포트 |
| `APP_ENV` | `development` | 실행 환경 표시 |
| `APP_NAME` | `Campaign Performance Dashboard` | API에 표시할 앱 이름 |
| `BASE_PATH` | 빈 값 | 하위 경로에 배포할 때만 설정 |
| `CALENDAR_RUNTIME_SYNC_ENABLED` | `false` | Google Sheets 실시간 동기화 여부 |
| `CALENDAR_SYNC_INTERVAL_MS` | `300000` | 동기화 주기(ms), 최소 60000 |

## 운영 확인

- 메인 화면: `/`
- 상태 확인: `/health`
- 캠페인 API: `/api/campaigns`
- 캘린더 CSV: `/api/calendar`

운영 중 실시간 캘린더 동기화를 켜면 서버에서 Google Sheets로의 외부 HTTPS 통신을 허용해야 합니다. 끄면 저장소의 `data/` 스냅샷을 사용합니다.

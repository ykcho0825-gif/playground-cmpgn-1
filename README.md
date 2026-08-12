# campaign-dashboard-v2-3

Express (Node.js) 기반의 백엔드 애플리케이션입니다.

## 바로가기

- [Playground 앱 상세 페이지](https://playground.skbroadband.com/apps/web-services/default/campaign-dashboard-v2-3)
- [배포된 앱](https://pg-apps.skbroadband.com/campaign-dashboard-v2-3)

---

## 🔗 마이크로서비스 통신 가이드 (내부 네트워크)

Kubernetes 내부 네트워크에서 다른 앱이 **현재 생성된 이 앱(campaign-dashboard-v2-3)**에 접근할 때 사용하는 내부 DNS 주소입니다.

| 접근 주체 | 연결 주소(URL) |
| :--- | :--- |
| **같은 프로젝트(team-campaign-dashboard-v2) 내의 다른 앱** | `http://dev-campaign-dashboard-v2-3:8080` |
| **타 프로젝트(Namespace)의 다른 앱** | `http://dev-campaign-dashboard-v2-3.team-campaign-dashboard-v2.svc.cluster.local:8080` |

> 💡 **환경별 서비스명 접두사 (Prefix)**
> 배포 환경에 따라 서비스 이름 앞에 환경 이름이 붙습니다. 
> - 개발(Dev) 환경: `dev-campaign-dashboard-v2-3`
> - 운영(Prod) 환경: `campaign-dashboard-v2-3` (접두사 없음)
> - 기타 환경: `{환경명}-campaign-dashboard-v2-3`

### ⚙️ Kubernetes 추천 세팅 가이드
* **환경 변수(Env) 활용:** 다른 앱의 URL이나 DB 접속 정보는 소스코드에 하드코딩하지 말고, 플랫폼의 **Secret Manager**를 통해 환경 변수로 주입받도록 구성하세요 (`process.env.DB_HOST` 등 활용).
* **Health Check API:** Kubernetes가 앱의 상태를 주기적으로 체크할 수 있도록, 상태 반환 엔드포인트(예: `GET /health`)를 열어두는 것이 무중단 배포 안정성에 도움이 됩니다.
* **Graceful Shutdown:** SIGTERM 신호를 받았을 때 진행 중인 요청을 안전하게 마무리하고 종료되도록 코드를 작성하는 것을 권장합니다.

---

## 로컬 실행 가이드

```bash
npm install
npm run start
```

## VSCode Server에서 미리보기

웹 IDE(code-server)에서 dev 서버는 sub-path(`/<워크스페이스>/absproxy/<port>`)로 노출됩니다.
링크·정적자산이 깨지지 않게 그 경로를 `BASE_PATH`로 알려줘야 하며, 워크스페이스에 사전 설치된
`dev-preview`가 자동 처리합니다.

**방법 1 — `dev-preview` (권장)**: 포트와 실행명령만 주면 base path를 자동 주입합니다.

```bash
dev-preview 3000 npm run start
```

**방법 2 — 직접 설정**: 헬퍼 없이, 프리뷰 주소창의 **전체 경로**를 `BASE_PATH`로 지정합니다.

```bash
BASE_PATH=/<워크스페이스>/absproxy/3000 npm run start
```

- **prod 배포 시엔 미설정** — `SERVICE_NAME` 기반 경로가 자동 적용됩니다
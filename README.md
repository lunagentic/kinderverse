# verse

채팅으로 콘텐츠를 생성하는 **무한 보드** 협업 서비스 프로토타입.
피그마처럼 팬·줌 되는 캔버스 위에, 우측 채팅으로 **문서 · 이미지 · 디자인 템플릿**을 생성·배치·편집합니다.

## 주요 기능

- 무한 캔버스: 스크롤=이동, ⌘/Ctrl+스크롤=확대/축소, 빈 곳 드래그=이동
- 채팅 생성: 프롬프트 의도를 분석해 알맞은 콘텐츠 타입을 보드에 생성
  - 문서(`document`) — 제목 + 본문, "체크리스트/목록" 감지 시 `□` 리스트로 생성
  - 이미지(`image`) — (목업) SVG 그라데이션 플레이스홀더
  - 디자인 템플릿(`template`) — 제목/부제/색상 편집 가능한 카드
- 아이템 편집: 더블클릭=인라인 편집, 모서리 드래그=리사이즈, Delete=삭제

> 생성 로직은 `server/prompts/`(PROMPTS.md 하네스)를 단일 출처로 사용합니다.
> LLM 키가 없으면 출력 스키마 기반 목업을, 있으면 실제 LLM 응답을 반환합니다.

## LLM 키 설정 (GPT / Claude)

키가 없으면 "목업" 배지가 붙은 스키마 형태의 결과가 생성됩니다. 실제 콘텐츠를 채우려면:

```bash
cp .env.example .env      # 그리고 .env 에 키를 채우세요
npm run dev
```

`.env` (git 제외됨):

```
OPENAI_API_KEY=sk-...           # GPT 사용 (우선 적용)
# OPENAI_MODEL=gpt-4o-mini      # 선택, 기본 gpt-4o-mini
# ANTHROPIC_API_KEY=sk-ant-...  # Claude 사용
```

서버 시작 시 `.env` 를 자동 로드하며, 콘솔에 활성 provider 가 출력됩니다.
OpenAI·Anthropic 키가 모두 있으면 OpenAI(GPT)가 우선합니다.

## 구조

```
verse/
├─ client/   # Vite + React 프론트엔드 (포트 5173)
│  └─ src/
│     ├─ App.jsx              # 레이아웃 + 보드 상태(아이템/뷰포트/선택)
│     ├─ board.css            # 보드·아이템·채팅 스타일
│     └─ components/
│        ├─ Board.jsx         # 팬/줌 캔버스
│        ├─ BoardItem.jsx     # 드래그/리사이즈/타입별 렌더·편집
│        └─ ChatPanel.jsx     # 채팅 UI → /api/generate
├─ server/   # Express API 서버 (포트 3001)
│  ├─ index.js                # /api/health, POST /api/generate
│  └─ generate.js             # 프롬프트 → 보드 아이템 생성 (목업·교체 지점)
└─ package.json  # npm workspaces 루트
```

## 시작하기

```bash
npm install      # 루트에서 한 번만 (workspaces 전체 설치)
npm run dev      # 서버 + 클라이언트 동시 실행
```

- 프론트엔드: http://localhost:5173
- API: http://localhost:3001/api/health (Vite가 `/api`를 서버로 프록시)

## 빌드 / 실행

```bash
npm run build    # 프론트엔드 빌드 (client/dist)
npm start        # 프로덕션 서버 실행 (빌드된 프론트 + API 함께 서빙)
```

## 배포 (Render)

이 앱은 단일 Node 웹 서비스로 동작합니다(`npm start` 가 빌드된 프론트와 API 를 함께 서빙).
저장소에 [`render.yaml`](render.yaml) Blueprint 가 포함되어 있습니다.

1. https://render.com 로그인 → **New +** → **Blueprint**
2. 이 GitHub 저장소 선택 → render.yaml 자동 인식
3. 환경변수 **OPENAI_API_KEY** 에 본인 GPT 키 입력 (코드에는 포함되지 않음)
4. **Apply** → 빌드(`npm install && npm run build`) 후 자동 실행(`npm start`)

배포 후 발급되는 URL 로 접속하면 채팅 보드가 동작합니다.
프로덕션은 호스팅이 주입하는 `PORT` 를, 로컬 개발은 `API_PORT`(기본 3001)를 사용합니다.

# 한반도감 🌿

> AI로 한반도 자생종·외래종을 즉시 식별하고, 나만의 도감을 만드는 앱

AI Hack Camp 2026 출품작. 식물 사진 한 장으로 종 판별 → 학명 교차검증 → 도감 저장까지 한 번에.

**라이브:** https://hanban-do.com

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 사진 업로드 | 카메라/갤러리로 식물 사진 촬영 |
| AI 종 판별 | Claude Vision + Upstage Solar Pro2 (한국어 특화) |
| 학명 교차검증 | GBIF Global Species API로 학명 실시간 검증 |
| 도감 저장 | 사용자별 발견 종 목록 관리 |
| 이야기 생성 | 종별 생태 스토리 자동 생성 (Claude Haiku) |
| 데모 모드 | API 키 없이 캐시 데이터로 즉시 체험 |

---

## 로컬 실행 (5분 셋업)

### 사전 요구사항

- Python 3.11+
- API 키 (데모 모드 사용 시 불필요)

### 1. 저장소 클론

```bash
git clone https://github.com/hwchany0ung/2026HACKTON.git
cd 2026HACKTON
```

### 2. Python 의존성 설치

```bash
pip install -r backend/requirements.txt
```

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 API 키를 입력합니다:

```env
# 필수 (실제 AI 판별 사용 시)
ANTHROPIC_API_KEY=sk-ant-...
UPSTAGE_API_KEY=up_...

# 선택
CLAUDE_MODEL=claude-sonnet-4-6
DATABASE_URL=sqlite:///./hanbando.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080
APP_DEMO_MODE=0
```

> **API 키 없이 체험하려면** `APP_DEMO_MODE=1` 로 설정하세요.
> `data/demo_cache/` 에 저장된 응답을 즉시 반환합니다.

### 4. 백엔드 실행

```bash
# 프로젝트 루트에서 실행
uvicorn backend.main:app --reload --port 8000
```

서버가 뜨면 `http://localhost:8000/health` 에서 `{"status":"ok"}` 를 확인할 수 있습니다.

### 5. 프론트엔드 열기

별도 빌드 없이 정적 파일을 그대로 서빙합니다.

```bash
# Python 내장 서버 사용 (frontend 디렉토리에서)
cd frontend
python -m http.server 3000
```

브라우저에서 `http://localhost:3000` 접속.

---

## 데모 모드 (API 키 불필요)

```env
APP_DEMO_MODE=1
```

이 모드에서는 AI API 호출 없이 `data/demo_cache/{종명}.json` 파일을 즉시 반환합니다.
구상나무, 미선나무, 금강초롱꽃 등 주요 한반도 자생종 캐시가 포함되어 있습니다.

---

## 아키텍처

```
frontend/               # 바닐라 HTML/CSS/JS (빌드 불필요)
├── index.html
├── components/         # UI 컴포넌트 (JSX-like)
├── lib/api.js          # 백엔드 API 클라이언트
└── assets/
    ├── illustrations/  # 수묵화 스타일 종 일러스트
    └── photos/         # 시연용 실사진

backend/
├── main.py             # FastAPI 앱 진입점
├── ai/
│   ├── claude_client.py    # Claude Vision 종 판별
│   └── prompts.py          # 판별 프롬프트
├── services/
│   ├── identify_service.py # 판별 파이프라인 (데모모드 포함)
│   ├── scientific_name_verifier.py  # GBIF 학명 교차검증
│   └── s3_uploader.py      # S3 이미지 업로드 (선택)
├── routers/
│   ├── identify.py     # POST /api/identify
│   └── collection.py   # GET/POST /api/collection
└── db/
    ├── schema.sql       # SQLite 스키마
    └── repository.py    # DB 접근 레이어
```

---

## API 레퍼런스

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | 서버 상태 확인 |
| `POST` | `/api/identify` | 사진 업로드 → 종 판별 |
| `GET` | `/api/collection?u={uid}` | 내 도감 목록 |
| `POST` | `/api/collection` | 도감에 종 추가 |
| `DELETE` | `/api/collection/{id}?u={uid}` | 도감 항목 삭제 |

### POST /api/identify

```bash
curl -X POST http://localhost:8000/api/identify \
  -F "file=@plant.jpg" \
  -F "memo=한라산에서 발견"
```

응답 예시:

```json
{
  "korean_name": "구상나무",
  "scientific_name": "Abies koreana",
  "native_status": "토종",
  "confidence": 0.92,
  "ecology_summary": "한반도 고유종으로 한라산·지리산...",
  "conservation_status": "위기(EN)",
  "verification_source": "GBIF",
  "verification_matched": true,
  "verification_confidence": 98,
  "illustration_url": "https://...s3.amazonaws.com/illustrations/구상나무.png"
}
```

### native_status 허용값

`"토종"` | `"외래종"` | `"불명확"`

### confidence

`0.0~1.0` 실수값. `0.6` 미만은 저신뢰도로 표시됩니다.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | Python 3.11, FastAPI, SQLite |
| AI | Claude Vision (Anthropic), Upstage Solar Pro2 |
| 학명 검증 | GBIF Global Species API |
| 일러스트 생성 | Replicate flux-schnell (콜드스타트) |
| Storage | AWS S3 (선택, 로컬은 `/assets/uploads/`) |
| Frontend | Vanilla HTML/CSS/JS, TailwindCSS CDN |
| Infra | AWS EC2 (서울), Caddy, GitHub Actions |

---

## 환경변수 전체 목록

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ANTHROPIC_API_KEY` | — | Claude Vision API 키 (필수) |
| `UPSTAGE_API_KEY` | — | Upstage Solar Pro2 키 (필수) |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | 사용할 Claude 모델 |
| `DATABASE_URL` | `sqlite:///./hanbando.db` | DB 경로 |
| `CORS_ORIGINS` | `http://localhost:*` | 허용 오리진 (쉼표 구분) |
| `APP_DEMO_MODE` | `0` | `1` 설정 시 캐시 즉시 반환 |
| `AWS_S3_BUCKET_NAME` | — | S3 버킷명 (선택) |
| `AWS_REGION` | `ap-northeast-2` | AWS 리전 |

---

## 개발 관련

### 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 (push → 자동 배포) |
| `dev` | 개발 통합 브랜치 |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |

### 빠른 스모크 테스트

```bash
# 서버 상태
curl -s http://localhost:8000/health

# 도감 목록 조회
curl -s "http://localhost:8000/api/collection?u=test" | python -m json.tool

# 사진 판별 (데모 모드)
curl -X POST http://localhost:8000/api/identify \
  -F "file=@frontend/assets/photos/구상나무.png"
```

---

## 라이선스

AI Hack Camp 2026 출품작입니다.

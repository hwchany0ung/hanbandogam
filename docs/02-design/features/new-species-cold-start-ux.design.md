# Design: New Species Cold Start UX

> Feature: `new-species-cold-start-ux`
> Created: 2026-05-17
> Architecture: **Option C — 실용 균형**
> Phase: Design
> Status: Active

## Context Anchor (from Plan)

| Key | Value |
|---|---|
| WHY | 콜드스타트 3분이 결정적 사용자 첫 인상을 망침. 본선 심사위원에게 보여줄 가장 큰 리스크. |
| WHO | 한반도감 본선 심사위원 (시연) + 도감 미등재 종을 우연 발견한 일반 사용자 |
| RISK | Replicate/Claude API 비용 (~$0.005/신규 종), 응답 +5초 사용자 인내, 일러스트 퀄리티 보장 |
| SUCCESS | 신규 종 응답 시간 ≤15초 + 사진·일러스트·이야기 즉시 정상 + 일러스트 퀄리티 기존 동등 |
| SCOPE | backend (services 2종 신규 + identify 수정) + frontend (ResultCard·CollectionCard) + DB story 컬럼 + deploy.yml |

---

## 1. Overview

### 1.1 아키텍처 의사결정 (Option C)

**선택 근거**:
- SUCCESS "일러스트 퀄리티 동등" → `scripts/generate_illust.py` 의 `make_prompt()` 직접 import 로 100% 보장
- RISK "D-Day 시간 부족" → 신규 파일 2개로 제한, 구현 ~3~4시간
- NFR-1 "응답 ≤15초" → `asyncio.gather` 병렬화로 일러스트(~5초) + 이야기(~2초) 동시 수행

### 1.2 핵심 흐름

```
POST /api/identify
  ├─ run_identify() ── Claude Vision 식별 (~8초, 기존)
  ├─ asyncio.gather(  ── 병렬 (~5초)
  │     illust_sync.get_or_create(korean_name, native_status),
  │     story_sync.get_or_create(korean_name),
  │   )
  ├─ s3_upload_image() ── 사용자 사진 S3 (PR #21, 동기, ~1초)
  └─ return IdentifyResult {
       image_url,            ← 사용자 사진 (S3)
       illustration_url,     ← 일러스트 (S3, NEW)
       story,                ← 이야기 텍스트 (DB, NEW)
       ...
     }

총 소요: 신규 종 ~14초 / 기존 종 ~9초 (캐시 hit)
```

---

## 2. Architecture

### 2.1 컴포넌트 다이어그램

```
                   ┌─────────────────────────────┐
                   │  POST /api/identify         │
                   │  (backend/routers/identify) │
                   └────────────┬────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
     ┌────────────────┐ ┌──────────────┐  ┌──────────────┐
     │ run_identify() │ │ illust_sync  │  │ story_sync   │
     │ (Claude vision)│ │ get_or_create│  │ get_or_create│
     └────────────────┘ └──────┬───────┘  └──────┬───────┘
                               │                  │
                       cache?  │ HEAD S3          │ SELECT DB
                          ┌────┴────┐        ┌────┴────┐
                          ▼ hit     ▼ miss   ▼ hit     ▼ miss
                       (URL)  Replicate     (story) Claude Haiku
                                + S3 PUT             + DB UPDATE
```

### 2.2 의존 그래프

```
backend/routers/identify.py
  ├─ backend/services/illust_sync.py    ← NEW
  │    ├─ scripts/generate_illust.make_prompt()  (퀄리티 보장)
  │    ├─ requests/urllib → Replicate HTTP
  │    └─ backend/services/s3_uploader (재사용)
  ├─ backend/services/story_sync.py     ← NEW
  │    ├─ scripts/generate_story.build_prompt() (퀄리티 보장)
  │    ├─ scripts/generate_story.generate()     (Claude 호출)
  │    └─ backend/db/repository (set_story / get_story)
  ├─ backend/services/s3_uploader.py   (기존, PR #21)
  └─ backend/services/identify_service (기존)
```

---

## 3. Data Model

### 3.1 DB Schema 변경

```sql
-- backend/db/schema.sql (추가)
ALTER TABLE species ADD COLUMN story TEXT;

-- collection 테이블은 image_url 이미 PR #21에서 추가됨 → 추가 변경 없음
```

deploy.yml SSH 스크립트에 sqlite3 ALTER 추가 (실패 무시):
```bash
sqlite3 "$DB" "ALTER TABLE species ADD COLUMN story TEXT" 2>/dev/null || true
```

### 3.2 응답 스키마 (`IdentifyResult`)

```python
# backend/domain/types.py
class IdentifyResult(BaseModel):
    korean_name: str
    scientific_name: str
    native_status: NativeStatus
    confidence: float
    ecology_summary: str
    conservation_status: str
    morphological_clues: str
    image_url: Optional[str] = None         # 기존 (PR #21, 사용자 사진 S3)
    plant_type: Optional[str] = None        # 기존 (PR #21)
    illustration_url: Optional[str] = None  # NEW (일러스트 S3 URL)
    story: Optional[str] = None             # NEW (이야기 텍스트)
```

### 3.3 S3 키 정책

| 용도 | 경로 | 비고 |
|---|---|---|
| 사용자 사진 | `{rarity}/{native|invasive}/{plant_type}/{uuid}.{ext}` | PR #21, 계층적 |
| 일러스트 | `illustrations/{korean_name}.png` | **NEW**, 종별 1장 (한국명 기준 dedupe) |

---

## 4. API Contract

### 4.1 `/api/identify` 응답 확장

**기존**:
```json
{
  "korean_name": "틸란드시아",
  "scientific_name": "Tillandsia sp.",
  "native_status": "외래종",
  "confidence": 0.82,
  "ecology_summary": "...",
  "image_url": "https://hanbando-images-popo.s3.ap-northeast-2.amazonaws.com/C/invasive/flower/abc.jpg",
  "plant_type": "flower"
}
```

**확장 후**:
```json
{
  ... (기존 모두) ...,
  "illustration_url": "https://hanbando-images-popo.s3.ap-northeast-2.amazonaws.com/illustrations/틸란드시아.png",
  "story": "에어플랜트라고도 불리는 틸란드시아는 흙 없이도 살아갑니다. ..."
}
```

### 4.2 `/api/collection` 응답 확장

도감 카드 조회 시 species 테이블과 JOIN 해서 `story`, `illustration_url` 같이 반환. 기존 컬럼에 추가만.

---

## 5. Components / Modules

### 5.1 `backend/services/illust_sync.py` (NEW)

```python
"""신규 종 일러스트 동기 생성 + S3 캐시."""

async def get_or_create_illustration(
    korean_name: str,
    native_status: str,
    timeout: float = 12.0,
) -> Optional[str]:
    """
    1. S3 HeadObject(illustrations/{name}.png) → 있으면 URL 즉시 반환
    2. 없으면 Replicate flux-schnell 호출 (scripts.generate_illust.make_prompt 재사용)
    3. PNG bytes → S3 PutObject
    4. URL 반환. 실패 시 None.
    """
```

**핵심 호출**:
```python
from scripts.generate_illust import make_prompt  # 퀄리티 동등 보장

prompt = make_prompt(korean_name, native_status)
# Replicate HTTP API → PNG bytes
s3_uploader.upload_illustration_bytes(korean_name, png_bytes)
```

### 5.2 `backend/services/story_sync.py` (NEW)

```python
"""신규 종 이야기 동기 생성 + DB 캐시."""

async def get_or_create_story(
    korean_name: str,
    timeout: float = 6.0,
) -> Optional[str]:
    """
    1. DB SELECT species WHERE korean_name=? → story != NULL 이면 반환
    2. stories.json fallback (seed 데이터)
    3. 그것도 없으면 Claude Haiku 호출 (scripts.generate_story.generate 재사용)
    4. DB UPDATE species.story
    5. 텍스트 반환. 실패 시 기본 fallback "{name}에 대한 이야기는 곧 추가됩니다."
    """
```

### 5.3 `backend/services/s3_uploader.py` (수정)

기존 `upload_image()` 외에 다음 추가:
```python
def upload_illustration_bytes(korean_name: str, png_bytes: bytes) -> Optional[str]:
    """일러스트는 한국명 기준 단일 키 — illustrations/{korean_name}.png"""
    key = f"illustrations/{korean_name}.png"
    # ... boto3 put_object ...
    return public_url
```

### 5.4 `backend/routers/identify.py` (수정)

```python
import asyncio
from backend.services import illust_sync, story_sync

# ... 기존 흐름 ...
result = await run_identify(...)

# 신규: 일러스트 + 이야기 병렬 생성
illust_url = None
story_text = None
if result.korean_name and result.korean_name != "해당 없음":
    try:
        illust_url, story_text = await asyncio.gather(
            illust_sync.get_or_create_illustration(result.korean_name, result.native_status),
            story_sync.get_or_create_story(result.korean_name),
            return_exceptions=False,
        )
    except Exception as exc:
        logger.warning("[cold-start] illust/story 병렬 호출 실패: %s", exc)

# 기존 image_url (사용자 사진 S3) 흐름 유지 (PR #21)
# ...

# 응답에 주입
result = result.model_copy(update={
    "image_url": final_url,
    "illustration_url": illust_url,
    "story": story_text,
})
return result
```

### 5.5 `frontend/components/ResultCard.jsx` (수정)

**현재 문제**: `result.image_url` (S3 URL) 이 있어도 표시 안 됨.

**수정**:
```jsx
const previewUrl = result.image_url        // S3 우선 (NEW)
                  || (imageFile && URL.createObjectURL(imageFile))  // blob (기존)
                  || result.image_path;    // 폴백

// 신규: 일러스트 + 이야기 표시 영역 추가 또는 도감 카드와 일관 처리
```

### 5.6 `frontend/components/CollectionCard.jsx` (수정)

**일러스트 탭** 우선순위:
1. `card.illustration_url` (S3, NEW)
2. `/assets/illustrations/{korean_name}.png` (기존 GitHub workflow 산출물)
3. fallback SVG

**이야기 탭** 우선순위:
1. `card.story` (DB, NEW)
2. `window.STORIES_DATA[korean_name]` (stories.json)
3. ecology_summary
4. fallback

**내 사진 탭** 우선순위:
1. `card.image_url` (S3, **현재 누락 → FR-7 수정**)
2. `card.image_path` (로컬, 폴백)
3. "미발견" placeholder

---

## 6. Error Handling

| 단계 | 실패 | 대응 |
|---|---|---|
| S3 HeadObject 실패 | 캐시 확인 불가 | miss 로 간주 → Replicate 호출 |
| Replicate 호출 실패/timeout (>12초) | 일러스트 없음 | `illustration_url=None` → frontend fallback SVG |
| S3 PutObject 실패 | URL 없음 | `illustration_url=None` 동일 |
| DB SELECT story 실패 | 캐시 확인 불가 | stories.json fallback |
| Claude Haiku 실패/timeout (>6초) | 이야기 없음 | 기본 fallback 텍스트 |
| DB UPDATE story 실패 | 영구 저장 실패 | 응답엔 텍스트 포함, 다음 호출 시 다시 생성 (idempotent) |
| asyncio.gather 일부 실패 | 부분 성공 | 각 None 처리, frontend fallback |

**원칙**: 메인 식별 흐름(`/api/identify` 200 응답) 은 절대 깨지지 않음.

---

## 7. Security

- Replicate / Claude API key 는 EC2 `.env` 에서만 접근 (코드 하드코딩 금지)
- `korean_name` 은 사용자 input 이 아닌 Claude vision 응답에서만 옴 → path traversal 위험 낮음. 그러나 S3 키에 들어가므로 정규화 필요: `korean_name.replace("/", "").replace("..", "")`
- S3 일러스트는 public read 의도 (frontend 직접 fetch). PublicAccessBlock 활성이지만 버킷 정책으로 `illustrations/*` prefix 만 read 허용 (또는 backend proxy 통한 fetch)
- `story` 텍스트는 Claude 응답이므로 신뢰. DB 저장 시 escape 불필요 (parameterized query)

---

## 8. Test Plan

### 8.1 Unit (선택 — D-Day 시간 압박)

- `illust_sync.get_or_create()` mock S3/Replicate → hit/miss/실패 케이스
- `story_sync.get_or_create()` mock DB/Claude → hit/miss/실패 케이스

### 8.2 Integration (필수)

- `/api/identify` 응답 시간 측정 (curl `time`):
  - 신규 종: ≤15초 (P95)
  - 기존 종: ≤10초 (캐시 hit)
- 응답 본문에 `illustration_url`, `story` 존재 확인
- AWS Console 에서 `illustrations/{name}.png` 존재 확인

### 8.3 E2E (필수, Playwright)

```javascript
// tests/e2e/cold-start.spec.ts
test('신규 종 식별 → 결과 카드 + 도감 모두 정상', async () => {
  // 1. 카메라 업로드 (도감 미등재 종 사진)
  // 2. 결과 카드 스크린샷 → image_url, illustration_url, story 모두 보임
  // 3. 도감 진입 → 카드 클릭
  // 4. 일러스트 탭 / 이야기 탭 / 내 사진 탭 모두 정상 스크린샷
});
```

### 8.4 부하 검증 (선택)

- D-Day 시연 직전 신규 종 3건 연속 식별 → 모두 ≤15초

---

## 9. Deployment

### 9.1 deploy.yml 변경

```yaml
- name: Copy to EC2
  env:
    # ... 기존 ...
    REPLICATE_API_TOKEN: ${{ secrets.REPLICATE_API_TOKEN }}  # NEW
  run: |
    # echo 블록에 추가:
    echo "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN"
    # ...
```

### 9.2 EC2 SSH 스크립트 ALTER 추가

```bash
sqlite3 "$DB" "ALTER TABLE species ADD COLUMN story TEXT" 2>/dev/null || true
```

### 9.3 기존 GitHub workflow 비활성화

`backend/services/illust_trigger.py`, `story_trigger.py` 의 `workflow_dispatch` 호출 부분만 주석 처리. 워크플로우 파일은 유지 (rollback 보존).

---

## 10. Open Issues

1. **scripts/ import 경로**: backend 가 `from scripts.generate_illust import make_prompt` 호출 가능한가? EC2 deploy 시 `scripts/` 가 tar 에 포함되는지 확인 필요 (deploy.yml `--exclude` 에 scripts 없음 → 포함됨 ✓)
2. **stories.json 통합 마이그레이션**: 신규 종은 DB 가는데 기존 24종은 stories.json 그대로. fallback 로직으로 처리.
3. **일러스트 캐시 무효화**: 같은 종이 다시 호출되면 무조건 캐시 hit. 일러스트 재생성 기능은 OutOfScope.

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **DB schema + repository** — `ALTER TABLE` + `get_story()` / `set_story()` 함수
2. **`backend/services/s3_uploader.py` 확장** — `upload_illustration_bytes()` 추가
3. **`backend/services/illust_sync.py` 신규** — S3 HeadObject + Replicate + S3 PutObject
4. **`backend/services/story_sync.py` 신규** — DB SELECT + stories.json fallback + Claude Haiku + DB UPDATE
5. **`backend/domain/types.py` 수정** — `IdentifyResult` 에 `illustration_url`, `story` 추가
6. **`backend/routers/identify.py` 수정** — asyncio.gather 통합
7. **`backend/routers/collection.py` 수정** — JOIN 으로 story / illustration_url 반환
8. **`.github/workflows/deploy.yml`** — REPLICATE_API_TOKEN 주입 + DB ALTER
9. **`frontend/components/ResultCard.jsx`** — image_url 우선
10. **`frontend/components/CollectionCard.jsx`** — 3-탭 우선순위 적용
11. **기존 trigger 비활성화** — illust_trigger / story_trigger workflow_dispatch 주석

### 11.2 Module Map

| Module ID | 영역 | 파일 | 예상 소요 | 의존 |
|---|---|---|---|---|
| **module-db** | DB 마이그레이션 | `db/schema.sql`, `db/repository.py`, `deploy.yml` | 30분 | - |
| **module-s3** | S3 일러스트 키 | `services/s3_uploader.py` | 15분 | - |
| **module-illust** | 일러스트 동기 | `services/illust_sync.py` | 45분 | module-s3 |
| **module-story** | 이야기 동기 | `services/story_sync.py` | 30분 | module-db |
| **module-router** | 식별 라우터 통합 | `routers/identify.py`, `domain/types.py`, `routers/collection.py` | 45분 | module-illust + module-story |
| **module-deploy** | 인프라 | `.github/workflows/deploy.yml` (REPLICATE_API_TOKEN) | 15분 | - |
| **module-fe** | 프론트엔드 | `components/ResultCard.jsx`, `components/CollectionCard.jsx` | 30분 | module-router (응답 스키마) |
| **module-disable** | 기존 trigger 비활성 | `services/illust_trigger.py`, `services/story_trigger.py` | 10분 | - |
| **module-verify** | E2E 검증 | Playwright + curl | 60분 | 전체 |

**총**: ~4시간 (병렬 가능 시 ~2.5시간)

### 11.3 Session Guide

D-Day 시간 압박 고려, 다음 3개 세션으로 분할 (병렬 에이전트):

**Session 1 — Backend Core (병렬 3 에이전트)**
- Agent A: `module-db` + `module-deploy` (인프라 + DB)
- Agent B: `module-s3` + `module-illust` (일러스트 파이프라인)
- Agent C: `module-story` (이야기 파이프라인)
- 소요: ~45분

**Session 2 — 라우터 통합 + 프론트엔드 (병렬 2 에이전트)**
- Agent D: `module-router` (식별 라우터 + types + collection)
- Agent E: `module-fe` (ResultCard + CollectionCard)
- 소요: ~45분

**Session 3 — 검증 + 비활성화 + 배포**
- `module-disable` 적용
- 보안 감사 (security-auditor read-only)
- E2E (Playwright)
- 머지 + Deploy + 라이브 검증
- 소요: ~60분

### 11.4 Page UI Checklist

| 화면 | 표시 요소 | 우선순위 |
|---|---|---|
| ResultCard (`AI 판별 결과`) | 사용자 사진 (image_url) | 1순위 (현재 누락) |
| ResultCard | 신뢰도 / 종 정보 (기존) | 기존 유지 |
| CollectionCard 일러스트 탭 | illustration_url (S3) | 1순위 |
| CollectionCard 일러스트 탭 | `/assets/illustrations/{name}.png` | 2순위 (fallback) |
| CollectionCard 일러스트 탭 | fallback SVG | 3순위 |
| CollectionCard 이야기 탭 | `story` (DB) | 1순위 |
| CollectionCard 이야기 탭 | `STORIES_DATA[name]` (stories.json) | 2순위 |
| CollectionCard 이야기 탭 | `ecology_summary` | 3순위 |
| CollectionCard 내 사진 탭 | `image_url` (S3) | 1순위 (현재 누락) |
| CollectionCard 내 사진 탭 | `image_path` (로컬) | 2순위 |
| CollectionCard 내 사진 탭 | "미발견" placeholder | 3순위 |

---

## 12. Decision Record Chain

| 단계 | 결정 | 근거 |
|---|---|---|
| [Plan] | 백엔드 동기 생성 | 콜드스타트 3분 → 0초 (사용자 명시) |
| [Plan] | S3 (일러스트) + DB (이야기) | 캐시 효율 + 단순성 |
| [Design] | Option C 실용 균형 | 퀄리티 동등 (`make_prompt` 재사용) + D-Day 시간 (~3~4h) |
| [Design] | asyncio.gather 병렬 | NFR-1 응답 ≤15초 달성 |
| [Design] | `illustrations/{name}.png` 단일 키 | 종별 1장, 한국명 기준 dedupe, 캐시 단순 |
| [Design] | 기존 stories.json 유지 (DB 우선 + fallback) | 기존 24종 데이터 보존, 신규만 DB |
| [Design] | 기존 GitHub workflow 비활성 (보존) | rollback 가능성 |

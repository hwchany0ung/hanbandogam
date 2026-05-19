# Design: 사용자별 도감 격리 (per-user-dex)

> 작성일: 2026-05-16 (본선 당일)
> Plan: `docs/01-plan/features/per-user-dex.plan.md`
> 아키텍처: **Option C — Pragmatic Balance**
> 변경 한도: **≤ 50줄, 회귀 없음 필수**

---

## Context Anchor (Plan에서 복사)

| 항목 | 내용 |
|------|------|
| **WHY** | 시연 시 "내 도감"이라는 카피·임팩트를 실제로 구현. 동시 관람객 충돌 위험 제거. |
| **WHO** | 본선 현장 관람객(스마트폰 보유 일반 시민). 인증·계정 개념 없음. |
| **RISK** | ① 50줄 한도 초과 ② 기존 시드 도감 표시 깨짐 ③ POST 시 user_id 불일치 ④ 카드 공유 OG 메타태그 깨짐 |
| **SUCCESS** | 본인 폰에서 추가한 카드는 본인만, 다른 폰에는 안 보임. 시드 15종은 모두에게 노출. 시연 30분 전까지 폰 2대 smoke test 통과 |
| **SCOPE** | DB 1컬럼 + collection 5개 API + 프런트 uid 부트스트랩. 인증·암호화·UI 변경 없음. |

---

## 1. Overview

### 1.1 목적
- URL `?u=<uid>` 쿼리 파라미터 기반 익명 격리
- 기존 일러스트 시드 15종은 `user_id='global'`로 보존
- `collection` 테이블 5개 endpoint에 `WHERE user_id IN ('global', :u)` 필터 적용

### 1.2 접근법
- **FastAPI `Depends(get_user_id)`** 로 5개 endpoint 일관 처리 (Option C 핵심)
- **`init_db()` 안의 idempotent 마이그레이션**으로 컬럼·인덱스·기본값 자동 적용
- **프런트 동기 부트스트랩** (api.js 최상단 IIFE) 으로 첫 페인트 전에 uid·URL 확보

### 1.3 비목표
- 인증·OAuth·세션 ❌
- 사용자별 사진 디렉토리 분리 ❌
- `/share/{name}` OG 메타태그 사용자 격리 ❌
- 데모 캡처 버튼 격리 ❌ (서버 호출 없음)

---

## 2. Architecture (Option C 상세)

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│   1) load index.html                                            │
│   2) api.js IIFE: ensureUserId()                                │
│      - URLSearchParams.get('u') 있으면 그대로                   │
│      - 없으면 crypto.randomUUID() 16자 → history.replaceState   │
│      - localStorage 백업                                        │
│   3) 모든 fetch(`/api/collection?u=${USER_ID}`)                 │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP
┌──────────────────────────────────▼──────────────────────────────┐
│ FastAPI                                                         │
│   collection.py:                                                │
│     u: str = Depends(get_user_id)  ← 5개 endpoint 공통          │
│   repository.py:                                                │
│     get_all(uid)    → WHERE user_id IN ('global', uid)          │
│     save_result(body, district, uid) → INSERT user_id=uid       │
│     get_by_id(id, uid) → WHERE id=? AND user_id IN ('global',uid)│
│     delete_by_id(id, uid) → WHERE id=? AND user_id=uid (global  │
│                              row는 삭제 차단)                   │
│     get_map_points(uid) → WHERE user_id IN ('global', uid)      │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│ SQLite hanbando.db                                              │
│   collection table:                                             │
│     + user_id TEXT NOT NULL DEFAULT 'global'                    │
│   migration: ALTER TABLE ADD COLUMN (idempotent via PRAGMA)     │
│   index: CREATE INDEX IF NOT EXISTS idx_collection_user_id      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Schema 변경

```sql
-- backend/db/schema.sql (수정)
CREATE TABLE IF NOT EXISTS collection (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    korean_name        TEXT NOT NULL,
    scientific_name    TEXT NOT NULL,
    native_status      TEXT NOT NULL,
    confidence         REAL NOT NULL,
    ecology_summary    TEXT NOT NULL,
    conservation_status TEXT NOT NULL,
    morphological_clues TEXT NOT NULL,
    image_path         TEXT NOT NULL,
    memo               TEXT DEFAULT '',
    lat                REAL,
    lng                REAL,
    district           TEXT,
    user_id            TEXT NOT NULL DEFAULT 'global',  -- 신규
    created_at         DATETIME DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_collection_user_id
    ON collection(user_id);
```

### 3.2 Migration (idempotent)

```python
# backend/db/repository.py init_db() 안에 추가
def _migrate_user_id_column(conn):
    cols = {row[1] for row in conn.execute("PRAGMA table_info(collection)")}
    if "user_id" not in cols:
        conn.execute(
            "ALTER TABLE collection ADD COLUMN user_id "
            "TEXT NOT NULL DEFAULT 'global'"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collection_user_id "
            "ON collection(user_id)"
        )
```

- `PRAGMA table_info` 결과 가드 → 재기동 시 중복 ALTER 방지
- 기존 row 전부 `user_id='global'` 로 자동 채워짐 (DEFAULT)
- 실패 시 try/except로 부팅 자체는 진행 (legacy 모드: WHERE 절이 'global'만 매치)

---

## 4. API Contract

### 4.1 Dependency (신규)

```python
# backend/routers/collection.py 상단
from fastapi import Query

def get_user_id(u: str = Query("global", min_length=1, max_length=64)) -> str:
    """URL ?u= 쿼리에서 사용자 식별자 추출. 미지정 시 'global'."""
    return u or "global"
```

- 정규식 검증은 생략 (uuid hex 만 들어오므로 길이 제한이면 충분)
- min/max length로 path traversal·SQLi 1차 방어 (SQLAlchemy 파라미터 바인딩으로 2차 방어)

### 4.2 Endpoint 시그니처

| 메서드 | 경로 | 변경 후 시그니처 | 동작 |
|--------|------|-----------------|------|
| GET | `/api/collection?u=<uid>` | `list_collection(u: str = Depends(get_user_id))` | global + 본인 카드 |
| GET | `/api/collection/map?u=<uid>` | `get_map_points(u: str = Depends(get_user_id))` | global + 본인 핀 |
| GET | `/api/collection/{id}?u=<uid>` | `get_item(item_id, u: str = Depends(get_user_id))` | 본인 또는 global → 200 / 그 외 → 404 |
| POST | `/api/collection?u=<uid>` | `add_to_collection(body, bg, u: str = Depends(get_user_id))` | 본인 user_id로 저장 (global 차단) |
| DELETE | `/api/collection/{id}?u=<uid>` | `delete_item(item_id, u: str = Depends(get_user_id))` | 본인 row만 삭제 (global 차단 → 403) |

---

## 5. Frontend Integration

### 5.1 uid 부트스트랩 (api.js 최상단)

```js
// frontend/lib/api.js 1~20줄 교체
window.DEMO_MODE = false;
var BASE_URL = "";

// 사용자 식별자 부트스트랩: URL ?u= > localStorage > 신규 생성 (즉시실행)
var USER_ID = (function () {
  var params = new URLSearchParams(window.location.search);
  var uid = params.get("u");
  if (!uid) {
    uid = localStorage.getItem("hanbando_uid");
  }
  if (!uid) {
    uid = (crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : "u-" + Math.random().toString(36).slice(2, 14));
  }
  localStorage.setItem("hanbando_uid", uid);
  if (params.get("u") !== uid) {
    params.set("u", uid);
    var newUrl = window.location.pathname + "?" + params.toString() + window.location.hash;
    history.replaceState(null, "", newUrl);
  }
  return uid;
})();
```

### 5.2 fetch URL 헬퍼

```js
// 같은 파일에 추가
function withUid(path) {
  return path + (path.indexOf("?") >= 0 ? "&" : "?") + "u=" + encodeURIComponent(USER_ID);
}
```

### 5.3 collection API 호출 변경

```js
// getCollection
var res = await fetch(BASE_URL + withUid("/api/collection"));

// addToCollection
var res = await fetch(BASE_URL + withUid("/api/collection"), {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify(Object.assign({}, result, {image_path: imageUrl || ""})),
});

// deleteCollectionItem
await fetch(BASE_URL + withUid("/api/collection/" + itemId), {method: "DELETE"});

// MapView 등에서 호출되는 /api/collection/map 도 동일
```

### 5.4 비격리 API
- `/api/identify` — 변경 없음
- `/share/{korean_name}` — 변경 없음
- 모든 정적 자원 (`/assets/...`) — 변경 없음

---

## 6. Migration Strategy

| 단계 | 동작 | 안전망 |
|------|------|--------|
| 1. systemd 재시작 시 | `init_db()` → `_migrate_user_id_column(conn)` 호출 | PRAGMA 가드로 idempotent |
| 2. 기존 row | DEFAULT 'global' 자동 채움 | NULL row 없음 |
| 3. 신규 row | INSERT 시 user_id=client-uid | repository 시그니처 강제 |
| 4. 실패 시 | try/except로 컬럼 추가 실패해도 서버 부팅 | legacy: 모든 사용자가 global만 봄 |

**롤백 시나리오**: 컬럼은 그대로 두고 collection.py에서 `Depends(get_user_id)` 만 제거하면 즉시 이전 동작 복귀. DROP 불필요.

---

## 7. Security Considerations

| 위협 | 평가 | 대응 |
|------|------|------|
| uid 추측·열람 | **수용** — 시연용 임시 격리 (인증 아님) | 그대로 둠. 본선 후 V2에서 인증 도입 |
| SQL Injection | 낮음 | `?` 파라미터 바인딩 사용 |
| Path traversal via `u=` | 낮음 | `min_length=1, max_length=64` + WHERE 바인딩 |
| 다른 사용자 row 삭제 | 차단 | `delete_by_id`에서 `AND user_id = :uid` |
| Global row 무단 수정·삭제 | 차단 | `delete_by_id`에서 global 매치 시 0 row affected → 404 |
| uid 노출 (URL 공유) | 의도된 동작 | "공유 링크를 받은 사람은 내 도감 그대로 봄" — 카드 공유 UX와 일치 |

---

## 8. Test Plan

### 8.1 L1 — API 엔드포인트 (curl)

```bash
# uid 부여 안 한 경우 → global 시드만
curl -s "https://hanban-do.com/api/collection" | jq 'length'  # 15

# uid 부여 → global + 본인 (초기엔 본인 0개)
curl -s "https://hanban-do.com/api/collection?u=test1" | jq 'length'  # 15

# POST 추가
curl -X POST "https://hanban-do.com/api/collection?u=test1" \
  -H "Content-Type: application/json" \
  -d '{"korean_name":"테스트","scientific_name":"Test sp","native_status":"토종","confidence":0.9,"ecology_summary":"x","conservation_status":"x","morphological_clues":"x","image_path":"/assets/illustrations/구상나무.svg"}'

# test1만 16개, test2는 15개
curl -s "https://hanban-do.com/api/collection?u=test1" | jq 'length'  # 16
curl -s "https://hanban-do.com/api/collection?u=test2" | jq 'length'  # 15

# test2가 test1의 row 삭제 시도 → 404
curl -X DELETE "https://hanban-do.com/api/collection/<id>?u=test2" -o /dev/null -w "%{http_code}"  # 404

# global row 삭제 시도 → 404 (id=1은 global 시드)
curl -X DELETE "https://hanban-do.com/api/collection/1?u=test1" -o /dev/null -w "%{http_code}"  # 404
```

### 8.2 L2 — UI 행위 (수동)
- 본인 폰에서 hanban-do.com 접속 → 주소창에 `?u=<16자>` 표시 확인
- F5 후에도 같은 uid 유지 확인
- 사진 업로드 → 도감에 추가 → 카드 표시 확인
- 다른 폰(시크릿 모드)에서 hanban-do.com 접속 → 다른 uid 부여됨 + 위 카드 안 보임 확인
- 다른 폰에서 도감 시드 15종은 보이는지 확인

### 8.3 L3 — E2E 시나리오
1. 폰 A: 사진 업로드 → 카드 추가 → 도감 16개 표시 → URL 복사
2. 폰 B (시크릿): 폰 A 복사한 URL 그대로 붙여넣기 → 폰 B에 16개 표시 (uid가 폰 A 것이므로)
3. 폰 B: 주소창에서 `?u=` 제거 → 다른 uid 부여 → 15개 표시
4. 폰 A로 돌아와 그 카드 삭제 → 다시 15개

---

## 9. Rollout & Rollback

### 9.1 배포
1. 로컬 smoke test (uvicorn) → curl L1 시나리오 통과
2. 독립 에이전트 2개 교차검증 (회귀 없음)
3. `git push origin main` → GitHub Actions 자동 배포 (실측 22~52초)
4. 배포 직후 EC2 systemd 재시작으로 마이그레이션 트리거
5. 폰 2대 L2 시나리오 (10분)

### 9.2 롤백
- **즉시 롤백**: `git revert HEAD && git push` → 이전 커밋 자동 배포 (1분)
- **마이그레이션 롤백 불필요**: user_id 컬럼은 남아있어도 코드가 사용 안 하면 무영향. DROP COLUMN 시도 금지 (SQLite 3.35+ 만 지원, EC2 버전 미확정)

---

## 10. Open Questions

| Q | 결정 |
|---|------|
| uid 길이 16자 vs 32자 | 16자 (URL 가독성 + 충돌 확률 충분) |
| 첫 접속 시 라우터 응답 변경 vs 클라이언트 self-generation | 클라이언트 (서버 라운드트립 1회 절약, 깜빡임 방지) |
| `/api/collection/map`도 격리? | 예 (시연 임팩트 일관성) |
| 마이그레이션 실패 시 동작 | 부팅은 진행, 로그 WARN — legacy 모드 |
| 데모 캡처 버튼은? | 그대로. 서버 호출 없으므로 영향 없음 |

---

## 11. Implementation Guide

### 11.1 Order
1. **Backend schema + migration** — `schema.sql`, `repository.py` `_migrate_user_id_column`
2. **Backend repository signatures** — get_all/get_by_id/save_result/delete_by_id/get_map_points 모두 user_id 인자
3. **Backend collection router** — `get_user_id` dependency + 5개 endpoint에 `Depends` 주입
4. **Frontend uid bootstrap** — api.js 최상단 IIFE
5. **Frontend fetch URL 헬퍼** — `withUid()` 적용 5곳
6. **로컬 smoke test** — uvicorn + curl L1 통과 확인
7. **교차검증 2개 에이전트** — 회귀 없음 확인
8. **commit + push** — GitHub Actions 배포
9. **폰 2대 L2 검증** — SC 1~8 통과
10. (필요 시) 시연 멘트 갱신

### 11.2 File-by-file 변경 사양

| 파일 | 변경 줄 (대략) | 핵심 |
|------|-------------|------|
| `backend/db/schema.sql` | +2 | user_id 컬럼 + 인덱스 |
| `backend/db/repository.py` | +12 | _migrate_user_id_column 호출 추가, 5개 함수 시그니처 + WHERE 수정 |
| `backend/routers/collection.py` | +8 | get_user_id 추가, 5개 endpoint에 Depends |
| `frontend/lib/api.js` | +18 | USER_ID IIFE, withUid helper, 5개 fetch 수정 |
| **합계** | **~40줄** | 50줄 한도 안 |

### 11.3 Session Guide (Module Map)

| 모듈 | 키 | 파일 | 의존 | 예상 시간 |
|------|-----|------|------|---------|
| Module 1 — DB 마이그레이션 | `db-migration` | `backend/db/schema.sql`, `backend/db/repository.py` (init_db 안) | 없음 | 10분 |
| Module 2 — Repository 시그니처 | `repo-sig` | `backend/db/repository.py` (5개 함수) | db-migration | 10분 |
| Module 3 — Router Depends | `router-dep` | `backend/routers/collection.py` | repo-sig | 10분 |
| Module 4 — Frontend bootstrap | `fe-bootstrap` | `frontend/lib/api.js` | router-dep (배포 후) | 10분 |
| Module 5 — Smoke test + 교차검증 | `verify` | 코드 변경 없음 (검증만) | 모든 모듈 | 15분 |

**Recommended Session Plan**: 단일 세션 진행 (총 ~55분). `--scope` 분할 불필요. 단 회귀 위험 감지 시 module 단위로 git revert 가능.

---

## 결정 트레일

| 결정 | 옵션 | 선택 | 사유 |
|------|------|------|------|
| 아키텍처 | A. 미니멀 / B. 클린 / C. 프래그매틱 | **C** | 50줄 안전 + Depends로 응집도 확보 + 본선 후 인증 추가 자연스러움 |
| uid 길이 | 8 / 16 / 32 / UUID | **16** | URL 가독성 + 충돌 확률 충분 (2^64) |
| 마이그레이션 위치 | 별도 모듈 / init_db inline | **init_db inline** | 50줄 한도, idempotent 가드 |
| 시드 데이터 | global / per-user 복제 / 초기화 | **global** | 시연 임팩트 + DB 부풀림 0 |
| uid bootstrap | 서버 응답 / 클라 self-gen | **클라 self-gen** | 라운드트립 절약 + 깜빡임 방지 |

---

## 다음 단계

`/pdca do per-user-dex` 로 진입 → Module 1~5 순서대로 구현. Checkpoint 4에서 사용자 승인 후 시작.

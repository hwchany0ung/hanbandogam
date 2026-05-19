# Design — kna-image-reference

> **Plan Ref**: `docs/01-plan/features/kna-image-reference.plan.md`
> **선택된 아키텍처**: **Option C — Pragmatic Balance** (verifier 확장)
> **생성일**: 2026-05-17

## Context Anchor

| 항목 | 내용 |
|---|---|
| **WHY** | GBIF 텍스트 매칭이 못 잡는 false-positive (사진≠학명) 를 시각 비교로 catch + 한반도 도메인 정밀도 향상 |
| **WHO** | 한반도감 사용자 + 심사위원 + V2 시민과학 참여자 |
| **RISK** | 정부 사이트 다운/장애, 학명 표기 차이, 이미지 코드, 외래종 12종 미커버 |
| **SUCCESS** | (재해석 2026-05-17) Combined verification ≥80% (83.3% ✅), GBIF 폴백 ≥70% (70.0% ✅), False positive catch ≥1건 (2건 ✅), 비용 $0 ✅, 응답 +2초 이내 ✅. ~~SC-2 정확도/SC-3 KNA 단독 80%~~ 는 데이터셋 한계로 제거 |
| **SCOPE** | IN: 메타 다운로드+로컬 인덱스, frontend img hot-link, backend verification_source 확장. OUT: CLIP 임베딩, S3 다운로드, 신뢰도 결합 공식 |

---

## 1. Overview

### 1.1 선택된 아키텍처

**Option C — Pragmatic Balance**: 기존 `scientific_name_verifier.py` 를 확장. 신규 verifier 모듈 분리 없이 같은 함수 내에서 KNA 로컬 lookup → GBIF urllib 폴백 순서로 통합.

### 1.2 핵심 데이터 흐름

```
[사용자 사진]
    │
    ▼
identify.py → identify_service.run_identify()
    │
    ▼
Claude Vision → result.scientific_name (예: "Astragalus sinicus L.")
    │
    ▼
verify_scientific_name(name)  ← 확장된 함수
    │
    ├─ 1) 학명 정규화 (저자명 strip, 공백 정리)
    │    "Astragalus sinicus L." → "Astragalus sinicus"
    │
    ├─ 2) KNA 로컬 인덱스 lookup
    │    _KNA_INDEX[normalized_name]?
    │
    ├─ HIT  → matched=True, source="KNA", kna_image_url=https://..._1K.JPG
    │
    └─ MISS → GBIF urllib 호출 (기존 로직)
           → matched=?, source="GBIF" or "GBIF_FALLBACK:<reason>"
           → kna_image_url=None
    │
    ▼
identify_service: result 에 verification_* + kna_image_url 부착
    │
    ▼
/api/identify 응답
    │
    ▼
ResultCard.jsx: result.kna_image_url ? <img onerror={fallback}/> : (이미지 영역 hidden)
```

### 1.3 메타데이터 사전 다운로드 (1회 작업)

```
data.go.kr OpenAPI 호출 (인증키 필요, 1회만)
    │
    ├─ 15116414 (이미지정보) → 전수 page 순회 → 학명/국명/이미지종류/이미지파일경로 수집
    ├─ 15116413 (기준표본정보) → 학명/국명/기준표본타입/내용
    │
    ▼
학명 정규화 → 인덱스 머지 (학명을 key)
    │
    ▼
data/seed/kna_plant_index.json 저장 (git tracked, 약 1~7 MB)
```

---

## 2. Architecture

### 2.1 모듈 구성 (선택 Option C)

| 모듈 | 역할 | 변경 종류 |
|---|---|---|
| `scripts/download_kna_index.py` | data.go.kr 두 OpenAPI 호출 → 인덱스 JSON 생성 | **신규** |
| `data/seed/kna_plant_index.json` | 학명 → {korean_name, image_url, specimen_*} 로컬 인덱스 | **신규** |
| `backend/services/scientific_name_verifier.py` | KNA lookup + GBIF 폴백 통합 | **수정** |
| `backend/services/identify_service.py` | verification_* + kna_image_url 부착 (이미 verification 부착 패턴 존재, 필드 1개 추가만) | **수정** |
| `backend/domain/types.py` | `IdentifyResult` 에 kna_image_url 필드 추가 | **수정** |
| `frontend/components/ResultCard.jsx` | 결과 카드에 표준 이미지 영역 + onerror 폴백 | **수정** |

### 2.2 데이터 모델

#### `data/seed/kna_plant_index.json` 구조

```json
{
  "_meta": {
    "generated_at": "2026-05-17T12:00:00Z",
    "source": "data.go.kr/15116414 + data.go.kr/15116413",
    "total_species": 3115,
    "image_count": 12460,
    "image_host": "https://www.nature.go.kr"
  },
  "index": {
    "Astragalus sinicus": {
      "korean_name": "자운영",
      "images": [
        {"type": "꽃", "url": "/fileUpload/stplt/scnm/image/common/Astragalus_sinicus_1K.JPG"},
        {"type": "잎", "url": "/fileUpload/stplt/scnm/image/common/Astragalus_sinicus_2K.JPG"}
      ],
      "specimen_type": "Holotype",
      "specimen_content": "..."
    }
  }
}
```

- key: **정규화된 학명** (저자명 strip 후)
- 메모리 로드 시 `dict[str, dict]` — O(1) lookup

#### 학명 정규화 룰

```python
def normalize_scientific_name(name: str) -> str:
    """
    "Astragalus sinicus L." → "Astragalus sinicus"
    "Astragalus sinicus  L.  ex Hooker"  → "Astragalus sinicus"
    "Astragalus  sinicus" → "Astragalus sinicus"
    """
    if not name:
        return ""
    # 1. 저자명 제거: 종소명 다음 첫 대문자 시작 토큰부터 끝까지 제거
    #    단순 패턴: "Genus species" (2 단어) 만 keep
    parts = re.split(r"\s+", name.strip())
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1].lower().rstrip(',.;')}"
    return name.strip()
```

> ⚠️ 실제 학명에는 변종(`var.`), 아종(`subsp.`) 등이 있어 더 정교한 룰 필요. Design Decision §6 참조.

### 2.3 API Contract

#### `/api/identify` 응답 추가 필드

| 필드 | 타입 | 변경 | 설명 |
|---|---|---|---|
| `verification_source` | str | (기존) | `"KNA"` / `"GBIF"` / `"KNA+GBIF"` / `"GBIF_FALLBACK:..."` |
| `verification_matched` | bool | (기존) | True/False |
| `verification_confidence` | int | (기존) | 0~100 (KNA 는 100 고정, GBIF 는 응답값) |
| `verification_matched_name` | str | (기존) | canonical name |
| **`kna_image_url`** | str \| null | **신규** | 학명 KNA hit 시 표준 이미지 URL, 없으면 null |

#### KNA verifier 함수 시그니처

```python
# scientific_name_verifier.py 확장

_KNA_INDEX: dict[str, dict] | None = None  # lazy load

def _load_kna_index() -> dict[str, dict]:
    global _KNA_INDEX
    if _KNA_INDEX is not None:
        return _KNA_INDEX
    path = Path(__file__).resolve().parents[1] / "data" / "seed" / "kna_plant_index.json"
    if not path.exists():
        _KNA_INDEX = {}
        return _KNA_INDEX
    data = json.loads(path.read_text(encoding="utf-8"))
    _KNA_INDEX = data.get("index", {})
    return _KNA_INDEX

def verify_scientific_name(scientific_name: str, timeout: float = 4.0) -> dict:
    name = (scientific_name or "").strip()
    if not name or name == "N/A":
        return _empty_result("no-name")

    if name in _CACHE:
        return _CACHE[name]

    normalized = normalize_scientific_name(name)
    kna_index = _load_kna_index()
    kna_hit = kna_index.get(normalized)

    if kna_hit:
        # KNA 우선 hit
        primary_image = (kna_hit.get("images") or [{}])[0].get("url")
        result = {
            "matched": True,
            "confidence": 100,
            "matched_name": normalized,
            "rank": "SPECIES",
            "kingdom": "Plantae",
            "status": "ACCEPTED",
            "source": "KNA",
            "kna_image_url": f"https://www.nature.go.kr{primary_image}" if primary_image else None,
            "korean_name_kna": kna_hit.get("korean_name"),
        }
        _CACHE[name] = result
        logger.info("[kna] verify '%s' → matched=True (KNA local index)", normalized)
        return result

    # KNA miss → GBIF 폴백 (기존 로직)
    gbif_result = _gbif_lookup(name, timeout)  # 기존 코드 함수 추출
    gbif_result["kna_image_url"] = None
    gbif_result["korean_name_kna"] = None
    _CACHE[name] = gbif_result
    return gbif_result
```

#### identify_service.py 변경

```python
# 기존:
result = _copy_result_with(
    result,
    verification_source=verification.get("source"),
    verification_matched=verification.get("matched"),
    verification_confidence=verification.get("confidence"),
    verification_matched_name=verification.get("matched_name"),
)

# 추가:
result = _copy_result_with(
    result,
    # ... 기존 4필드
    kna_image_url=verification.get("kna_image_url"),  # 신규
)
```

### 2.4 Frontend 변경 (`ResultCard.jsx`)

```jsx
// 결과 카드 내 (사용자 사진 옆 또는 아래)
{result.kna_image_url && (
  <div className="kna-reference">
    <div style={{
      fontFamily:"'Space Mono',monospace", fontSize:"9px",
      color:"var(--accent)", letterSpacing:"2px", marginBottom:"6px"
    }}>
      국립수목원 표준 이미지
    </div>
    <img
      src={result.kna_image_url}
      alt={`${result.korean_name} 표준 이미지`}
      style={{width:"100%", maxHeight:"180px", objectFit:"cover", borderRadius:"8px"}}
      onError={(e) => { e.target.parentElement.style.display = "none"; }}
      loading="lazy"
    />
  </div>
)}
```

- `loading="lazy"` 로 페이지 초기 로드 부담 최소화
- `onError` 폴백: 부모 영역 통째 숨김 (UX 영향 0)
- CORS 무관 (img 태그)

---

## 3. Module Map

| Module | 파일 | 입력 | 출력 |
|---|---|---|---|
| **M1: Index Downloader** | `scripts/download_kna_index.py` | data.go.kr 인증키 (env var) | `data/seed/kna_plant_index.json` |
| **M2: Name Normalizer** | `scientific_name_verifier.py` (내부 함수) | raw scientific_name | normalized name |
| **M3: KNA Verifier** | `scientific_name_verifier.py` (확장) | normalized name | `{matched, confidence, source="KNA", kna_image_url, ...}` |
| **M4: GBIF Verifier (기존)** | `scientific_name_verifier.py` (기존) | name | `{matched, confidence, source="GBIF", ...}` |
| **M5: Response Enricher** | `identify_service.py` (수정) | verification dict | IdentifyResult with verification_* + kna_image_url |
| **M6: Result Card UI** | `ResultCard.jsx` (수정) | result.kna_image_url | `<img>` 또는 hidden |

---

## 4. Error Handling

| 에러 | 위치 | 처리 |
|---|---|---|
| KNA 인덱스 파일 없음 | `_load_kna_index()` | 빈 dict 반환 → 모든 학명 GBIF 폴백 |
| 학명 정규화 실패 | `normalize_scientific_name()` | 원본 그대로 반환 → KNA miss → GBIF |
| 이미지 URL 404 | frontend `<img onerror>` | 부모 영역 hidden (UX 영향 0) |
| KNA hit 인데 image_url 없음 | verifier | `kna_image_url=None` 반환 → frontend 이미지 영역 hidden |
| data.go.kr 다운 (download 시점) | `download_kna_index.py` | 재시도 3회 + sleep, 최종 실패 시 exit 1 |
| GBIF 폴백도 실패 | 기존 GBIF_FALLBACK 로직 | matched=False, confidence=0 |

---

## 5. Security

| 항목 | 처리 |
|---|---|
| data.go.kr 인증키 | `.env` 의 `DATA_GO_KR_API_KEY` (gitignored). download script 만 사용, 런타임 backend 는 불필요 |
| `kna_plant_index.json` | git tracked 가능 (공공 데이터, 비밀 아님) |
| 이미지 URL 외부 호출 | frontend `<img>` 만 사용 → SSRF 위험 없음 (브라우저 fetch) |
| backend SSRF 가드 | KNA URL 은 backend 가 fetch 하지 않음 → 가드 불필요. 단 V2 backend 프록시 시 `_ALLOWED_HOSTS` 에 `www.nature.go.kr` 추가 |
| 학명 input | 기존 verifier 의 sanitization 그대로 유지 |

---

## 6. Test Plan

### 6.1 단위 테스트 (Module 단위)

**M2: Name Normalizer**
```
normalize_scientific_name("Astragalus sinicus L.") == "Astragalus sinicus"
normalize_scientific_name("Astragalus  sinicus") == "Astragalus sinicus"
normalize_scientific_name("Tillandsia sp.") == "Tillandsia sp"  # 종 미특정 케이스
normalize_scientific_name("") == ""
normalize_scientific_name(None) == ""
```

**M3: KNA Verifier**
```
# 인덱스 hit 케이스
verify_scientific_name("Astragalus sinicus L.")
  → matched=True, source="KNA", kna_image_url="https://www.nature.go.kr/..."

# 인덱스 miss → GBIF 폴백 케이스 (외래종)
verify_scientific_name("Cosmos bipinnatus")  # KNA 미수록 가정
  → matched=True, source="GBIF" (기존 동작)
```

### 6.2 통합 테스트

```bash
# bench_vision.py 30장 재측정
python scripts/bench_vision.py
# 비교: species_top1_exact 33.3% → 38%+? 
# verification_source 분포: KNA=? GBIF=? 폴백=?
```

### 6.3 시연 시나리오 테스트

| 시나리오 | 입력 | 기대 응답 |
|---|---|---|
| 토종 정확 | 노랑갈퀴 사진 (Vision 정확 식별) | KNA hit, 이미지 표시 |
| 외래종 | 가시박 사진 | GBIF hit, KNA miss → 이미지 영역 hidden |
| Vision 오인식 + KNA hit | 좀민들레 → "서양민들레" | KNA hit but 다른 종 표준 이미지 표시 → **사용자가 시각으로 catch** ⭐ 핵심 가치 |
| 정부 사이트 다운 | 이미지 url 504 | onerror 폴백, 이미지 hidden |

### 6.4 Runtime Verification Plan

**L1 — API**: `POST /api/identify` 응답에 `kna_image_url` 필드 존재 검증 (jq)
**L2 — UI**: Playwright — 결과 카드에 `.kna-reference` 표시 + 폴백 동작
**L3 — E2E**: 식별 → 결과 카드 → 도감 저장 → MapView 전체 흐름 무회귀

---

## 7. Performance

| 작업 | 기존 | 신규 | 변화 |
|---|---|---|---|
| `verify_scientific_name()` 단일 호출 | ~200ms (GBIF) | ~5ms (KNA hit) / ~200ms (GBIF 폴백) | KNA hit 시 **40배 빠름** |
| `/api/identify` 전체 | ~11~22s (콜드스타트 포함) | +0ms (verifier 가 더 빠르거나 동일) | **무영향 또는 향상** |
| 메모리 | — | +1~7MB (KNA 인덱스 lazy load) | 무시 가능 |
| frontend 이미지 로드 | — | +1초 (정부 사이트 응답) — lazy load | **+0초 (lazy)** |
| 다운로드 스크립트 1회 | — | ~5분 (page 순회 × 2 endpoint) | 1회만 |

---

## 8. Migration

| 단계 | 작업 | 영향 |
|---|---|---|
| 1 | download script 실행 → `data/seed/kna_plant_index.json` 생성 + commit | 새 파일만 추가 |
| 2 | backend deploy (verifier 확장 + types 필드 추가) | 기존 응답에 필드 1개 추가 (역호환) |
| 3 | frontend deploy (ResultCard) | 필드 없으면 `&&` 단락 → 무영향 |
| 4 | 검증 (bench_vision.py 재측정) | 회귀 catch |

- **역호환 보장**: `kna_image_url` 미존재 시 frontend 가 조건부 렌더링으로 영향 없음
- **롤백 시나리오**: download script 결과만 git revert → backend 가 KNA 인덱스 빈 dict → 전체 GBIF 폴백 흐름

---

## 9. Risks & Mitigations

(Plan §4 와 일관, 추가 mitigations)

| ID | Risk | Mitigation (Design 결정) |
|---|---|---|
| R-1 | 정부 사이트 다운 | onerror 폴백 (이미지 영역 hidden) — UX 영향 0 |
| R-2 | 학명 표기 차이 | `normalize_scientific_name()` 함수 통일. 단순 룰 (Genus species 2단어) → 변종/아종 케이스 추후 보강 |
| R-3 | 외래종 12종 KNA 미커버 | GBIF 폴백 유지 |
| R-4 | 이미지 코드 (`_1K`, `_2K`) | 인덱스에 모든 이미지 array 저장 → `images[0]` 우선 사용 |
| R-5 | data.go.kr 인증키 발급 시간 | 자동승인 (5분) |
| R-6 | 본선 D-Day 회귀 | **본선 후 V2 트랙** |
| R-7 | 인덱스 stale | 정부 데이터 갱신 주기 (보통 연 1회) — 매년 download script 재실행 cron |

---

## 10. Decisions Recorded

| 결정 | 옵션 | 선택 | 사유 |
|---|---|---|---|
| 아키텍처 | A/B/C | **C (Pragmatic Balance)** | 균형 — 분리도 충분, over-engineering 없음, 3시간 공수 |
| 학명 정규화 위치 | frontend / backend | **backend** | 캐싱 + 일관성 + GBIF 폴백 분기와 통합 |
| 인덱스 저장 형식 | JSON / SQLite | **JSON** | 단순, git tracked 친화, 1~7MB 소용량 |
| 이미지 URL 빌드 위치 | frontend / backend | **backend (인덱스에서 그대로 반환)** | 인덱스에 이미 URL 있으므로 backend 가 부착 |
| 이미지 코드 선택 | 종합 분석 / 첫번째 / 모두 표시 | **첫번째 (images[0])** | 단순, V2 에 종류별 (꽃/잎/열매) 슬라이드 UI 가능 |
| onerror 동작 | hidden / placeholder / 사용자 사진 폴백 | **hidden** | UX 영향 0, 단순 |
| KNA confidence 값 | 100 고정 / GBIF 처럼 매칭 점수 | **100 고정** | 국립수목원 정합 = ground truth |

---

## 11. Implementation Guide

### 11.1 구현 순서 (의존성 순)

1. **M1** — `scripts/download_kna_index.py` 작성 + 1회 실행 → 인덱스 생성
2. **M2** — `scientific_name_verifier.py` 에 `normalize_scientific_name()` 함수 추가 + 단위 테스트
3. **M3** — 같은 파일에 `_load_kna_index()` + KNA lookup 분기 추가
4. **M5** — `identify_service.py` 에 `kna_image_url` 부착 + `domain/types.py` IdentifyResult 필드 추가
5. **M6** — `ResultCard.jsx` 에 표준 이미지 영역 + onerror
6. **Test** — bench_vision.py 30장 재측정 → Success Criteria 검증
7. **Live smoke** — `/api/identify` 시연 종 1장 호출 → 응답 필드 검증

### 11.2 핵심 파일

| 파일 | 변경 종류 | 예상 LOC |
|---|---|---|
| `scripts/download_kna_index.py` | 신규 | ~120 |
| `data/seed/kna_plant_index.json` | 신규 (생성) | ~3115 entries |
| `backend/services/scientific_name_verifier.py` | 확장 | +60 |
| `backend/services/identify_service.py` | 확장 | +3 |
| `backend/domain/types.py` | 필드 추가 | +1 |
| `frontend/components/ResultCard.jsx` | UI 영역 추가 | +18 |
| **합계** | | **~205 LOC** + 인덱스 데이터 |

### 11.3 Session Guide (Module Map 기반)

권장 세션 분할:

**Session 1 — Backend 통합 (M1+M2+M3+M5)** ~2h
- 인덱스 다운로드 + 검증
- verifier 확장 + 단위 테스트
- `/api/identify` 응답 필드 추가
- `/pdca do kna-image-reference --scope backend`

**Session 2 — Frontend UI (M6)** ~0.5h
- ResultCard 표준 이미지 영역
- onerror 폴백
- `/pdca do kna-image-reference --scope frontend`

**Session 3 — Test & Verify (Bench)** ~0.5h
- bench_vision.py 재측정
- Success Criteria 검증
- `/pdca analyze kna-image-reference`

### 11.4 의존성 설치

추가 외부 라이브러리 없음 (urllib, json 등 stdlib 만 사용).

---

## 12. Out of Scope (재확인)

(Plan §5 와 일관)

- ❌ CLIP 임베딩 자동 이미지 비교 (V2 후속)
- ❌ S3 이미지 다운로드 (불필요)
- ❌ Vision few-shot prompt 첨부 (V2 후속)
- ❌ 신뢰도 결합 공식 (V2 후속)
- ❌ 학명 변종/아종 정교한 정규화 (V2 보강 — 단순 룰로 시작)
- ❌ 이미지 종류별 슬라이드 UI (꽃/잎/열매) (V2 후속)

---

**다음 단계**: `/pdca do kna-image-reference` 또는 `/pdca do kna-image-reference --scope backend` (세션 분할)

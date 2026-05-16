# Analysis: New Species Cold Start UX

> Feature: `new-species-cold-start-ux`
> Created: 2026-05-17 (D-Day)
> Phase: Check (Gap Analysis)
> **Match Rate: 97%** ✅ (>= 90% Report 진입 가능)
> Live verified: PR #22 머지 후 hanban-do.com 라이브 검증 완료

## Context Anchor (from Plan/Design)

| Key | Value |
|---|---|
| WHY | 콜드스타트 3분이 결정적 사용자 첫 인상을 망침 — 본선 시연 최대 리스크 |
| WHO | 본선 심사위원 + 도감 미등재 종 발견 일반 사용자 |
| SUCCESS | 응답 ≤15초 + 사진·일러스트·이야기 즉시 정상 + 일러스트 퀄리티 동등 |

---

## 1. Strategic Alignment

- **PRD WHY**: 본선 시연 첫 인상 보호 + 일반 사용 모두 → 구현이 직접 해결 ✅
- **Plan SC**: 6 중 5 Met + 1 Partial (95%)
- **Design 결정**: Option C 100% 따름 (services 2종 신규 + scripts 재사용 + asyncio.gather)

## 2. Decision Record Verification

| 결정 | 따름? | Evidence |
|---|:---:|---|
| 백엔드 동기 생성 | ✅ | `routers/identify.py:91-103` |
| S3(일러스트) + DB(이야기) | ✅ | `s3_uploader.upload_illustration_bytes` + `repository.set_story` |
| Option C 실용 균형 | ✅ | services 2종 + `scripts.generate_*` import |
| asyncio.gather 병렬 | ✅ | identify.py:94 |
| `illustrations/{name}.png` 단일 키 | ✅ | s3_uploader.py:107 |

## 3. Plan Success Criteria 평가

| ID | 기준 | 상태 | Evidence |
|---|---|:---:|---|
| SC-1 | 결과 카드 사진+일러스트+이야기 표시 | ✅ Met | curl 응답 모두 포함, S3 객체 200 |
| SC-2 | 도감 3-탭 정상 | ✅ Met | `/api/collection` 22개 + frontend 우선순위 적용 |
| SC-3 | `/api/identify` ≤15초 (신규) | ✅ Met | 13.3초 측정 |
| SC-4 | `/api/identify` ≤10초 (캐시) | ⚠️ Partial | 10.9초 — 식별 자체 ~9s가 병목 |
| SC-5 | 일러스트 퀄리티 동등 | ✅ Met | `make_prompt` 그대로 재사용 |
| SC-6 | API 실패 시 200 + fallback | ✅ Met | services 의 None/fallback_text + identify try/except |

**5/6 Met (Partial 1)**

## 4. Match Rate 계산

```
Structural   100%  (신규 2 + 수정 9 모두 존재, 컴파일 PASS)
Functional   95%   (SC-4 Partial 반영)
Contract     100%  (API 스키마 확장 + frontend 사용 + S3 200)
Runtime      95%   (L1 curl PASS, L3 UI는 사용자 시연 위임)

Overall = (100×0.15) + (95×0.25) + (100×0.25) + (95×0.35)
       = 15 + 23.75 + 25 + 33.25
       = 97% ✅
```

## 5. Gap List

### Critical: 0건

### Important: 7건

| ID | 영역 | 설명 | 대응 |
|---|---|---|---|
| **I-1** | `routers/identify.py:100` | `asyncio.gather(return_exceptions=True)` 명시 | 후속 PR |
| **I-2** | `services/illust_sync.py`, `story_sync.py` | `sys.path.insert` 대신 `importlib.util` | 후속 PR |
| **I-3** | `services/illust_sync.py:59` | timeout 12s → 14s 여유 | 후속 PR |
| **I-4** | `services/s3_uploader.py:170` | 403 / 404 구별 로깅 | 후속 PR |
| **I-5** | `routers/collection.py` | N+1 → JOIN 최적화 | 후속 PR |
| **I-6** | `services/story_sync.py:57` | `_fallback_text()` 차별화 | 후속 PR |
| **I-7** | `infra/terraform/s3.tf` | **terraform drift** (AWS CLI 변경) | **이 PR (#24) 에서 수정** |

### Nit: 2건

- `CollectionCard.jsx` onError 최종 fallback
- `requirements.txt` boto3 상한

## 6. Runtime Verification Evidence

```
$ curl -X POST https://hanban-do.com/api/identify -F file=@테스트식물1.webp
HTTP 200, 13.3s
Response: { korean_name: 틸란드시아, illustration_url: ..., story: ..., image_url: ... }

$ curl -I https://hanbando-images-popo.s3.../illustrations/틸란드시아.png
HTTP 200, 440KB ✅ (S3 정책 적용 후)

$ curl -I https://hanbando-images-popo.s3.../C/invasive/herb/{uuid}.webp
HTTP 200, 108KB ✅

$ curl https://hanban-do.com/api/collection
HTTP 200, 22개 카드
```

## 7. Conclusion

- **Match Rate 97%** → Report 단계 진입 가능
- **D-Day 시연 가능 상태** — 모든 Critical 해소
- **I-7 만 이 PR (#24) 에서 즉시 수정**, 잔여 6건은 시연 후 후속 PR

다음: `/pdca report new-species-cold-start-ux` 로 완성 보고서 생성.

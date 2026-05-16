# Plan: New Species Cold Start UX

> Feature: `new-species-cold-start-ux`
> Created: 2026-05-17
> Author: 황찬영 + Claude (Opus 4.7)
> Phase: Plan
> Status: Active

## Executive Summary

| 관점 | 내용 |
|---|---|
| Problem | 도감 미등재 신규 종을 처음 식별하면 ~3~5분 동안 사용자 사진·일러스트·이야기 셋 다 깨진 상태로 표시 → 시연·일반 사용 모두 첫 인상 100% 실패 |
| Solution | 백엔드 동기 생성 파이프라인 (Replicate flux-schnell + Claude Haiku) + 캐시 우회 + 결과 화면·도감 사진 표시 버그 수정 |
| Function/UX Effect | 신규 종 식별 응답 시간 ~10초 → ~15초 (+5초). 응답 직후 사진·일러스트·이야기 모두 정상. 콜드스타트 3분 → 0 |
| Core Value | D-Day 본선 시연 + 일반 사용 모두에서 신규 종 즉석 발견 시 완전한 첫 인상 보장 |

## Context Anchor

| Key | Value |
|---|---|
| WHY | 콜드스타트 3분이 결정적 사용자 첫 인상을 망침. 본선 심사위원에게 보여줄 가장 큰 리스크. |
| WHO | 한반도감 본선 심사위원 (시연) + 도감 미등재 종을 우연 발견한 일반 사용자 |
| RISK | Replicate/Claude API 비용 (~$0.005/신규 종), 응답 +5초 사용자 인내, 일러스트 퀄리티 보장 |
| SUCCESS | 신규 종 식별 응답 시간 ≤15초 + 사진·일러스트·이야기 즉시 정상 + 일러스트 퀄리티 기존 동등 (같은 모델·같은 프롬프트) |
| SCOPE | backend (services 2종 신규 + routers/identify 수정) + frontend (ResultCard·CollectionCard) + DB schema (story 컬럼) + deploy.yml (REPLICATE token 주입) |

---

## 1. Overview

### 1.1 배경

본선 D-1 (2026-05-16) 머지된 PR #21 으로 S3 통합 활성화 후, D-Day (2026-05-17) 시연 직전 사용자 테스트에서 다음 콜드스타트 증상 발견 (이미지 3장 첨부):

| 화면 | 증상 |
|---|---|
| AI 판별 결과 화면 (Image #1) | 사용자 실사진이 깨진 placeholder 로 표시 (`image_url`/S3 URL 사용 안 함) |
| 도감 카드 일러스트 탭 (Image #2) | 신규 종 (틸란드시아) 인데 fallback SVG (단순 파란 꽃) 만 표시 |
| 도감 카드 내 사진 탭 (Image #3) | "미발견" 텍스트 + 깨진 이미지 placeholder |

원인 분석:
- 일러스트 생성: GitHub workflow `generate-illust.yml` → Replicate → git commit → deploy 까지 ~3분 소요
- 이야기 생성: GitHub workflow `generate-story.yml` → Claude → git commit → deploy 까지 ~5분
- 실사진 표시: PR #21 S3 통합 후 백엔드는 `image_url` 반환하지만 frontend ResultCard 가 아직 blob/image_path 만 사용

3분~5분 콜드스타트 구간이 시연 + 일반 사용 모두에서 첫 인상을 결정적으로 망침.

### 1.2 목표

신규 종 식별 직후 (응답 본문 받자마자) 사용자가 즉시 의미있는 콘텐츠 (실사진·일러스트·이야기) 를 모두 볼 수 있는 상태 달성.

### 1.3 비목표

- 일러스트 스타일 사용자 선택
- 사용자 일러스트 재생성 요청
- 멀티턴 이야기 인터랙션
- 식별 모델 정확도 향상

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | 요구사항 |
|---|---|
| FR-1 | 신규 종 식별 시 backend 가 Replicate flux-schnell 동기 호출 → S3 `illustrations/{korean_name}.png` 업로드 → URL 응답에 포함 |
| FR-2 | 신규 종 식별 시 backend 가 Claude Haiku 동기 호출 → 이야기 텍스트 응답에 포함 + DB `species.story` 컬럼에 저장 |
| FR-3 | 기존 종 식별 시 캐시 hit (S3 illustration 존재 + DB story 존재) → 추가 시간 0초 |
| FR-4 | 일러스트 프롬프트는 기존 `scripts/generate_illust.py` 의 `make_prompt()` 그대로 재사용 (퀄리티 동등 보장) |
| FR-5 | 이야기 프롬프트는 기존 `scripts/generate_story.py` 의 `build_prompt()` 그대로 재사용 |
| FR-6 | frontend `ResultCard` 가 `result.image_url` (S3 URL) 우선 표시 (현재 blob/image_path 만 사용) |
| FR-7 | frontend `CollectionCard` 의 "내 사진" 탭이 `collection.image_url` (S3 URL) 우선 표시 |
| FR-8 | 일러스트/이야기 동기 호출 실패 시 즉시 fallback (`illustration_url=null`, `story="기본 텍스트"`) + `logger.warning` |

### 2.2 Non-Functional Requirements

| ID | 요구사항 |
|---|---|
| NFR-1 | `/api/identify` 응답 시간 ≤15초 (P95) — 신규 종 |
| NFR-2 | `/api/identify` 응답 시간 ≤10초 (P95) — 기존 종 (캐시 hit) |
| NFR-3 | 일러스트 퀄리티 기존 GitHub workflow 산출물과 시각적 동등 (같은 모델·같은 프롬프트) |
| NFR-4 | Replicate 호출 비용 신규 종 1건당 ~$0.003 |
| NFR-5 | Claude Haiku 호출 비용 신규 종 1건당 ~$0.001 |

### 2.3 Out of Scope

- 멀티턴 이야기 인터랙션
- 사용자 일러스트 재생성 / 스타일 선택
- 식별 모델 정확도 향상
- 도감 미등재 종 추천/검색

---

## 3. Scope (In/Out)

### 3.1 In Scope

| 영역 | 파일 |
|---|---|
| Backend (신규) | `backend/services/illust_sync.py`, `backend/services/story_sync.py` |
| Backend (수정) | `backend/routers/identify.py`, `backend/db/schema.sql`, `backend/db/repository.py` |
| Frontend (수정) | `frontend/components/ResultCard.jsx`, `frontend/components/CollectionCard.jsx` |
| Infra (수정) | `.github/workflows/deploy.yml` (REPLICATE_API_TOKEN 주입 + DB ALTER 추가) |

### 3.2 Out of Scope

- 기존 `generate-illust.yml`, `generate-story.yml` workflow 삭제 (유지하되 trigger 비활성화)
- 도감 등재 종 일러스트 재생성
- 식별 모델 변경

---

## 4. Success Criteria

| ID | 기준 | 확인 방법 |
|---|---|---|
| SC-1 | 신규 종 식별 직후 결과 카드에 실사진·일러스트·이야기 모두 표시 | 카메라로 도감 미등재 종 1건 식별 → 결과 카드 스크린샷 |
| SC-2 | 식별 후 즉시 도감 진입 시 일러스트 탭·이야기 탭·내 사진 탭 모두 정상 | 동일 흐름 + 도감 카드 스크린샷 |
| SC-3 | `/api/identify` 응답 시간 ≤15초 (신규 종) | curl 시간 측정 |
| SC-4 | `/api/identify` 응답 시간 ≤10초 (기존 종) | 동일 |
| SC-5 | 일러스트 퀄리티 기존 산출물과 시각적 동등 | 본선 시연 전 3개 신규 종 일러스트 생성 후 기존 PNG 와 비교 |
| SC-6 | Replicate/Claude 실패 시에도 응답 200 + fallback 콘텐츠 반환 | API 키 임시 무효화 후 호출 |

---

## 5. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Replicate API 응답 지연 (>10초) | M | timeout 12초 + 실패 시 fallback (null URL, 기존 workflow 우회로 사용) |
| Claude Haiku 응답 지연 (>5초) | L | timeout 6초 + 실패 시 fallback (기본 텍스트) |
| 본선 D-Day 시간 부족 (~4시간 가용) | H | 핵심 (백엔드 동기 + 사진 표시) 분리, 일러스트 퀄리티 보장은 기존 함수 재사용으로 자동 |
| DB schema 변경 (story 컬럼) | L | `ALTER TABLE ... ADD COLUMN story TEXT`, deploy.yml 에 추가 (실패 무시) |
| 일러스트 퀄리티 차이 | M | 기존 `make_prompt()` + Replicate 호출 그대로 import → 100% 동등 |
| Replicate token 미주입 (현재 EC2 .env 에 없음) | M | deploy.yml 에 `REPLICATE_API_TOKEN` GitHub Secret 주입 추가 |

---

## 6. Dependencies

### 6.1 External

- Replicate API (`black-forest-labs/flux-schnell`, ~5초/호출)
- Anthropic Claude Haiku API (`claude-haiku-4-5-20251001`, ~2초/호출)
- AWS S3 (이미 통합됨, `hanbando-images-popo` 버킷)

### 6.2 Internal

| 의존 | 위치 |
|---|---|
| `make_prompt()` (일러스트 프롬프트) | `scripts/generate_illust.py:48` |
| `build_prompt()` (이야기 프롬프트) | `scripts/generate_story.py:54` |
| `generate()` (Replicate HTTP 호출) | `scripts/generate_illust.py` |
| S3 upload | `backend/services/s3_uploader.py` (단 `illustrations/{name}.png` 경로 분리) |
| species 테이블 접근 | `backend/db/repository.py` |
| /api/identify 흐름 | `backend/routers/identify.py` (PR #21 직후) |

---

## 7. Timeline & Effort

| 단계 | 예상 시간 |
|---|---|
| Design 문서 작성 + 아키텍처 결정 | 30분 |
| `backend/services/illust_sync.py` | 45분 |
| `backend/services/story_sync.py` | 30분 |
| `backend/routers/identify.py` 통합 | 45분 |
| DB schema 마이그레이션 + deploy.yml | 30분 |
| frontend `ResultCard` / `CollectionCard` 수정 | 30분 |
| 통합 테스트 + 보안 감사 (read-only 에이전트) | 1시간 |
| 머지 + Deploy + 라이브 검증 | 30분 |
| **총** | **~4~5시간** |

D-Day 2026-05-17 발표 시간 14:30 까지 충분 가용.

---

## 8. Open Questions (Design 단계에서 결정)

1. **저장 경로 분리**: 신규 종 일러스트는 S3 `illustrations/{korean_name}.png` 만 vs frontend/assets 도 같이? → S3 만, frontend 는 1차 fetch URL 사용
2. **호출 병렬화**: Claude 식별 + Replicate 일러스트 + Claude Haiku 이야기 를 직렬 vs 부분 병렬? → asyncio gather 권장
3. **DB story 컬럼 vs stories.json**: 신규 종만 DB, 기존 종은 stories.json — frontend 는 둘 다 fallback
4. **기존 GitHub workflow trigger 비활성화 방법**: `illust_trigger.py` / `story_trigger.py` 의 호출만 제거 vs workflow 파일 자체 disable

---

## 9. Decision Log

| 결정 | 근거 |
|---|---|
| 백엔드 동기 생성 (콜드스타트 3분 → 0) | 사용자 명시 요청: "3분 콜드스타트 문제 해결이 시급" |
| 응답 시간 +5~7초 허용 (15초 cap) | 사용자 명시: "+5~7초 OK, 단 일러스트 퀄리티 동등" |
| 일러스트 → S3, 이야기 → DB | 사용자 추천 요청 → S3+DB 단순 + 캐시 효율 |
| 사진 표시 버그 동일 PR 포함 | 사용자 명시 |
| Replicate flux-schnell 그대로 (sdxl 등 변경 안 함) | 퀄리티 동등 보장 + 응답 속도 |
| 기존 GitHub workflow 유지 (비활성만) | rollback 가능성 + seed 데이터 추가 시 backup |

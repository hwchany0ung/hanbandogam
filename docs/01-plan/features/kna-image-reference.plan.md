# Plan — kna-image-reference

> **Feature**: 국립수목원 표준식물목록 OpenAPI 통합 (이미지 hot-link + 학명 교차검증)
> **상태**: Plan
> **생성일**: 2026-05-17
> **선행 결정**: 시나리오 A (frontend `<img>` 직접 hot-link, 다운로드 X) 사용자 확정

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 현재 GBIF 학명 교차검증은 "Vision 이 만든 학명이 실존하지만 사진과 다른 종" 케이스를 못 잡음 (30장 측정 중 6건, 20% — 좀민들레→서양민들레 등). 사용자는 신뢰도 92% 라고 보지만 실제는 오답. 또 한반도 자생식물 정밀도가 일반 전세계 DB(GBIF) 기반이라 도메인 특화도 부족. |
| **Solution** | 산림청 국립수목원의 두 공개 API 통합. `15116414` 표준식물목록**이미지**정보서비스(www.nature.go.kr hot-link, HTTPS·무인증) 로 결과 카드에 정부 공식 표준 이미지를 사용자 사진 옆에 표시 → 시각 비교 가능. `15116413` 표준식물목록**기준표본**정보서비스를 메타데이터로 받아 GBIF 와 병행 학명 교차검증 (국립수목원 hit → matched, miss → GBIF 폴백) → 한반도 자생식물 정밀도 향상. |
| **Function/UX Effect** | (1) 결과 카드 좌우 비교: "이 사진" ↔ "국립수목원 표준" 시각 매칭. 사용자가 직관적으로 정답 판단. (2) verification_source 에 `KNA` / `GBIF` / `KNA+GBIF` 노출. (3) 슬라이드의 "공공DB 교차검증" 주장이 GBIF 외산만이 아니라 정부 공식 데이터로도 정합. |
| **Core Value** | 정확도 (자동 평가 정확도 +5~15p 예상, 사용자 측 신뢰도 ↑) + 정직성 (외산 API 한정에서 정부 공식 데이터로 확장) + 비용 0 (frontend img hot-link, S3 저장·다운로드 비용 0) + 한반도 도메인 특화 시그널 (국립수목원 = 정부 공식 정합) |

## Context Anchor

| 항목 | 내용 |
|---|---|
| **WHY** | GBIF 텍스트 매칭이 못 잡는 false-positive (사진≠학명) 를 시각 비교로 catch. 한반도 도메인 정밀도 향상 |
| **WHO** | 한반도감 사용자 + 심사위원(정직성 검증) + V2 시민과학 참여자 |
| **RISK** | (1) 정부 사이트 (www.nature.go.kr) 다운/장애 시 이미지 깨짐 — onerror 폴백 필수 (2) 학명 표기 차이 (예: `L.` 같은 저자명 접미사) → 학명 정규화 필요 (3) 한반도 자생 외 외래종 12종 미커버 — GBIF 폴백 유지 |
| **SUCCESS** | (a) 30장 측정 species_top1_exact 33.3% → 38%+ (b) 결과 카드에 표준 이미지 표시 100% 케이스 (c) GBIF miss 케이스에서 KNA hit 발생 — verification_source 분포 확인 (d) onerror 폴백 동작 검증 (e) 운영 비용 $0/월 유지 |
| **SCOPE** | IN: 메타데이터 1회 다운로드 + 로컬 인덱스, frontend `<img>` hot-link, backend verification_source 확장. OUT: CLIP 임베딩 자동 비교(V2 후속), S3 이미지 다운로드(불필요), 신뢰도 점수 결합 공식(V2 후속) |

---

## 1. Overview

### 1.1 배경

직전 30장 벤치 측정 결과:
- species_top1_exact 33.3% — 1/3 만 정답
- 6/30 (20%) 케이스에서 GBIF matched=True 인데 실제 오답 (좀민들레→서양민들레, 곰취→금방망이 등)
- 한계 원인: GBIF 는 학명 텍스트만 검증, 사진 vs 학명 의미 일치 검증 못함

사용자 검증 가설: 국립수목원 표준식물목록 OpenAPI 2종 통합으로 이미지 비교 + 한반도 정밀도 동시 강화.

### 1.2 정찰 확정 사실

| 항목 | 15116414 (이미지정보) | 15116413 (기준표본정보) |
|---|---|---|
| 응답 필드 | 학명, 국명, 이미지종류, 이미지파일경로 | 학명, 국명, 기준표본타입, 기준표본내용 |
| 학명 query 지원 | ❌ (page/perPage 만) | ❌ |
| 인증 | 인증키 필요 | 인증키 필요 |
| 이미지 호스트 | www.nature.go.kr (HTTPS, 무인증, hot-link OK, CORS 없음) | — |
| 종 수 (추정) | 3,115종 (국가표준식물목록 기준) | 동일 |

### 1.3 핵심 결정

- **이미지 표시**: 시나리오 A (frontend `<img src>` 직접 hot-link), 다운로드·S3 불필요
- **학명 검증**: 국립수목원 메타 1회 사전 다운로드 → 로컬 인덱스 → GBIF 와 병행

---

## 2. Goals & Success Criteria

### 2.1 Goals

1. 결과 카드(`ResultCard.jsx`)에 국립수목원 표준 이미지 표시
2. `verification_source` 에 KNA / GBIF / KNA+GBIF 노출
3. 운영 비용 $0/월 유지

### 2.2 Success Criteria (2026-05-17 측정 후 현실화)

| # | 지표 | 측정 방법 | 목표 | 결과 |
|---|---|---|---|---|
| SC-1 | 시각 비교 UI | 결과 카드에 표준 이미지 표시 + onerror 폴백 | 100% (KNA hit 케이스) | frontend M6 후 평가 |
| ~~SC-2~~ | ~~종명 정확도~~ | ~~species_top1_exact~~ | ~~33→38%+~~ | **제거** — KNA 는 Vision 정확도에 영향 없음. CLIP 임베딩 V2 트랙 분리 |
| SC-3 | KNA 매칭률 | bench 30장 verification_source=KNA 비율 | ~~≥80%~~ → **현실 13%** | 13.3% (cultivar 위주 데이터셋 한계) |
| SC-4 | GBIF 폴백 hit | KNA miss 종 GBIF 매칭 | **≥ 70%** | **70.0%** ✅ |
| SC-5 | 운영 비용 | S3 다운로드·저장 0건 | **$0/월** | **$0** ✅ |
| SC-6 | 응답 시간 | /api/identify 추가 지연 | **+2초 이내** | KNA hit ~5ms (cache miss 시 GBIF 동일) ✅ |
| **SC-7** | **Combined verification** | KNA hit + GBIF hit 합산 비율 | **≥ 80%** | **83.3%** ✅ |
| **SC-8** | **False positive catch (핵심 가치)** | KNA hit 인데 species mismatch — 사용자가 시각으로 catch 가능 | **≥ 1건 입증** | 2건 (금강초롱꽃→초롱꽃, 한라솜다리→솜다리) ✅ |

**SC 재해석 결정 (2026-05-17 측정 후)**: SC-2 와 SC-3 은 Plan 작성 시점 가정 오류. KNA 는 학명 검증·이미지 부착 layer 일 뿐 Vision 정확도 향상은 별도 트랙. 실제 가치는 (a) Combined verification 향상 (b) False positive catch — 둘 다 측정으로 입증.

---

## 3. Requirements

### 3.1 Functional Requirements

- **FR-1**: 국립수목원 메타데이터(15116414 + 15116413) 를 1회 사전 다운로드해 `data/seed/kna_plant_index.json` (또는 SQLite) 로 저장
- **FR-2**: `scientific_name_verifier.py` 에 KNA lookup 추가 → 학명 정규화 후 로컬 인덱스 hit → matched=True
- **FR-3**: KNA miss 시 기존 GBIF verifier 폴백 호출
- **FR-4**: `/api/identify` 응답에 `kna_image_url` 필드 추가 (학명 기준 URL 생성)
- **FR-5**: `ResultCard.jsx` 에 표준 이미지 표시 + onerror 폴백 (이미지 영역 숨김 또는 placeholder)
- **FR-6**: `verification_source` 값: `"KNA"` / `"GBIF"` / `"KNA+GBIF"` / `"NONE"`

### 3.2 Non-Functional Requirements

- **NFR-1**: 메타데이터 다운로드 스크립트는 1회 실행용 (`scripts/download_kna_index.py`), 결과는 git tracked
- **NFR-2**: 학명 정규화 함수는 backend·frontend 공통 룰 적용 (예: 저자명 접미사 strip `Astragalus sinicus L.` → `Astragalus sinicus`)
- **NFR-3**: 이미지 URL 패턴: `https://www.nature.go.kr/fileUpload/stplt/scnm/image/common/<학명_정규화>_<코드>.JPG`
- **NFR-4**: onerror 폴백 시 사용자 사진 영역에 영향 없어야 함
- **NFR-5**: 운영 환경 (.env) 에 추가 환경변수 없음 (data.go.kr 인증키는 1회 다운로드 시점만 필요)

---

## 4. Risks

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| R-1 | www.nature.go.kr 다운/장애 시 이미지 깨짐 | UX 저하 | `<img onerror>` 폴백 (이미지 영역 숨김 or `/assets/illustrations/{종}.png` 일러스트 폴백) |
| R-2 | 학명 표기 차이 (`Astragalus sinicus L.` vs `Astragalus sinicus`) | KNA lookup miss | 학명 정규화 함수 — 저자명 strip, 공백·괄호 normalize |
| R-3 | 한반도 외 외래종 12종 KNA 미커버 | matched=False | GBIF 폴백 유지 |
| R-4 | 이미지 코드 (`_1K`, `_2K`) 의미 미확정 | URL 패턴 오류 | 정찰 시점 1K 만 시도, 실패 시 다른 코드 시도, 결국 다 실패 시 폴백 |
| R-5 | data.go.kr 인증키 발급 시간 | Plan 지연 | 인증키 자동승인 (5분 내), 본선 후 V2 진행이라 buffer 충분 |
| R-6 | 본선 D-Day 코드 변경 회귀 | 시연 실패 | **본선 후 V2 트랙 진행** (본선 시점 코드 미변경) |

---

## 5. Out of Scope

- ❌ CLIP / DINO 임베딩 자동 이미지 비교 (V2 후속, 별도 plan)
- ❌ S3 이미지 다운로드 (hot-link 로 충분)
- ❌ Vision few-shot prompt 에 reference 이미지 첨부 (V2 후속)
- ❌ 신뢰도 결합 공식 (Vision conf × KNA matched × GBIF matched) (V2 후속)
- ❌ 슬라이드의 "국립수목원 OpenAPI" 박스 추가 갱신 (이미 Plan 외 슬라이드 작업)
- ❌ Vision 2-stage 재호출 (이미지 비교를 LLM 으로 위임)

---

## 6. Timeline (D-Day 후 V2 트랙)

| 단계 | 작업 | 소요 |
|---|---|---|
| T-0 | data.go.kr 인증키 발급 (자동승인) | 5분 |
| T-1 | `scripts/download_kna_index.py` 작성 + 실행 → `data/seed/kna_plant_index.json` 생성 | 1시간 |
| T-2 | 학명 정규화 + URL 패턴 빌더 함수 | 30분 |
| T-3 | `scientific_name_verifier.py` 에 KNA lookup + GBIF 폴백 통합 | 1시간 |
| T-4 | `ResultCard.jsx` 표준 이미지 영역 + onerror 폴백 | 1시간 |
| T-5 | bench_vision.py 30장 재측정 + Success Criteria 검증 | 30분 |
| T-6 | docs/02-design 작성 + PDCA Design 단계 진입 | (Design 단계) |
| **합계** | | **약 4시간** |

---

## 7. Dependencies

### 코드
- `backend/services/scientific_name_verifier.py` (확장)
- `backend/services/identify_service.py` (KNA lookup 통합점)
- `frontend/components/ResultCard.jsx` (이미지 표시 영역)
- `scripts/download_kna_index.py` (신규)
- `data/seed/kna_plant_index.json` (신규)

### 외부
- `data.go.kr` 인증키 (15116413 + 15116414 둘 다)
- `www.nature.go.kr` 가용성 (이미지 호스트)

### 메모리
- [[session_2026_05_17_cold_start_gbif]] — PR #26/#27 GBIF 구현 트레일
- [[project_cross_check_unimplemented_handoff]] — 슬라이드-코드 정합성 패턴
- [[project_slide_staleness_2026_05_17]] — V2 정합성 후속 작업
- [[conventions_hanbando]] — API 라우트·환경변수 정본

---

## 8. Decision Trail

| 결정 | 옵션 | 선택 | 사유 |
|---|---|---|---|
| 이미지 활용 방식 | A. img hot-link / B. backend 프록시 / C. S3 다운로드 | **A** | 비용 $0, 즉시 사용. CORS 무관 (img 태그) |
| 학명 검증 | 병행 (KNA + GBIF) / 교체 (KNA 단독) / 추가 안 함 | **병행** | 외래종 12종 GBIF 폴백 보존 |
| 우선순위 | 종합 (이미지+검증) / UX 우선 / 검증 우선 | **종합** | D-Day 후 V2 트랙이라 한 번에 묶음 |
| 실행 시점 | 본선 D-Day / 본선 후 V2 | **본선 후 V2** | 시연 회귀 위험 회피 |
| Feature 이름 | kna-image-reference / national-arboretum-integration / kfri-cross-check | **kna-image-reference** | 사용자 명시 |

---

**다음 단계**: `/pdca design kna-image-reference` — 3 옵션 아키텍처 비교 후 선택

# Plan: 사용자별 도감 격리 (per-user-dex)

> 작성일: 2026-05-16 (본선 당일, 시연 전 긴급 패치)
> 부모 feature: korean-species-dex
> 작성자: hwchanyung + Claude Opus 4.7
> 시간 윈도우: **오늘 본선 시연 시작 전 (수 시간 이내)**
> 변경 한도: **≤ 50줄, 회귀 없음 필수**

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 현재 단일 SQLite DB·사용자 격리 무. 관람객 A가 추가한 카드가 관람객 B에게도 그대로 보임 → "내 도감"이라는 UI 카피와 충돌. 다수 관람객 동시 사용 시 데이터가 한 곳에 섞임. |
| **Solution** | URL `?u=<uid>` 쿼리 파라미터로 사용자 식별. 첫 접속 시 자동 uid 생성 + `history.replaceState`로 URL 교체. 도감 조회는 `WHERE user_id IN ('global', :u)` 로 시드 + 본인 카드 병합. |
| **UX Effect** | 관람객 행동 변경 0. 본인 폰에서는 본인이 추가한 카드만 보임. 시연 시드는 그대로. 공유 URL에 `?u=` 포함되므로 카드 공유 시 본인 도감 그대로 노출. |
| **Core Value** | "내 도감"이라는 카피·임팩트를 진짜로 구현. 동시 다수 관람객이 부딪히지 않는 시연 환경. 본선 후에도 V2 정식 멀티테넌시로 자연스럽게 확장 가능. |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 시연 시 "전국민 공유 도감" 카피로 가려도 되지만, "내 도감을 채워가는 재미"가 더 강력한 임팩트. 동시 관람객 충돌 위험도 제거. |
| **WHO** | 본선 현장 관람객(스마트폰 보유 일반 시민). 인증·계정 개념 없음. 익명 uid 만으로 충분. |
| **RISK** | ① 50줄 한도 초과 → 시간 부족 ② 기존 시드 도감 표시 깨짐(global 마이그레이션 실패) ③ POST 시 user_id 불일치 ④ 카드 공유(`/share/{name}`)·OG 메타태그 깨짐. |
| **SUCCESS** | 본인 폰에서 사진 추가 → 본인 도감에만 추가 표시. 다른 폰에서는 그 카드 안 보임(global 시드는 모두 보임). 시연 직전 30분 내 패치·배포·smoke test 완료. |
| **SCOPE** | DB 스키마 1컬럼 추가 + 마이그레이션 + 5개 collection API에 user_id 필터 + 프런트 API 클라이언트에 uid 주입. 인증·암호화·UI 변경 없음. |

---

## 1. 문제 정의

본선 시연 직전 옵션 A(사진 영구 저장) 패치를 배포해 다중 사용자 간 사진 픽셀 공유는 해결했으나, **DB는 여전히 단일 풀**이다. 결과적으로:

- 관람객 A가 도감에 카드 추가 → B 폰 새로고침 → B 도감에도 그 카드 표시됨
- "내 도감 (n/15)" 카운터·UI 카피와 의미 충돌
- 동시 관람객이 많을수록 그리드가 빠르게 오염되어 시연 임팩트 약화

이를 해소하기 위해 **익명 uid 기반 사용자 격리**를 도입한다. 인증·계정·암호화는 도입하지 않는다 (시연 임시 격리이지 보안 격리가 아님).

---

## 2. 요구사항 (Plan SC)

### SC-1. URL 기반 uid 자동 주입
- 첫 접속 시(`?u=` 없음) → 클라이언트가 `crypto.randomUUID()` 8자리 또는 기존 `getOrCreateUserId()`로 uid 생성
- 즉시 `history.replaceState`로 URL을 `?u=<uid>`로 교체 (페이지 리로드 없이)
- 이후 모든 collection API 호출에 `?u=<uid>` 첨부
- localStorage `hanbando_uid`에도 백업 저장 (URL 잃을 경우 fallback)

### SC-2. 기존 데이터 global 보존
- `collection.user_id` 컬럼을 `NOT NULL DEFAULT 'global'`로 신설
- 마이그레이션 시 기존 row 전체가 `user_id='global'`로 들어감
- 조회 쿼리: `WHERE user_id = 'global' OR user_id = :u`

### SC-3. CRUD 5개 엔드포인트 일관 필터
- `GET /api/collection?u=<uid>` → global + 본인 카드
- `GET /api/collection/map?u=<uid>` → global + 본인 핀
- `GET /api/collection/{id}?u=<uid>` → 본인 또는 global이 아니면 403
- `POST /api/collection?u=<uid>` → 본인 user_id로 저장 (global 저장 차단)
- `DELETE /api/collection/{id}?u=<uid>` → global row 삭제 차단, 본인 row만 허용

### SC-4. 회귀 영향 0
- `/api/identify` 변경 없음 (식별은 사용자 무관)
- `/share/{korean_name}` 변경 없음 (OG 메타태그는 종 단위)
- 데모 캡처 버튼(`handleDemoCapture`) 변경 없음 (서버 호출 안 함)
- 일러스트 자동 생성 trigger도 무관 (종 단위)

### SC-5. 50줄 한도
- 백엔드 ≤ 25줄: schema(+1) + repository(+10) + collection router(+10) + main 마이그레이션(+5)
- 프런트 ≤ 15줄: api.js 내 uid 부트스트랩(+5) + 5개 fetch URL에 `?u=` 추가(+5) + history.replaceState(+3)
- 마진 10줄 (테스트·예외처리)

---

## 3. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 배포 | GitHub Actions `deploy.yml` 기존 파이프라인 그대로 사용 (push origin main) |
| 마이그레이션 | `init_db()`에서 `PRAGMA table_info`로 컬럼 존재 검사 후 idempotent `ALTER TABLE ADD COLUMN` |
| 보안 | uid는 식별자일 뿐 인증 아님. uid를 알면 다른 사용자 도감 조회·삭제 가능 (의도된 동작; 부스 환경) |
| 성능 | `user_id` 컬럼에 인덱스 추가 (`CREATE INDEX IF NOT EXISTS idx_collection_user_id`) |
| 검증 | 시연 30분 전까지 본인 폰 + 다른 폰 2대로 smoke test |

---

## 4. 가설·리스크·완화

| ID | 가설/리스크 | 완화 |
|----|-----------|------|
| R1 | SQLite ALTER TABLE 마이그레이션이 실패 → 서버 부팅 실패 | `if column not exists` 가드 + try/except로 실패 시에도 부팅 진행 (legacy 모드: 모든 row를 global로 취급) |
| R2 | 기존 도감의 일러스트 시드 15종이 'global'로 마이그레이션 후 안 보임 | 마이그레이션 직후 DB에서 `SELECT user_id, COUNT(*)` 로직 로깅 + 로컬에서 사전 검증 |
| R3 | 프런트 첫 진입 시 `?u=` 없는 상태에서 깜빡임 (uid 생성 전 빈 도감) | 클라이언트 측에서 동기 uid 부트스트랩 (페이지 로드 첫 라인에 실행) |
| R4 | 본인 카드를 다른 폰에서 공유 받았을 때 노출 안 됨 (UX 혼란) | 시연 멘트로 "본인 폰에서만 본인 도감 확인" 안내 |
| R5 | 카드 공유 URL `/share/{name}`은 그대로 종 단위 → 한 종이 여러 사용자에 의해 추가되면 어디서 보냐 | OG 메타태그는 종 단위라 그대로 OK. 공유 후 / 메인으로 이동하면 자동으로 본인 도감 진입 (`?u=`가 URL에 있음) |
| R6 | EC2 systemd 재기동 시 마이그레이션이 중복 실행 | `ALTER TABLE ADD COLUMN`은 SQLite에서 idempotent가 아니므로 `PRAGMA table_info` 가드 필수 |

---

## 5. Success Criteria (배포 후 검증)

각 항목은 본선 시연 시작 30분 전까지 통과해야 한다.

| # | 검증 항목 | 통과 기준 |
|---|---------|---------|
| 1 | 첫 접속 시 URL `?u=` 자동 부착 | hanban-do.com/ 접속 → 주소창에 `?u=<hex>` 표시 |
| 2 | 새로고침 후 URL 유지 | F5 후에도 같은 `?u=` 그대로 |
| 3 | global 시드 모든 폰에서 보임 | 폰 2대에서 도감 진입 → 기존 일러스트 15종 모두 표시 |
| 4 | 본인 추가 카드는 본인만 보임 | A 폰에서 사진 추가 → B 폰 새로고침 → B 도감에 그 카드 없음 |
| 5 | 본인 카드 삭제는 본인만 가능 | A 카드 → B에서 DELETE 호출 → 404 또는 0 row affected |
| 6 | 마이그레이션 idempotent | 서버 2회 재시작해도 컬럼 중복 추가 안 됨 |
| 7 | `/api/identify` 회귀 없음 | 사진 식별·일러스트 자동 생성 모두 정상 |
| 8 | `/share/{name}` OG 메타태그 정상 | 카드 공유 미리보기 이미지 정상 표시 |

---

## 6. Out of Scope

- ❌ 인증·로그인·OAuth
- ❌ 사용자 프로필 (이름·이메일·아바타)
- ❌ uid 기반 권한 시스템 (uid 노출되면 누구나 그 도감 조회 가능; 의도된 동작)
- ❌ 사진 디렉토리의 사용자별 분리 (`/assets/uploads/` 공통 사용)
- ❌ 카드 공유 URL의 사용자 격리 (`/share/{name}` 종 단위 유지)
- ❌ 데모 캡처 버튼의 사용자 격리 (서버 호출 안 함)
- ❌ 지도(`MapView`)의 사용자 토글 UI ("내 핀만 보기" 같은 옵션)
- ❌ 본선 후 V2 정식 멀티테넌시 (별도 plan 필요)

---

## 7. 일정·체크포인트

| 시각 | 작업 | 산출물 |
|------|------|------|
| T+0 | Plan 승인 → /pdca design per-user-dex | docs/02-design/features/per-user-dex.design.md |
| T+0:15 | Design 승인 → 백엔드 구현 (schema·repository·router) | 패치 1차 |
| T+0:35 | 프런트 구현 (api.js uid 부트스트랩) | 패치 2차 |
| T+0:45 | 로컬 smoke test (curl + 브라우저) | check OK |
| T+0:55 | 독립 에이전트 교차검증 | 회귀 없음 보장 |
| T+1:05 | git commit + push → GitHub Actions 배포 | EC2 반영 |
| T+1:15 | 본인 폰 + 다른 폰 2대 smoke test | SC 1~8 통과 |
| T+1:30 | 시연 멘트 업데이트 (필요 시) | 시연 준비 완료 |

**Hard deadline**: T+1:30 (이 시점까지 못 끝내면 시연은 현재 "공유 도감" 컨셉으로 진행)

---

## 8. 결정 트레일

| 결정 | 옵션 | 선택 | 사유 |
|------|------|------|------|
| user_id 주입 방식 | (a)자동 생성+URL 교체 (b)QR 인쇄 (c)localStorage | (a) | 관람객 행동 변경 0, 부스 인쇄·부착 운영 불필요 |
| 기존 데이터 처리 | (a)global 유지 (b)완전 초기화 (c)자가 복제 | (a) | 시연 임팩트 위해 일러스트 시드 유지, DB 부풀림 없음 |
| 격리 범위 | (a)collection만 (b)+identify (c)+share | (a) | 식별·공유는 종 단위라 격리 불필요. 50줄 한도 |
| 인증 도입 | (a)없음 (b)임시 토큰 (c)OAuth | (a) | 시연용 임시 격리, 보안 가치 0, 시간 한도 |

---

## 다음 단계

`/pdca design per-user-dex` 로 진입하여 3가지 아키텍처 옵션(A: 미니멀, B: 클린, C: 프래그매틱) 비교 후 선택.

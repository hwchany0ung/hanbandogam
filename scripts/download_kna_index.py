"""KNA (Korea National Arboretum) 표준식물목록 OpenAPI 일괄 다운로드 + 로컬 인덱스 생성.

Design Ref: kna-image-reference §2.1 M1 Index Downloader
사용처: data.go.kr 두 OpenAPI 호출 → data/seed/kna_plant_index.json 생성 (1회 작업)

소스 API (둘 다 data.go.kr 인증키 필요):
  - 15116414: 표준식물목록이미지정보서비스 (학명, 국명, 이미지종류, 이미지파일경로)
  - 15116413: 표준식물목록기준표본정보서비스 (학명, 국명, 기준표본타입, 기준표본내용)

실행:
  $env:DATA_GO_KR_API_KEY = "여기에-인증키"   # PowerShell
  python scripts/download_kna_index.py

  # 결과: data/seed/kna_plant_index.json (학명 정규화 key 기준 머지)
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

# Windows 콘솔 한글 안전
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass

# backend.services.scientific_name_verifier 의 normalize_scientific_name 재사용
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.services.scientific_name_verifier import normalize_scientific_name  # noqa: E402

API_BASE = "https://api.odcloud.kr/api"
ENDPOINT_IMAGE = "15116414/v1/uddi:b63f89a7-c57b-43c6-8868-f68d44ce17e5"  # 이미지정보
ENDPOINT_SPECIMEN = "15116413/v1/uddi:61af5330-6b47-4764-8c0c-e284b0c65d94"  # 기준표본정보 (Swagger 명세 확인)

PER_PAGE = 1000  # 한 페이지에 최대 — API limit 따라 조정
RATE_LIMIT_SLEEP = 0.2  # 호출 간 sleep (sec)
TIMEOUT = 15

OUT_PATH = ROOT / "data" / "seed" / "kna_plant_index.json"


def _api_key() -> str:
    key = os.getenv("DATA_GO_KR_API_KEY", "").strip()
    if not key:
        print("[ERROR] DATA_GO_KR_API_KEY 환경변수가 설정 안 됨.", file=sys.stderr)
        print("        PowerShell: $env:DATA_GO_KR_API_KEY = '발급키'", file=sys.stderr)
        sys.exit(1)
    return key


def _fetch_page(endpoint: str, page: int, per_page: int, api_key: str) -> dict[str, Any]:
    qs = urlencode({
        "page": page,
        "perPage": per_page,
        "serviceKey": api_key,
        "returnType": "JSON",
    })
    url = f"{API_BASE}/{endpoint}?{qs}"
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _iterate_all(endpoint: str, api_key: str, label: str) -> list[dict[str, Any]]:
    """모든 페이지 순회. totalCount 기준 page 수 계산."""
    print(f"[{label}] page 1 fetching...", flush=True)
    first = _fetch_page(endpoint, 1, PER_PAGE, api_key)
    total = int(first.get("totalCount") or 0)
    rows: list[dict[str, Any]] = list(first.get("data") or [])
    pages = (total + PER_PAGE - 1) // PER_PAGE if total else 1
    print(f"[{label}] totalCount={total}, pages={pages}, perPage={PER_PAGE}", flush=True)

    for p in range(2, pages + 1):
        time.sleep(RATE_LIMIT_SLEEP)
        try:
            page_data = _fetch_page(endpoint, p, PER_PAGE, api_key)
            rows.extend(page_data.get("data") or [])
            print(f"[{label}] page {p}/{pages} ok (accum={len(rows)})", flush=True)
        except Exception as exc:
            print(f"[{label}] page {p} FAILED: {exc}", file=sys.stderr, flush=True)
            time.sleep(2)
            # 재시도 1회
            try:
                page_data = _fetch_page(endpoint, p, PER_PAGE, api_key)
                rows.extend(page_data.get("data") or [])
                print(f"[{label}] page {p} retry ok", flush=True)
            except Exception as exc2:
                print(f"[{label}] page {p} retry FAILED: {exc2}", file=sys.stderr, flush=True)
    print(f"[{label}] DONE rows={len(rows)}", flush=True)
    return rows


def _build_index(image_rows: list[dict], specimen_rows: list[dict]) -> dict[str, dict]:
    """학명 정규화 key 기준 머지."""
    index: dict[str, dict] = {}

    # 이미지 row 처리
    for row in image_rows:
        sci = (row.get("학명") or "").strip()
        if not sci:
            continue
        key = normalize_scientific_name(sci)
        if not key:
            continue
        entry = index.setdefault(key, {
            "korean_name": (row.get("국명") or "").strip() or None,
            "images": [],
            "specimen_type": None,
            "specimen_content": None,
        })
        url = (row.get("이미지파일경로") or "").strip()
        img_type = (row.get("이미지종류") or "").strip()
        if url:
            entry["images"].append({"type": img_type, "url": url})

    # 기준표본 row 처리
    for row in specimen_rows:
        sci = (row.get("학명") or "").strip()
        if not sci:
            continue
        key = normalize_scientific_name(sci)
        if not key:
            continue
        entry = index.setdefault(key, {
            "korean_name": (row.get("국명") or "").strip() or None,
            "images": [],
            "specimen_type": None,
            "specimen_content": None,
        })
        # 첫 표본만 keep (중복 학명 케이스 단순 처리)
        if entry["specimen_type"] is None:
            entry["specimen_type"] = (row.get("기준표본타입") or "").strip() or None
            entry["specimen_content"] = (row.get("기준표본내용") or "").strip() or None
        if not entry.get("korean_name"):
            entry["korean_name"] = (row.get("국명") or "").strip() or None

    return index


def main() -> None:
    api_key = _api_key()
    print(f"[bench] DATA_GO_KR_API_KEY OK (len={len(api_key)})", flush=True)

    image_rows = _iterate_all(ENDPOINT_IMAGE, api_key, "IMAGE")
    specimen_rows = _iterate_all(ENDPOINT_SPECIMEN, api_key, "SPECIMEN")

    index = _build_index(image_rows, specimen_rows)
    print(f"[index] built {len(index)} unique species (normalized keys)", flush=True)

    image_count = sum(len(e.get("images") or []) for e in index.values())
    payload = {
        "_meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "data.go.kr/15116414 (image) + data.go.kr/15116413 (specimen)",
            "total_species": len(index),
            "image_count": image_count,
            "image_host": "https://www.nature.go.kr",
            "normalizer_rule": "Genus species (2-word, lowercase species, strip authors)",
        },
        "index": index,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    size_mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"[ok] wrote {OUT_PATH} ({size_mb:.2f} MB)", flush=True)


if __name__ == "__main__":
    main()

"""본선 28장 측정 데이터의 학명 GBIF 매칭률 산출.

용도: Q&A 답변에 "교차검증 매칭률 N%" 수치 제공.

사용: python scripts/measure_gbif_matchrate.py
입력: docs/bench/results.json (per_image[*].expected_species)
      없으면 backend/demo_cache/*.json 의 scientific_name 으로 fallback 측정.
출력: stdout 매칭률 통계
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# backend services import (sys.path 주입)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.services.scientific_name_verifier import verify_scientific_name

RESULTS_PATH = ROOT / "docs" / "bench" / "results.json"
DEMO_CACHE_DIR = ROOT / "backend" / "demo_cache"


def _load_samples() -> tuple[list[dict], str]:
    """샘플 학명 리스트 반환. (samples, source_label)."""
    if RESULTS_PATH.exists():
        data = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
        return data.get("per_image", []), f"results.json ({RESULTS_PATH})"

    # Fallback: backend/demo_cache/*.json
    samples: list[dict] = []
    if DEMO_CACHE_DIR.exists():
        for jf in sorted(DEMO_CACHE_DIR.glob("*.json")):
            try:
                d = json.loads(jf.read_text(encoding="utf-8"))
                samples.append({
                    "expected_species": d.get("scientific_name"),
                    "predicted_species": d.get("scientific_name"),
                    "_source_file": jf.name,
                })
            except Exception:
                continue
    return samples, f"demo_cache fallback ({DEMO_CACHE_DIR})"


def main():
    per_image, source_label = _load_samples()
    if not per_image:
        print(f"[ERROR] no samples found. checked: {RESULTS_PATH} and {DEMO_CACHE_DIR}")
        sys.exit(1)

    print(f"입력 소스:    {source_label}")
    print(f"총 표본:      {len(per_image)}장")

    matched_count = 0
    rejected_count = 0
    high_conf_count = 0  # confidence >= 95
    failed_names = []

    for item in per_image:
        sci = item.get("expected_species") or item.get("predicted_species")
        if not sci or sci == "N/A":
            rejected_count += 1
            continue
        v = verify_scientific_name(sci)
        if v["matched"]:
            matched_count += 1
            if v["confidence"] >= 95:
                high_conf_count += 1
        else:
            failed_names.append((sci, v["source"], v["confidence"]))

    total_checked = len(per_image) - rejected_count
    rate = (matched_count / total_checked * 100) if total_checked > 0 else 0
    high_rate = (high_conf_count / total_checked * 100) if total_checked > 0 else 0

    print(f"\n=== GBIF 매칭 결과 ===")
    print(f"검증 시도:    {total_checked}장 (N/A 제외 {rejected_count}장)")
    print(f"매칭 성공:    {matched_count}장 ({rate:.1f}%)")
    print(f"high-conf:    {high_conf_count}장 ({high_rate:.1f}%) [confidence >= 95]")
    print(f"매칭 실패:    {len(failed_names)}장")

    if failed_names:
        print(f"\n실패 학명 (Q&A 답변 시 참고):")
        for sci, src, conf in failed_names[:10]:
            print(f"  - {sci} ({src}, conf={conf})")


if __name__ == "__main__":
    main()

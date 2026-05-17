"""한반도감 AI 정확도 벤치 — 27장 측정."""

from __future__ import annotations

import io
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# Windows 콘솔 한글 출력 안전화
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
# 실사 사진 위치 (s3 worktree)
IMG_DIR = Path("C:/Users/chany/SideProject/2026HACKTON-s3/frontend/assets/photos")
INVASIVE_JSON = ROOT / "data" / "seed" / "invasive_species.json"
OUT_DIR = ROOT / "docs" / "bench"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_JSON = OUT_DIR / "results.json"
RESULTS_MD = OUT_DIR / "results.md"

API_URL = "http://localhost:8000/api/identify"
TIMEOUT = 180
SLEEP_BETWEEN = 1.0
MODEL_NAME = "claude-sonnet-4-6"


def _load_invasive_set() -> set[str]:
    data = json.loads(INVASIVE_JSON.read_text(encoding="utf-8"))
    names = set()
    for sp in data.get("species", []):
        kn = sp.get("korean_name")
        if kn:
            names.add(kn.strip())
    return names


def _parse_filename(fname: str) -> tuple[str, str] | None:
    # 두 가지 패턴 지원
    m = re.match(r"plant_(\d+)_(.+)\.png$", fname)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"(.+)\.jpe?g$", fname, re.IGNORECASE)
    if m:
        return "0", m.group(1)
    return None


def _call_api(path: Path) -> tuple[dict | None, str | None]:
    try:
        suffix = path.suffix.lower()
        mt = "image/jpeg" if suffix in (".jpg", ".jpeg") else "image/png"
        with path.open("rb") as fh:
            files = {"file": (path.name, fh, mt)}
            data = {"memo": "bench"}
            resp = requests.post(API_URL, files=files, data=data, timeout=TIMEOUT)
        if resp.status_code != 200:
            return None, f"http_{resp.status_code}: {resp.text[:200]}"
        try:
            return resp.json(), None
        except Exception as e:
            return None, f"json_parse: {e}"
    except Exception as e:
        return None, f"request: {e}"


def _confidence_bucket(c: float) -> str:
    if c >= 0.9:
        return ">=0.9"
    if c >= 0.7:
        return "0.7-0.9"
    if c >= 0.5:
        return "0.5-0.7"
    return "<0.5"


def main() -> None:
    invasive_set = _load_invasive_set()
    files = sorted(
        p for p in IMG_DIR.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png")
    )
    # 동일 종명에 .jpg/.png 둘 다 있으면 .jpg 우선
    by_name: dict[str, Path] = {}
    for p in files:
        parsed = _parse_filename(p.name)
        if not parsed:
            continue
        key = parsed[1]
        if key in by_name:
            if p.suffix.lower() in (".jpg", ".jpeg") and by_name[key].suffix.lower() == ".png":
                by_name[key] = p
        else:
            by_name[key] = p
    files = sorted(by_name.values(), key=lambda p: p.name)
    total = len(files)
    print(f"[bench] total={total}, invasive_set_size={len(invasive_set)}", flush=True)

    per_image: list[dict] = []
    api_failures = 0
    json_failures = 0
    species_exact_hits = 0
    species_substring_hits = 0
    native_hits = 0
    unclear_count = 0
    confidence_sum = 0.0
    confidence_buckets = {">=0.9": 0, "0.7-0.9": 0, "0.5-0.7": 0, "<0.5": 0}
    native_count_total = 0
    invasive_count_total = 0
    precision_at_07_hits = 0
    precision_at_07_denom = 0
    recall_at_07_hits = 0

    for idx, p in enumerate(files, 1):
        parsed = _parse_filename(p.name)
        if not parsed:
            print(f"[skip] {p.name}", flush=True)
            continue
        _, expected_species = parsed
        expected_native = "외래종" if expected_species in invasive_set else "토종"
        if expected_native == "토종":
            native_count_total += 1
        else:
            invasive_count_total += 1

        body, err = _call_api(p)
        if err and body is None:
            # retry once
            print(f"[retry] {p.name}: {err}", flush=True)
            time.sleep(2.0)
            body, err = _call_api(p)

        if body is None:
            api_failures += 1
            per_image.append({
                "file": p.name,
                "expected_species": expected_species,
                "expected_native": expected_native,
                "predicted_species": None,
                "predicted_native": None,
                "confidence": None,
                "match_species_exact": False,
                "match_species_substring": False,
                "match_native": False,
                "error": err,
            })
            print(f"[fail {idx}/{total}] {p.name}: {err}", flush=True)
            time.sleep(SLEEP_BETWEEN)
            continue

        # treat missing required field as json failure
        required = ["korean_name", "native_status", "confidence"]
        if not all(k in body for k in required):
            json_failures += 1

        predicted_species = str(body.get("korean_name", "")).strip()
        predicted_native = str(body.get("native_status", "")).strip()
        try:
            confidence = float(body.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
            json_failures += 1

        match_exact = predicted_species == expected_species
        match_sub = (
            bool(predicted_species)
            and (
                expected_species in predicted_species
                or predicted_species in expected_species
            )
        )
        if predicted_native == "불명확":
            unclear_count += 1
            match_native = False
        else:
            match_native = predicted_native == expected_native

        if match_exact:
            species_exact_hits += 1
        if match_sub:
            species_substring_hits += 1
        if match_native:
            native_hits += 1

        confidence_sum += confidence
        confidence_buckets[_confidence_bucket(confidence)] += 1

        if confidence >= 0.7:
            precision_at_07_denom += 1
            recall_at_07_hits += 1
            if match_exact:
                precision_at_07_hits += 1

        per_image.append({
            "file": p.name,
            "expected_species": expected_species,
            "expected_native": expected_native,
            "predicted_species": predicted_species,
            "predicted_native": predicted_native,
            "confidence": round(confidence, 3),
            "match_species_exact": match_exact,
            "match_species_substring": match_sub,
            "match_native": match_native,
            # kna-image-reference §6.1 — verification_source 분포 산출
            "verification_source": body.get("verification_source"),
            "verification_matched": body.get("verification_matched"),
            "verification_confidence": body.get("verification_confidence"),
            "kna_image_url": body.get("kna_image_url"),
        })
        print(
            f"[{idx}/{total}] {p.name} -> {predicted_species} ({predicted_native}, {confidence:.2f}) "
            f"exact={match_exact} sub={match_sub} native={match_native}",
            flush=True,
        )
        time.sleep(SLEEP_BETWEEN)

    success_n = total - api_failures
    safe = lambda n, d: round(n / d, 4) if d else 0.0
    metrics = {
        "species_top1_exact": safe(species_exact_hits, total),
        "species_top1_substring": safe(species_substring_hits, total),
        "native_binary_accuracy": safe(native_hits, total),
        "unclear_count": unclear_count,
        "avg_confidence": round(confidence_sum / success_n, 4) if success_n else 0.0,
        "confidence_distribution": confidence_buckets,
        "precision_at_07": safe(precision_at_07_hits, precision_at_07_denom),
        "recall_at_07": safe(recall_at_07_hits, total),
        "json_failures": json_failures,
        "api_failures": api_failures,
    }
    meta = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": MODEL_NAME,
        "sample_size": total,
        "native_count": native_count_total,
        "invasive_count": invasive_count_total,
        "api_url": API_URL,
    }
    payload = {"meta": meta, "metrics": metrics, "per_image": per_image}
    RESULTS_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[bench] wrote {RESULTS_JSON}", flush=True)

    # Markdown
    lines: list[str] = []
    lines.append("# 한반도감 AI 정확도 벤치 결과")
    lines.append("")
    lines.append(
        f"**1줄 요약**: 종명 정확률 {metrics['species_top1_exact']*100:.1f}% "
        f"(substring {metrics['species_top1_substring']*100:.1f}%), "
        f"토종/외래 분류 {metrics['native_binary_accuracy']*100:.1f}%, "
        f"평균 신뢰도 {metrics['avg_confidence']:.2f}"
    )
    lines.append("")
    lines.append("## 측정 메타")
    lines.append("")
    lines.append("| 항목 | 값 |")
    lines.append("|---|---|")
    lines.append(f"| 타임스탬프 | {meta['timestamp']} |")
    lines.append(f"| 모델 | {meta['model']} |")
    lines.append(f"| 표본 수 | {meta['sample_size']} |")
    lines.append(f"| 토종 | {meta['native_count']} |")
    lines.append(f"| 외래 | {meta['invasive_count']} |")
    lines.append(f"| API | {meta['api_url']} |")
    lines.append("")
    lines.append("## 지표")
    lines.append("")
    lines.append("| 지표 | 값 |")
    lines.append("|---|---|")
    lines.append(f"| 종명 top-1 정확률 (exact) | {metrics['species_top1_exact']*100:.1f}% |")
    lines.append(f"| 종명 top-1 정확률 (substring) | {metrics['species_top1_substring']*100:.1f}% |")
    lines.append(f"| 토종/외래 이진 분류 정확률 | {metrics['native_binary_accuracy']*100:.1f}% |")
    lines.append(f"| 평균 신뢰도 | {metrics['avg_confidence']:.3f} |")
    lines.append(f"| precision@0.7 | {metrics['precision_at_07']*100:.1f}% |")
    lines.append(f"| recall@0.7 | {metrics['recall_at_07']*100:.1f}% |")
    lines.append(f"| 불명확 응답 | {metrics['unclear_count']} |")
    lines.append(f"| JSON 파싱 실패 | {metrics['json_failures']} |")
    lines.append(f"| API 호출 실패 | {metrics['api_failures']} |")
    lines.append("")
    lines.append("## 신뢰도 분포")
    lines.append("")
    lines.append("| 구간 | 개수 |")
    lines.append("|---|---|")
    for k, v in confidence_buckets.items():
        lines.append(f"| {k} | {v} |")
    lines.append("")

    # 실패 사례 3건
    fails = [r for r in per_image if not r.get("match_species_exact")]
    if fails:
        lines.append("## 실패 사례 (top-1 exact 미일치) — 최대 3건")
        lines.append("")
        for r in fails[:3]:
            lines.append(
                f"- `{r['file']}` 정답={r['expected_species']} → 예측={r.get('predicted_species')} "
                f"({r.get('predicted_native')}, conf={r.get('confidence')})"
            )
        lines.append("")

    # cutoff 관측 (0.5→0.7 구간 정확률 비교)
    bucket_05_07 = [
        r for r in per_image if r.get("confidence") is not None and 0.5 <= r["confidence"] < 0.7
    ]
    bucket_ge_07 = [
        r for r in per_image if r.get("confidence") is not None and r["confidence"] >= 0.7
    ]
    acc_05_07 = (
        sum(1 for r in bucket_05_07 if r["match_species_exact"]) / len(bucket_05_07)
        if bucket_05_07 else 0.0
    )
    acc_ge_07 = (
        sum(1 for r in bucket_ge_07 if r["match_species_exact"]) / len(bucket_ge_07)
        if bucket_ge_07 else 0.0
    )
    delta_pp = round((acc_ge_07 - acc_05_07) * 100, 1)
    cutoff_observation = (
        f"0.5~0.7 구간 정확률 {acc_05_07*100:.1f}% (n={len(bucket_05_07)}) → "
        f">=0.7 구간 정확률 {acc_ge_07*100:.1f}% (n={len(bucket_ge_07)}), "
        f"{'+' if delta_pp >= 0 else ''}{delta_pp}p 변화"
    )
    json_failure_rate_pct = round(
        (metrics["json_failures"] / total) * 100, 1
    ) if total else 0.0

    lines.append("## 슬라이드 S7 검증 패널용 카피 (Track D)")
    lines.append("")
    lines.append("```")
    lines.append(f"표본 {meta['sample_size']}장 측정 (토종 {meta['native_count']} + 외래 {meta['invasive_count']})")
    lines.append(
        f"종명 정확률 {metrics['species_top1_exact']*100:.0f}% · "
        f"토종/외래 분류 {metrics['native_binary_accuracy']*100:.0f}%"
    )
    lines.append(
        f"신뢰도 ≥0.7 cutoff precision {metrics['precision_at_07']*100:.0f}%"
    )
    lines.append("```")
    lines.append("")
    lines.append("## Q&A Q1 답변용 카피 (Track E)")
    lines.append("")
    lines.append("```")
    lines.append(f"[BENCH:species_top1] = {metrics['species_top1_exact']*100:.1f}%")
    lines.append(f"[BENCH:native_binary] = {metrics['native_binary_accuracy']*100:.1f}%")
    lines.append(f"[BENCH:precision_at_07] = {metrics['precision_at_07']*100:.1f}%")
    lines.append(f"[BENCH:cutoff_observation] = \"{cutoff_observation}\"")
    lines.append(f"[BENCH:json_failure_rate] = {json_failure_rate_pct}%")
    lines.append("```")
    lines.append("")

    RESULTS_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"[bench] wrote {RESULTS_MD}", flush=True)


if __name__ == "__main__":
    main()

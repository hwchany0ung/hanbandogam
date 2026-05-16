"""신규 종 일러스트 자동 생성 트리거 (GitHub Actions workflow_dispatch).

도감 저장 직후 BackgroundTasks 로 호출되어 비동기로 GH API 를 호출한다.
실패해도 메인 흐름에 영향 없음 (로그만 남김).
"""
from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from pathlib import Path

logger = logging.getLogger(__name__)

# 환경변수
GITHUB_TOKEN = os.getenv("GITHUB_DISPATCH_TOKEN", "").strip()
GITHUB_REPO = os.getenv("GITHUB_REPO", "hwchany0ung/hanbandogam").strip()
WORKFLOW_FILE = "generate-illust.yml"

# 일러스트 저장 경로 (Backend → Frontend assets)
ILLUST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "assets" / "illustrations"


def illustration_exists(korean_name: str) -> bool:
    """프론트엔드 디렉토리에 PNG가 이미 있는지 정확 매칭으로 확인.

    "족도리풀" 검색 시 "개족도리풀.png" 매칭 막기 위해 substring 매칭 X.
    """
    if not korean_name:
        return False
    # 1) 컨벤션 경로 정확 매칭: {name}.png
    convention = ILLUST_DIR / f"{korean_name}.png"
    if convention.exists() and convention.stat().st_size > 1000:
        return True
    # 2) plant_NNN_{name}.png 패턴 정확 매칭 (seed 데이터)
    suffix = f"_{korean_name}.png"
    if ILLUST_DIR.exists():
        for f in ILLUST_DIR.iterdir():
            if (
                f.is_file()
                and f.name.startswith("plant_")
                and f.name.endswith(suffix)
                and f.stat().st_size > 1000
            ):
                return True
    return False


def trigger_illustration_generation(korean_name: str, native_status: str) -> bool:
    """GitHub Actions workflow_dispatch 호출.

    Returns:
        True if API call succeeded (workflow triggered), False otherwise.
    """
    if not korean_name:
        logger.info("[illust-trigger] empty name, skip")
        return False

    if not GITHUB_TOKEN:
        logger.warning("[illust-trigger] GITHUB_DISPATCH_TOKEN not set, skip")
        return False

    # 이미 PNG 있으면 트리거 안 함
    if illustration_exists(korean_name):
        logger.info(f"[illust-trigger] PNG already exists for {korean_name}, skip")
        return False

    # native_status 정규화
    status = native_status if native_status in ("토종", "외래종") else "토종"

    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{WORKFLOW_FILE}/dispatches"
    body = json.dumps({
        "ref": "main",
        "inputs": {
            "name": korean_name,
            "status": status,
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "hanbando-illust-trigger/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            # GitHub API returns 204 No Content on success
            if 200 <= resp.status < 300:
                logger.info(f"[illust-trigger] triggered for {korean_name} ({status})")
                return True
            logger.warning(f"[illust-trigger] unexpected status {resp.status} for {korean_name}")
            return False
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8", errors="replace")
        except Exception:
            err_body = "<no body>"
        logger.error(f"[illust-trigger] HTTPError {e.code} for {korean_name}: {err_body}")
        return False
    except Exception as e:
        logger.error(f"[illust-trigger] {type(e).__name__} for {korean_name}: {e}")
        return False

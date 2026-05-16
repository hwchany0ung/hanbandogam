"""신규 종 이야기 자동 생성 트리거 (GitHub Actions workflow_dispatch).

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

GITHUB_TOKEN = os.getenv("GITHUB_DISPATCH_TOKEN", "").strip()
GITHUB_REPO = os.getenv("GITHUB_REPO", "hwchany0ung/hanbandogam").strip()
WORKFLOW_FILE = "generate-story.yml"

# 프론트엔드 stories.json 경로
STORIES_FILE = Path(__file__).resolve().parents[2] / "frontend" / "data" / "stories.json"


def story_exists(korean_name: str) -> bool:
    """이미 이야기가 등록돼 있는지 확인."""
    if not korean_name or not STORIES_FILE.exists():
        return False
    try:
        data = json.loads(STORIES_FILE.read_text(encoding="utf-8"))
        return korean_name in data and len(data[korean_name].strip()) >= 30
    except Exception:
        return False


def trigger_story_generation(korean_name: str) -> bool:
    """GitHub Actions workflow_dispatch 호출.

    Returns True if API call succeeded, False otherwise.
    """
    if not korean_name:
        return False
    if not GITHUB_TOKEN:
        logger.warning("[story-trigger] GITHUB_DISPATCH_TOKEN not set, skip")
        return False
    if story_exists(korean_name):
        logger.info(f"[story-trigger] story already exists for {korean_name}, skip")
        return False

    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{WORKFLOW_FILE}/dispatches"
    body = json.dumps({
        "ref": "main",
        "inputs": {"name": korean_name},
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
            "User-Agent": "hanbando-story-trigger/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if 200 <= resp.status < 300:
                logger.info(f"[story-trigger] triggered for {korean_name}")
                return True
            return False
    except urllib.error.HTTPError as e:
        logger.error(f"[story-trigger] HTTPError {e.code} for {korean_name}")
        return False
    except Exception as e:
        logger.error(f"[story-trigger] {type(e).__name__} for {korean_name}: {e}")
        return False

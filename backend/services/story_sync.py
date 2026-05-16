"""신규 종 이야기 동기 생성 + DB 캐시 + stories.json fallback.

Design Ref: §5.2 — 콜드스타트 UX, Claude Haiku 직접 호출.
Plan SC: SC-3 (응답 ≤15초), SC-5 (이야기 퀄리티 동등 via build_prompt 재사용).

캐시 우선순위:
1. DB species.story (가장 빠름, 신규 종이 한 번 생성되면 영구)
2. frontend/data/stories.json (seed 데이터, 기존 24종)
3. Claude Haiku 호출 (cache miss)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parent.parent.parent
_SCRIPTS = _ROOT / "scripts"
_STORIES_JSON = _ROOT / "frontend" / "data" / "stories.json"

if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

try:
    from generate_story import generate as claude_generate_story, build_prompt  # noqa: F401
except ImportError as exc:
    logger.warning("[story_sync] scripts.generate_story import 실패: %s", exc)
    claude_generate_story = None  # type: ignore

try:
    from backend.db.repository import get_story, set_story
except ImportError:
    try:
        from db.repository import get_story, set_story  # type: ignore
    except ImportError as exc:
        logger.warning("[story_sync] repository import 실패: %s", exc)
        get_story = None  # type: ignore
        set_story = None  # type: ignore


def _load_stories_json() -> dict:
    """frontend/data/stories.json 읽기. 실패 시 빈 dict."""
    try:
        if _STORIES_JSON.exists():
            return json.loads(_STORIES_JSON.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("[story_sync] stories.json 읽기 실패: %s", exc)
    return {}


def _fallback_text(korean_name: str) -> str:
    """API 실패 시 사용자에게 보여줄 기본 텍스트."""
    return f"{korean_name}의 자세한 이야기는 곧 추가됩니다. 지금은 위 생태 정보를 참고해주세요."


async def get_or_create_story(
    korean_name: str,
    timeout: float = 6.0,
) -> Optional[str]:
    """이야기 캐시/생성. 항상 텍스트 반환 (실패 시 fallback 텍스트).

    Returns:
        - 캐시 hit: DB 또는 stories.json 의 기존 이야기
        - 캐시 miss: Claude Haiku 응답 + DB 영구 저장
        - 모두 실패: fallback 텍스트 (None 아님 — UX 일관성)
    """
    if not korean_name or korean_name == "해당 없음":
        return None

    # 1. DB 캐시
    if get_story is not None:
        try:
            cached = get_story(korean_name)
            if cached:
                logger.info("[story_sync] DB cache hit: %s", korean_name)
                return cached
        except Exception as exc:
            logger.warning("[story_sync] DB get_story 실패: %s", exc)

    # 2. stories.json fallback (기존 24종)
    seed_stories = _load_stories_json()
    seed = seed_stories.get(korean_name)
    if seed:
        logger.info("[story_sync] stories.json hit: %s", korean_name)
        # DB 에도 캐싱 (다음 호출 시 빠르게)
        if set_story is not None:
            try:
                set_story(korean_name, seed)
            except Exception as exc:
                logger.warning("[story_sync] DB set_story 실패 (seed 저장): %s", exc)
        return seed

    # 3. Claude Haiku 호출
    if claude_generate_story is None:
        logger.warning("[story_sync] Claude 함수 사용 불가, fallback")
        return _fallback_text(korean_name)

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        logger.warning("[story_sync] ANTHROPIC_API_KEY 미설정, fallback")
        return _fallback_text(korean_name)

    logger.info("[story_sync] cache miss → Claude Haiku 호출: %s", korean_name)

    # 동기 호출을 별도 스레드에서 실행 (async event loop block 회피)
    loop = asyncio.get_event_loop()
    try:
        text = await asyncio.wait_for(
            loop.run_in_executor(None, claude_generate_story, korean_name, api_key),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("[story_sync] Claude timeout %s초", timeout)
        return _fallback_text(korean_name)
    except Exception as exc:
        logger.error("[story_sync] Claude 호출 예외: %s: %s", type(exc).__name__, exc)
        return _fallback_text(korean_name)

    if not text:
        logger.warning("[story_sync] Claude 빈 응답")
        return _fallback_text(korean_name)

    # DB 영구 저장 (실패해도 응답엔 텍스트 포함)
    if set_story is not None:
        try:
            set_story(korean_name, text)
        except Exception as exc:
            logger.warning("[story_sync] DB set_story 실패: %s", exc)

    return text

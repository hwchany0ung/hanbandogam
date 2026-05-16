import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

try:
    from backend.db import repository
    from backend.db.repository import get_story
    from backend.domain.types import CollectionAddRequest, CollectionItem, MapPoint
    from backend.services.geocode import reverse_geocode
    from backend.services.illust_trigger import trigger_illustration_generation
    from backend.services.story_trigger import trigger_story_generation
except ImportError:
    from db import repository  # type: ignore
    from db.repository import get_story  # type: ignore
    from domain.types import CollectionAddRequest, CollectionItem, MapPoint  # type: ignore
    from services.geocode import reverse_geocode  # type: ignore
    from services.illust_trigger import trigger_illustration_generation  # type: ignore
    from services.story_trigger import trigger_story_generation  # type: ignore


router = APIRouter(prefix="/api/collection", tags=["collection"])

# 일러스트 캐시 디렉토리
ILLUST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "assets" / "illustrations"

# S3 일러스트 URL 생성 (HeadObject 호출 없이 URL 만 — frontend 가 404 fallback)
_BUCKET = os.getenv("AWS_S3_BUCKET_NAME", "").strip()
_REGION = os.getenv("AWS_REGION", "ap-northeast-2").strip()


def _make_illust_url(korean_name: str) -> Optional[str]:
    if not _BUCKET or not korean_name:
        return None
    safe = korean_name.strip().replace("/", "").replace("..", "").replace("\\", "")
    return f"https://{_BUCKET}.s3.{_REGION}.amazonaws.com/illustrations/{safe}.png"


# Design Ref: §4.1 — URL ?u= 쿼리에서 사용자 식별자 추출, 미지정 시 'global'
def get_user_id(u: str = Query("global", min_length=1, max_length=64)) -> str:
    return u or "global"


@router.get("/map", response_model=list[MapPoint])
def get_map_points(u: str = Depends(get_user_id)):
    return repository.get_map_points(u)


@router.get("")
def list_collection(u: str = Depends(get_user_id)):
    # Design Ref: §5.4 — 콜드스타트 UX: 응답에 story + illustration_url 포함
    # 시연 컬렉션 ~20개 미만이라 N+1 SQL 허용; S3 는 HeadObject 없이 URL 만 생성 (frontend 가 404 fallback)
    items = repository.get_all(u)
    enriched: list[dict] = []
    for item in items:
        data = item.model_dump() if hasattr(item, "model_dump") else dict(item)
        korean_name = data.get("korean_name")
        if korean_name:
            data["story"] = get_story(korean_name)
            data["illustration_url"] = _make_illust_url(korean_name)
        else:
            data["story"] = None
            data["illustration_url"] = None
        enriched.append(data)
    return enriched


@router.post("", response_model=CollectionItem, status_code=status.HTTP_201_CREATED)
def add_to_collection(
    body: CollectionAddRequest,
    background_tasks: BackgroundTasks,
    u: str = Depends(get_user_id),
):
    district: str | None = None
    if body.lat is not None and body.lng is not None:
        district = reverse_geocode(body.lat, body.lng)

    # 일러스트 캐시 hit: image_path 는 일러스트 canonical 경로로 교체하되,
    # 사용자 원본 사진(S3 또는 /assets/uploads/ URL)은 image_url 로 옮겨 보존한다.
    # → 도감 카드 "내 사진" 탭에 사용자 사진을 정상 표시 (PDCA cold-start fix)
    if body.korean_name:
        cached_png = ILLUST_DIR / f"{body.korean_name}.png"
        if cached_png.exists() and cached_png.stat().st_size > 1000:
            if not body.image_url and body.image_path and (
                body.image_path.startswith(("http://", "https://"))
                or body.image_path.startswith("/assets/uploads/")
            ):
                body.image_url = body.image_path  # 원본 사용자 사진 보존
            body.image_path = f"/assets/illustrations/{body.korean_name}.png"

    saved = repository.save_result(body, district, u)

    # Design Ref: §9.3 — 기존 GitHub workflow trigger 비활성화
    # 콜드스타트 동기 파이프라인 (illust_sync + story_sync) 이 /api/identify 응답에
    # 이미 일러스트 + 이야기를 만들어 캐시(S3 + DB)에 저장하므로, 도감 저장 시점에는
    # 추가 트리거가 불필요. rollback 가능성을 위해 코드는 유지 (import + 함수 정의).
    # if (
    #     body.korean_name
    #     and body.korean_name not in ("해당 없음", "N/A")
    #     and body.scientific_name != "N/A"
    # ):
    #     background_tasks.add_task(trigger_illustration_generation, body.korean_name, body.native_status)
    #     background_tasks.add_task(trigger_story_generation, body.korean_name)

    return saved


@router.get("/{item_id}", response_model=CollectionItem)
def get_item(item_id: int, u: str = Depends(get_user_id)):
    try:
        return repository.get_by_id(item_id, u)
    except KeyError:
        raise HTTPException(status_code=404, detail="item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, u: str = Depends(get_user_id)):
    # Plan SC-3: global row 또는 타 사용자 row → rowcount 0 → 404
    deleted = repository.delete_by_id(item_id, u)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="item not found")

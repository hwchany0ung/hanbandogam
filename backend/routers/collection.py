from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

try:
    from backend.db import repository
    from backend.domain.types import CollectionAddRequest, CollectionItem, MapPoint
    from backend.services.geocode import reverse_geocode
    from backend.services.illust_trigger import trigger_illustration_generation
    from backend.services.story_trigger import trigger_story_generation
except ImportError:
    from db import repository
    from domain.types import CollectionAddRequest, CollectionItem, MapPoint
    from services.geocode import reverse_geocode
    from services.illust_trigger import trigger_illustration_generation
    from services.story_trigger import trigger_story_generation


router = APIRouter(prefix="/api/collection", tags=["collection"])

# 일러스트 캐시 디렉토리
ILLUST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "assets" / "illustrations"


# Design Ref: §4.1 — URL ?u= 쿼리에서 사용자 식별자 추출, 미지정 시 'global'
def get_user_id(u: str = Query("global", min_length=1, max_length=64)) -> str:
    return u or "global"


@router.get("/map", response_model=list[MapPoint])
def get_map_points(u: str = Depends(get_user_id)):
    return repository.get_map_points(u)


@router.get("", response_model=list[CollectionItem])
def list_collection(u: str = Depends(get_user_id)):
    return repository.get_all(u)


@router.post("", response_model=CollectionItem, status_code=status.HTTP_201_CREATED)
def add_to_collection(
    body: CollectionAddRequest,
    background_tasks: BackgroundTasks,
    u: str = Depends(get_user_id),
):
    district: str | None = None
    if body.lat is not None and body.lng is not None:
        district = reverse_geocode(body.lat, body.lng)

    # 일러스트 캐시 hit: 동일 종의 PNG가 이미 존재하면 canonical 경로로 image_path 교체
    # → 모든 사용자가 같은 종을 동일한 일러스트 URL 로 저장
    if body.korean_name:
        cached_png = ILLUST_DIR / f"{body.korean_name}.png"
        if cached_png.exists() and cached_png.stat().st_size > 1000:
            body.image_path = f"/assets/illustrations/{body.korean_name}.png"

    saved = repository.save_result(body, district, u)

    # 신규 종 일러스트 자동 생성 (비동기, 실패해도 메인 흐름 무관)
    # "해당 없음" / N/A 같은 식별불가 결과는 트리거 안 함
    if (
        body.korean_name
        and body.korean_name not in ("해당 없음", "N/A")
        and body.scientific_name != "N/A"
    ):
        # 일러스트 자동생성 (Replicate flux-schnell)
        background_tasks.add_task(
            trigger_illustration_generation,
            body.korean_name,
            body.native_status,
        )
        # 이야기 자동생성 (Claude API)
        background_tasks.add_task(
            trigger_story_generation,
            body.korean_name,
        )

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

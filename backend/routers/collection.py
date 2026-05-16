from fastapi import APIRouter, HTTPException, status

from db import repository
from domain.types import CollectionAddRequest, CollectionItem, MapPoint
from services.geocode import reverse_geocode

router = APIRouter(prefix="/api/collection", tags=["collection"])


@router.get("/map", response_model=list[MapPoint])
def get_map_points():
    return repository.get_map_points()


@router.get("", response_model=list[CollectionItem])
def list_collection():
    return repository.get_all()


@router.post("", response_model=CollectionItem, status_code=status.HTTP_201_CREATED)
def add_to_collection(body: CollectionAddRequest):
    district: str | None = None
    if body.lat is not None and body.lng is not None:
        district = reverse_geocode(body.lat, body.lng)
    return repository.save_result(body, district)


@router.get("/{item_id}", response_model=CollectionItem)
def get_item(item_id: int):
    try:
        return repository.get_by_id(item_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    repository.delete_by_id(item_id)

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

try:
    from backend.db import repository
    from backend.domain.types import CollectionAddRequest, CollectionItem
except ImportError:
    from db import repository
    from domain.types import CollectionAddRequest, CollectionItem

router = APIRouter(prefix="/api/collection", tags=["collection"])


@router.get("", response_model=list[CollectionItem])
def list_collection():
    return repository.get_all()


@router.post("", response_model=CollectionItem, status_code=status.HTTP_201_CREATED)
def add_to_collection(body: CollectionAddRequest):
    return repository.save_result(body)


@router.get("/{item_id}", response_model=CollectionItem)
def get_item(item_id: int):
    item = repository.get_by_id(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    repository.delete_by_id(item_id)

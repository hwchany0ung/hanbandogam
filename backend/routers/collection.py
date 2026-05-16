from fastapi import APIRouter, HTTPException, status

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
    try:
        return repository.get_by_id(item_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    repository.delete_by_id(item_id)

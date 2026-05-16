import sqlite3
from pathlib import Path

try:
    from backend.domain.types import CollectionAddRequest, CollectionItem, MapPoint
except ImportError:
    from domain.types import CollectionAddRequest, CollectionItem, MapPoint

DB_PATH = Path(__file__).parent.parent / "hanbando.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _connect()
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()
    conn.close()


def save_result(body: CollectionAddRequest, district: str | None = None) -> CollectionItem:
    conn = _connect()
    try:
        cur = conn.execute(
            """
            INSERT INTO collection
                (korean_name, scientific_name, native_status, confidence,
                 ecology_summary, conservation_status, morphological_clues,
                 image_path, memo, lat, lng, district)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.korean_name, body.scientific_name, body.native_status,
                body.confidence, body.ecology_summary, body.conservation_status,
                body.morphological_clues, body.image_path, body.memo,
                body.lat, body.lng, district,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM collection WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return _to_item(row)
    finally:
        conn.close()


def get_all() -> list[CollectionItem]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM collection ORDER BY created_at DESC"
        ).fetchall()
        return [_to_item(r) for r in rows]
    finally:
        conn.close()


def get_by_id(item_id: int) -> CollectionItem:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM collection WHERE id = ?", (item_id,)
        ).fetchone()
        if row is None:
            raise KeyError(item_id)
        return _to_item(row)
    finally:
        conn.close()


def delete_by_id(item_id: int) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM collection WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def get_map_points() -> list[MapPoint]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, korean_name, native_status, lat, lng, district, created_at"
            " FROM collection WHERE lat IS NOT NULL AND lng IS NOT NULL"
            " ORDER BY created_at DESC"
        ).fetchall()
        return [MapPoint(**dict(r)) for r in rows]
    finally:
        conn.close()


def _to_item(row: sqlite3.Row) -> CollectionItem:
    return CollectionItem(**dict(row))

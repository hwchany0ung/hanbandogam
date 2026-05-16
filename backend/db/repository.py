import sqlite3
from pathlib import Path
from typing import Optional

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


def _migrate_user_id_column(conn: sqlite3.Connection) -> None:
    # Design Ref: §3.2 — idempotent migration via PRAGMA table_info guard
    cols = {row[1] for row in conn.execute("PRAGMA table_info(collection)")}
    if "image_url" not in cols:
        try:
            conn.execute("ALTER TABLE collection ADD COLUMN image_url TEXT")
        except sqlite3.OperationalError:
            pass
    if "user_id" not in cols:
        try:
            conn.execute(
                "ALTER TABLE collection ADD COLUMN user_id "
                "TEXT NOT NULL DEFAULT 'global'"
            )
        except sqlite3.OperationalError:
            # 컬럼 추가 실패해도 부팅은 진행 (legacy 모드: WHERE 'global'만 매치)
            pass
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_collection_user_id "
        "ON collection(user_id)"
    )


def init_db() -> None:
    conn = _connect()
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    _migrate_user_id_column(conn)
    conn.commit()
    conn.close()


def save_result(
    body: CollectionAddRequest,
    district: str | None = None,
    user_id: str = "global",
) -> CollectionItem:
    # Plan SC-3: POST는 본인 user_id로 저장 (클라이언트가 'global' 보내도 그대로 저장됨; 시연 신뢰 모델)
    conn = _connect()
    try:
        cur = conn.execute(
            """
            INSERT INTO collection
                (korean_name, scientific_name, native_status, confidence,
                 ecology_summary, conservation_status, morphological_clues,
                 image_path, image_url, memo, lat, lng, district, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.korean_name, body.scientific_name, body.native_status,
                body.confidence, body.ecology_summary, body.conservation_status,
                body.morphological_clues, body.image_path,
                getattr(body, "image_url", None),  # S3 사용자 사진 URL (image_path 일러스트 덮어쓰기와 무관 보존)
                body.memo,
                body.lat, body.lng, district, user_id,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM collection WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return _to_item(row)
    finally:
        conn.close()


def get_all(user_id: str = "global") -> list[CollectionItem]:
    # Plan SC-2: WHERE user_id IN ('global', :uid) — 시드 + 본인 카드
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM collection"
            " WHERE user_id = 'global' OR user_id = ?"
            " ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [_to_item(r) for r in rows]
    finally:
        conn.close()


def get_by_id(item_id: int, user_id: str = "global") -> CollectionItem:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM collection"
            " WHERE id = ? AND (user_id = 'global' OR user_id = ?)",
            (item_id, user_id),
        ).fetchone()
        if row is None:
            raise KeyError(item_id)
        return _to_item(row)
    finally:
        conn.close()


def delete_by_id(item_id: int, user_id: str = "global") -> int:
    # Plan SC-3: global row는 절대 삭제 안 됨 (AND user_id = :uid; 'global' 매치 차단)
    # Returns rowcount: 0이면 본인 row 아니거나 존재하지 않음 (라우터에서 404 처리)
    conn = _connect()
    try:
        cur = conn.execute(
            "DELETE FROM collection WHERE id = ? AND user_id = ?",
            (item_id, user_id),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def get_map_points(user_id: str = "global") -> list[MapPoint]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, korean_name, native_status, lat, lng, district, created_at"
            " FROM collection"
            " WHERE lat IS NOT NULL AND lng IS NOT NULL"
            "   AND (user_id = 'global' OR user_id = ?)"
            " ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [MapPoint(**dict(r)) for r in rows]
    finally:
        conn.close()


def _to_item(row: sqlite3.Row) -> CollectionItem:
    return CollectionItem(**dict(row))


def get_story(korean_name: str) -> Optional[str]:
    """species.story 조회. 없으면 None."""
    conn = _connect()
    try:
        cur = conn.execute(
            "SELECT story FROM species WHERE korean_name = ?",
            (korean_name,),
        )
        row = cur.fetchone()
        return row[0] if row and row[0] else None
    finally:
        conn.close()


def set_story(korean_name: str, story: str) -> bool:
    """species.story 업데이트. 행이 없으면 INSERT (UPSERT 패턴).
    성공 시 True, 실패 시 False."""
    try:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO species (korean_name, story)
                VALUES (?, ?)
                ON CONFLICT(korean_name) DO UPDATE SET story = excluded.story
                """,
                (korean_name, story),
            )
            conn.commit()
        finally:
            conn.close()
        return True
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("[story] set_story 실패: %s", exc)
        return False

from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any


DEFAULT_DATABASE_URL = "sqlite:///./hanbando.db"
ALLOWED_NATIVE_STATUSES = {"토종", "외래종", "불명확"}

CREATE_COLLECTION_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id INTEGER NULL,
    korean_name TEXT NOT NULL,
    scientific_name TEXT NOT NULL,
    native_status TEXT NOT NULL CHECK (native_status IN ('토종', '외래종', '불명확')),
    confidence REAL CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
    ecology_summary TEXT,
    conservation_status TEXT,
    morphological_clues TEXT,
    image_path TEXT NOT NULL,
    memo TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

MISSING_COLUMN_SQL = {
    "species_id": "ALTER TABLE collection ADD COLUMN species_id INTEGER NULL",
    "confidence": "ALTER TABLE collection ADD COLUMN confidence REAL",
    "ecology_summary": "ALTER TABLE collection ADD COLUMN ecology_summary TEXT",
    "conservation_status": "ALTER TABLE collection ADD COLUMN conservation_status TEXT",
    "morphological_clues": "ALTER TABLE collection ADD COLUMN morphological_clues TEXT",
    "memo": "ALTER TABLE collection ADD COLUMN memo TEXT DEFAULT ''",
    "created_at": "ALTER TABLE collection ADD COLUMN created_at TEXT",
}


def _database_path() -> str:
    database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

    if database_url == "sqlite:///:memory:":
        return ":memory:"

    if not database_url.startswith("sqlite:///"):
        raise ValueError("Only sqlite:/// DATABASE_URL values are supported")

    database_path = database_url.replace("sqlite:///", "", 1)

    if not database_path:
        return "./hanbando.db"

    return database_path


def _connect() -> sqlite3.Connection:
    database_path = _database_path()

    if database_path != ":memory:":
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    return connection


def _schema_sql() -> str:
    schema_path = Path(__file__).with_name("schema.sql")

    if not schema_path.exists():
        return CREATE_COLLECTION_TABLE_SQL

    schema_sql = schema_path.read_text(encoding="utf-8-sig").strip()

    return schema_sql or CREATE_COLLECTION_TABLE_SQL


def _ensure_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(_schema_sql())
    existing_columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(collection)")
    }

    for column_name, alter_sql in MISSING_COLUMN_SQL.items():
        if column_name not in existing_columns:
            connection.execute(alter_sql)

    connection.execute(
        "UPDATE collection SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
    )
    connection.commit()


def _body_to_dict(body: CollectionAddRequest) -> dict[str, Any]:
    if hasattr(body, "model_dump"):
        return body.model_dump()

    if isinstance(body, dict):
        return body

    return {
        key: getattr(body, key)
        for key in dir(body)
        if not key.startswith("_") and not callable(getattr(body, key))
    }


def _required_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)

    if value is None or value == "":
        raise ValueError(f"{key} is required")

    return str(value)


def _optional_text(data: dict[str, Any], key: str) -> str:
    value = data.get(key)

    if value is None:
        return ""

    return str(value)


def _validate_native_status(native_status: str) -> str:
    if native_status not in ALLOWED_NATIVE_STATUSES:
        raise ValueError("native_status must be one of: 토종, 외래종, 불명확")

    return native_status


def _validate_confidence(value: Any) -> float | None:
    if value is None or value == "":
        return None

    confidence = float(value)

    if confidence < 0.0 or confidence > 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")

    return confidence


def _collection_item_model() -> Any | None:
    for module_name in ("backend.domain.types", "domain.types"):
        try:
            module = __import__(module_name, fromlist=["CollectionItem"])
        except ImportError:
            continue

        model = getattr(module, "CollectionItem", None)

        if model is not None:
            return model

    return None


def _row_to_collection_item(row: sqlite3.Row) -> CollectionItem:
    data = dict(row)
    model = _collection_item_model()

    if model is None:
        return data

    if hasattr(model, "model_validate"):
        return model.model_validate(data)

    return model(**data)


def _fetch_by_id(connection: sqlite3.Connection, item_id: int) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT * FROM collection WHERE id = ?",
        (item_id,),
    ).fetchone()


def save_result(body: CollectionAddRequest) -> CollectionItem:
    data = _body_to_dict(body)
    native_status = _validate_native_status(_required_text(data, "native_status"))
    confidence = _validate_confidence(data.get("confidence"))

    with closing(_connect()) as connection:
        _ensure_schema(connection)
        cursor = connection.execute(
            """
            INSERT INTO collection (
                species_id,
                korean_name,
                scientific_name,
                native_status,
                confidence,
                ecology_summary,
                conservation_status,
                morphological_clues,
                image_path,
                memo,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                data.get("species_id"),
                _required_text(data, "korean_name"),
                _required_text(data, "scientific_name"),
                native_status,
                confidence,
                _optional_text(data, "ecology_summary"),
                _optional_text(data, "conservation_status"),
                _optional_text(data, "morphological_clues"),
                _required_text(data, "image_path"),
                _optional_text(data, "memo"),
            ),
        )
        connection.commit()

        row = _fetch_by_id(connection, cursor.lastrowid)

        if row is None:
            raise RuntimeError("Failed to fetch saved collection item")

        return _row_to_collection_item(row)


def get_all() -> list[CollectionItem]:
    with closing(_connect()) as connection:
        _ensure_schema(connection)
        rows = connection.execute(
            "SELECT * FROM collection ORDER BY created_at DESC"
        ).fetchall()

        return [_row_to_collection_item(row) for row in rows]


def get_by_id(item_id: int) -> CollectionItem | None:
    with closing(_connect()) as connection:
        _ensure_schema(connection)
        row = _fetch_by_id(connection, item_id)

        if row is None:
            return None

        return _row_to_collection_item(row)


def delete_by_id(item_id: int) -> bool:
    with closing(_connect()) as connection:
        _ensure_schema(connection)
        cursor = connection.execute(
            "DELETE FROM collection WHERE id = ?",
            (item_id,),
        )
        deleted_count = cursor.rowcount
        connection.commit()

    return deleted_count > 0

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

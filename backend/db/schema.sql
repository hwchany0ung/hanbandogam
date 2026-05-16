CREATE TABLE IF NOT EXISTS collection (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    korean_name        TEXT NOT NULL,
    scientific_name    TEXT NOT NULL,
    native_status      TEXT NOT NULL,
    confidence         REAL NOT NULL,
    ecology_summary    TEXT NOT NULL,
    conservation_status TEXT NOT NULL,
    morphological_clues TEXT NOT NULL,
    image_path         TEXT NOT NULL,
    memo               TEXT DEFAULT '',
    created_at         DATETIME DEFAULT (datetime('now', 'localtime'))
);

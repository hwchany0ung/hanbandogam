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
    lat                REAL,
    lng                REAL,
    district           TEXT,
    user_id            TEXT NOT NULL DEFAULT 'global',
    created_at         DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 인덱스는 _migrate_user_id_column()에서 생성 (기존 DB에 컬럼 없는 상태에서 schema 재실행 시 안전)

-- 콜드스타트 캐시: 신규 종 이야기를 한 번만 생성하고 재사용
CREATE TABLE IF NOT EXISTS species (
    korean_name TEXT PRIMARY KEY,
    story       TEXT  -- 콜드스타트: 신규 종 이야기 캐시
);

#!/bin/bash
set -euo pipefail

APP_DIR="/home/ec2-user/hanbando"
cd "$APP_DIR"

# 1. 최신 코드 pull
git pull origin main

# 2. 가상환경 활성화 + 의존성 설치
source venv/bin/activate
pip install -r backend/requirements.txt --quiet

# 3. 시드 데이터 (멱등 — INSERT OR IGNORE)
python -m backend.db.seed

# 3.5. M10 DB 마이그레이션 (멱등 — 컬럼 이미 있으면 무시)
sqlite3 hanbando.db "ALTER TABLE collection ADD COLUMN lat REAL" 2>/dev/null || true
sqlite3 hanbando.db "ALTER TABLE collection ADD COLUMN lng REAL" 2>/dev/null || true
sqlite3 hanbando.db "ALTER TABLE collection ADD COLUMN district TEXT" 2>/dev/null || true

# 4. 서비스 재시작 (caddy: DOMAIN 환경변수 반영, hanbando: 앱)
sudo systemctl daemon-reload
sudo systemctl restart caddy
sudo systemctl restart hanbando

# 5. 헬스체크
sleep 3
curl -f http://localhost:8000/health
echo ""
echo "[deploy] 배포 완료 $(date)"

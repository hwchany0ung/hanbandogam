#!/bin/bash
# EC2 초기화 스크립트 (Amazon Linux 2023)
# terraform apply 시 자동 실행됨. 수동 실행 불필요.

set -euo pipefail
exec > /var/log/user-data.log 2>&1

# ─── 기본 패키지 ───
dnf update -y
dnf install -y git python3.11 python3.11-pip sqlite tmux

# ─── Caddy (GitHub releases 바이너리 — Cloudsmith RPM은 AL2023 미지원) ───
CADDY_VERSION="2.9.1"
curl -Lo /tmp/caddy.tar.gz \
  "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_amd64.tar.gz"
tar -xzf /tmp/caddy.tar.gz -C /tmp caddy
install -m 755 /tmp/caddy /usr/bin/caddy
rm -f /tmp/caddy.tar.gz /tmp/caddy

# Caddy 전용 사용자/그룹
groupadd --system caddy 2>/dev/null || true
useradd --system --gid caddy \
  --home-dir /var/lib/caddy --create-home \
  --shell /usr/sbin/nologin caddy 2>/dev/null || true

# Caddy systemd 유닛
cat > /etc/systemd/system/caddy.service <<'CADDYSVCEOF'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
EnvironmentFile=-/home/ec2-user/hanbando/.env
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
CADDYSVCEOF

# ─── Caddyfile ───
mkdir -p /etc/caddy /var/log/caddy
cat > /etc/caddy/Caddyfile <<'CADDYEOF'
{$DOMAIN:localhost} {
    reverse_proxy localhost:8000

    request_body {
        max_size 10MB
    }

    log {
        output file /var/log/caddy/hanbando.log
        format json
    }
}
CADDYEOF

chown caddy:caddy /var/log/caddy

# ─── hanbando systemd 서비스 ───
cat > /etc/systemd/system/hanbando.service <<'SVCEOF'
[Unit]
Description=hanbando FastAPI server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/hanbando
EnvironmentFile=/home/ec2-user/hanbando/.env
ExecStart=/home/ec2-user/hanbando/venv/bin/uvicorn backend.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1 \
    --log-level info
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable caddy
# hanbando 서비스는 git clone + pip install 완료 후 수동으로 enable/start

# ─── 코드 배포 디렉터리 준비 ───
mkdir -p /home/ec2-user/hanbando
chown ec2-user:ec2-user /home/ec2-user/hanbando

# ─── sudoers: ec2-user가 hanbando 서비스 재시작 가능 ───
printf 'ec2-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart hanbando\n' \
  'ec2-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart caddy\n' \
  'ec2-user ALL=(ALL) NOPASSWD: /usr/bin/systemctl daemon-reload\n' \
  > /etc/sudoers.d/hanbando
chmod 440 /etc/sudoers.d/hanbando

echo "[user_data] 초기화 완료 $(date)" >> /var/log/user-data.log

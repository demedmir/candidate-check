#!/usr/bin/env bash
# Install candidate-check on Ubuntu 22.04+ (24.04 рекомендуется).
#
# Usage:
#   sudo bash deploy/install_ubuntu.sh \
#       --domain candidates.example.com \
#       --hr-email you@example.com \
#       [--hr-password 'PassPhrase'] \
#       [--branch main] \
#       [--no-nginx] [--no-tls]
#
# По умолчанию ставит nginx и Let's Encrypt cert. --no-nginx пропускает proxy.
set -euo pipefail

REPO="https://github.com/demedmir/candidate-check.git"
APP_DIR="/opt/candidate-check"
BRANCH="main"
DOMAIN=""
HR_EMAIL=""
HR_PASSWORD=""
WANT_NGINX=1
WANT_TLS=1

log() { printf "\033[1;34m[install]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)        DOMAIN="$2"; shift 2 ;;
    --hr-email)      HR_EMAIL="$2"; shift 2 ;;
    --hr-password)   HR_PASSWORD="$2"; shift 2 ;;
    --branch)        BRANCH="$2"; shift 2 ;;
    --app-dir)       APP_DIR="$2"; shift 2 ;;
    --no-nginx)      WANT_NGINX=0; shift ;;
    --no-tls)        WANT_TLS=0; shift ;;
    *)               err "unknown arg: $1" ;;
  esac
done

[[ "$EUID" -eq 0 ]] || err "запускать под root (sudo)"
[[ -n "$HR_EMAIL" ]] || err "--hr-email обязателен"
if [[ "$WANT_NGINX" -eq 1 && -z "$DOMAIN" ]]; then
  err "--domain обязателен (или передайте --no-nginx)"
fi
. /etc/os-release
[[ "$ID" == "ubuntu" ]] || err "ожидается Ubuntu, найден: $ID"

log "Ubuntu $VERSION_ID, домен='${DOMAIN:-(нет)}', repo=$REPO branch=$BRANCH"

# 1) Базовые пакеты
log "apt update + базовые пакеты"
apt-get update -y
apt-get install -y --no-install-recommends \
    ca-certificates curl git openssl ufw

# 2) Docker
if ! command -v docker >/dev/null 2>&1; then
    log "Установка Docker через get.docker.com"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
fi
systemctl enable --now docker
docker compose version >/dev/null 2>&1 || err "docker compose plugin отсутствует"

# 3) Файрвол: 22, 80, 443
log "UFW: открываем 22/80/443"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# 4) Клонируем код
if [[ ! -d "$APP_DIR/.git" ]]; then
    log "Клонирую $REPO → $APP_DIR (branch=$BRANCH)"
    git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
    log "Обновляю существующий клон"
    git -C "$APP_DIR" fetch origin
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only
fi

# 5) .env
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    log "Создаю .env с генерацией секретов"
    cp "$APP_DIR/.env.example" "$ENV_FILE"
    APP_SECRET=$(openssl rand -hex 32)
    PG_PASS=$(openssl rand -hex 16)
    sed -i "s|^APP_SECRET=.*|APP_SECRET=${APP_SECRET}|" "$ENV_FILE"
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" "$ENV_FILE"
    sed -i "s|^APP_RELOAD=.*|APP_RELOAD=|" "$ENV_FILE"  # prod: no --reload
    sed -i "s|^APP_ENV=.*|APP_ENV=prod|" "$ENV_FILE"
fi

# 6) Поднимаем стек
log "docker compose up -d --build"
( cd "$APP_DIR" && docker compose up -d --build )

# 7) Миграции
log "Применяю миграции"
( cd "$APP_DIR" && docker compose run --rm app alembic upgrade head )

# 8) HR-юзер
if [[ -z "$HR_PASSWORD" ]]; then
    HR_PASSWORD=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)
    HR_PASSWORD_GENERATED=1
fi
log "Создаю HR-пользователя $HR_EMAIL"
( cd "$APP_DIR" && docker compose run --rm app python -m app.scripts.create_user "$HR_EMAIL" "$HR_PASSWORD" ) || \
    log "Юзер уже существует — пропускаем"

# 9) Cron для Росфинмониторинга
log "Cron для refresh_rosfinmon (раз в сутки в 03:30)"
CRON_LINE="30 3 * * * cd $APP_DIR && docker compose run --rm worker python -m app.scripts.refresh_rosfinmon >> /var/log/candidate-check-rosfinmon.log 2>&1"
( crontab -l 2>/dev/null | grep -v "refresh_rosfinmon"; echo "$CRON_LINE" ) | crontab -

# 10) Nginx + Let's Encrypt
if [[ "$WANT_NGINX" -eq 1 ]]; then
    log "Установка nginx"
    apt-get install -y --no-install-recommends nginx
    cat >/etc/nginx/sites-available/candidate-check <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX
    ln -sf /etc/nginx/sites-available/candidate-check /etc/nginx/sites-enabled/candidate-check
    nginx -t && systemctl restart nginx

    if [[ "$WANT_TLS" -eq 1 ]]; then
        log "certbot для $DOMAIN"
        apt-get install -y --no-install-recommends certbot python3-certbot-nginx
        certbot --nginx -d "$DOMAIN" -m "$HR_EMAIL" --agree-tos --redirect --non-interactive || \
            log "certbot не отработал — настрой TLS вручную"
    fi
fi

log "Готово!"
echo
echo "URL:        ${DOMAIN:+https://$DOMAIN/hr/login}${DOMAIN:-http://<server-ip>:8000/hr/login}"
echo "HR логин:   $HR_EMAIL"
if [[ "${HR_PASSWORD_GENERATED:-0}" -eq 1 ]]; then
    echo "HR пароль:  $HR_PASSWORD   (СОХРАНИ)"
else
    echo "HR пароль:  (тот, что передал в --hr-password)"
fi
echo
echo "Repo:       $APP_DIR"
echo "Логи:       cd $APP_DIR && docker compose logs -f"
echo "Миграции:   cd $APP_DIR && docker compose run --rm app alembic upgrade head"

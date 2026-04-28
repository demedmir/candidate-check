# Deployment

## Production VPS

Поддерживается **Ubuntu 22.04+**, KVM/OpenStack, минимум **1 vCPU / 2 GB RAM / 10 GB disk**.

### Turnkey-установка

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/demedmir/candidate-check/main/deploy/install_ubuntu.sh) \
    --domain candidates.example.com \
    --hr-email you@example.com \
    --hr-password '<strong-pass>'
```

Скрипт делает:
1. `apt-get` базовые пакеты + Docker (через `get.docker.com`)
2. UFW открывает 22/80/443
3. `git clone` репо в `/opt/candidate-check`
4. Генерит `APP_SECRET` (openssl rand -hex 32) и `POSTGRES_PASSWORD`
5. `docker compose up -d --build`
6. `alembic upgrade head`
7. Создаёт HR-пользователя
8. Cron на `refresh_rosfinmon` (03:30) и `refresh_opensanctions` (03:45)
9. Установка nginx + Let's Encrypt по `--domain`

Опции скрипта:
| Флаг | Что |
|---|---|
| `--no-nginx` | Без публичного nginx — доступ через SSH-туннель |
| `--no-tls` | nginx без HTTPS (только http) |
| `--branch <name>` | Не main, а другая ветка |
| `--app-dir <path>` | Не `/opt/candidate-check` |
| `--hr-password <pass>` | Иначе генерится случайный |

### Compose-сервисы

```yaml
services:
  postgres:   # 16-alpine, persistent volume pgdata
  redis:      # 7-alpine
  app:        # uvicorn :8000, exposed на 127.0.0.1
  worker:     # arq
```

Все сервисы: `restart: unless-stopped`. На VPS Postgres/Redis **не торчат на хост**, доступны только из docker network.

## Tailscale (для интеграции с Spark OCR)

```bash
# на VPS
curl -fsSL https://tailscale.com/install.sh | sudo sh
sudo tailscale up --hostname=cc-vps --accept-routes
# в браузере открыть выданный auth URL, авторизовать
```

Затем в `.env`:
```
CAPTCHA_SOLVER_URL=http://100.92.151.1:9999  # Tailscale-IP Spark
PASSPORT_OCR_URL=http://100.92.151.1:9998
```

⚠️ **Особенность Docker**: контейнер ходит на 100.x через NAT хоста — работает без socat. Если не работает — поднять socat-прокси на хосте (`captcha-proxy.service` в systemd, см. `deploy/install_ubuntu.sh`).

## Nginx-конфиг (production)

```nginx
server {
    listen 443 ssl http2;
    server_name candidates.example.com;
    ssl_certificate /etc/letsencrypt/live/candidates.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/candidates.example.com/privkey.pem;

    root /opt/candidate-check/frontend/dist;
    index index.html;
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /healthz { proxy_pass http://127.0.0.1:8000/healthz; }

    # Legacy HTMX (можно убрать после migration на SPA)
    location /hr/ { proxy_pass http://127.0.0.1:8000; }
    location /static/ { proxy_pass http://127.0.0.1:8000; }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name candidates.example.com;
    return 301 https://$host$request_uri;
}
```

## Spark-сервисы (passport-ocr + captcha-solver)

На DGX Spark (или любом ARM/x86 хосте с Docker):

```bash
git clone https://github.com/demedmir/candidate-check.git
cd candidate-check/services/captcha-solver
docker compose up -d --build

cd ../passport-ocr
docker compose up -d --build  # этот скачает torch + модели ~2 GB при первом запуске
```

GPU нужен только для passport-ocr (ускоряет в 10×). Captcha-solver работает на CPU.

Для удалённого доступа с VPS — оба сервиса должны быть доступны через Tailscale на `100.x.x.x:9999` / `:9998`.

## Frontend

```bash
cd frontend
npm install
npm run build  # → frontend/dist/
```

`dist/` коммитится в git, чтобы VPS просто `git pull` подхватил без `npm install`. Это сделано осознанно — на 1 vCPU / 2 GB VPS `npm install` не помещается в RAM.

## Миграции БД

```bash
# применить
docker compose run --rm app alembic upgrade head

# создать новую (после изменения models.py)
cp templates/alembic_migration_template.py alembic/versions/000N_<имя>.py
# отредактировать upgrade()/downgrade(), down_revision
docker compose run --rm app alembic upgrade head
```

## Бэкапы

> На MVP **бэкапы не настроены**. Перед production-продакшеном для реальных кандидатов:
> 1. Postgres: `pg_dump` в S3 ежедневно
> 2. `/data/uploads` (документы): rsync в S3 или зеркало на NAS
> 3. Тестировать восстановление на staging

## Обновление прода

```bash
ssh demedian@<vps>
cd /opt/candidate-check
sudo git pull --ff-only
sudo docker compose up -d --build app worker
sudo docker compose run --rm app alembic upgrade head   # если миграции
```

## Troubleshooting

### App не стартует, в логах SQL ошибка
- Применены ли миграции?  `docker compose run --rm app alembic current`
- БД доступна?  `docker compose exec postgres pg_isready`

### 502 Bad Gateway от nginx
- Стартовал ли app?  `docker compose ps`
- Слушает ли 8000?  `ss -tlnp | grep 8000`

### Коннекторы возвращают error
- Это норма для blocked-источников (FSSP/EFRSB и т.п.) — datacenter-WAF.
- Если внезапно весь стек — проверить выход:  `curl https://api.opensanctions.org/`

### Spark OCR не отвечает
- Tailscale up?  `tailscale status` на обоих хостах
- Health на Spark?  `ssh spark "curl http://localhost:9998/healthz"`
- С VPS:  `docker compose exec worker curl http://100.92.151.1:9998/healthz`

### Кэш Росфинмона устарел
- `docker compose run --rm worker python -m app.scripts.refresh_rosfinmon`
- Cron: `crontab -l | grep refresh`

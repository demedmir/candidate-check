# captcha-solver

Микросервис распознавания простых text-image капч госсайтов РФ
(ФНС, ФССП, ГИБДД, ФРДО). Используется как backend для
[candidate-check](../..).

## Стек

- Python 3.12 + FastAPI + ddddocr (ONNX OCR)
- CPU only, без GPU. Размер образа ~600 MB.
- ~10–30 мс на капчу.

## Запуск (на Spark)

```bash
cd services/captcha-solver
cp .env.example .env
# опционально: CAPTCHA_API_TOKEN=<random>
docker compose up -d --build
```

## API

- `GET /healthz` — `{"ok": true, "engine_ready": true}`
- `POST /solve` (multipart `image`) — `{"text": "...", "elapsed_ms": 12}`
- `POST /solve_b64` (`{"image_b64":"..."}`) — то же

Если `CAPTCHA_API_TOKEN` задан — требуется `Authorization: Bearer <token>`.

## Лимиты и качество

- Простые символьные (4–7 знаков) — точность 80–90% сразу.
- Сильно искажённые / icon-капчи — нужен fine-tune (можно собрать
  100–200 примеров, затем дообучить через ddddocr-trainer).
- SmartCaptcha / reCAPTCHA — НЕ работает.

## Деплой

Сервис слушает на `0.0.0.0:9999`. Доступ — только через Tailscale
(`100.x.y.z:9999`), наружу не торчит.

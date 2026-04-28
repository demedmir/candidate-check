FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e .

COPY . .

# EasyOCR при первом запуске скачивает веса в /root/.EasyOCR — пробросим volume
EXPOSE 9998
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9998"]

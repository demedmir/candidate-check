FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG INSTALL_DEV=true

COPY pyproject.toml ./
RUN pip install --upgrade pip && \
    if [ "$INSTALL_DEV" = "true" ]; then pip install -e ".[dev]"; else pip install -e .; fi

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

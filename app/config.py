from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    app_secret: str = "change-me"
    app_log_level: str = "info"

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "candidate_check"
    postgres_user: str = "app"
    postgres_password: str = "app"

    redis_host: str = "redis"
    redis_port: int = 6379

    storage_dir: str = "/data/uploads"
    hr_session_ttl_seconds: int = 86400

    capmonster_key: str = ""
    captcha_solver_url: str = ""  # http://100.92.151.1:9999 (Spark via Tailscale)
    captcha_solver_token: str = ""
    passport_ocr_url: str = ""    # http://100.92.151.1:9998 (Spark via Tailscale)
    passport_ocr_token: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"


settings = Settings()

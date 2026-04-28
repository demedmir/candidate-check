from app.checks import execute_check_run, redis_settings


class WorkerSettings:
    functions = [execute_check_run]
    redis_settings = redis_settings()
    max_jobs = 5

import os

# Gunicorn config variables
loglevel = os.getenv("LOG_LEVEL", "info")
workers = int(os.getenv("WEB_CONCURRENCY", "4"))
bind = os.getenv("BIND", "0.0.0.0:8000")
errorlog = "-"
accesslog = "-"
worker_class = "uvicorn.workers.UvicornWorker"
worker_tmp_dir = "/dev/shm"

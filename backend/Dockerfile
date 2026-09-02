FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create a non-root user for security
RUN useradd -m appuser
USER appuser

EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-c", "gunicorn_conf.py"]

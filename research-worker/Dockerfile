# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app
RUN useradd -m -u 10001 worker

COPY pyproject.toml README.md requirements.txt ./
COPY research_worker ./research_worker
COPY sql ./sql

RUN pip install --no-cache-dir -e . && \
    chown -R worker:worker /app

USER worker
ENV PYTHONUNBUFFERED=1

# Default: long-running DB poll loop (no HTTP server)
ENTRYPOINT ["python", "-m", "research_worker"]
CMD ["worker"]

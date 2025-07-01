FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (common Linux tools for terminal commands)
RUN apt-get update && apt-get install -y \
    coreutils \
    util-linux \
    procps \
    findutils \
    grep \
    sed \
    gawk \
    curl \
    wget \
    git \
    nano \
    vim-tiny \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /app

# Install Python dependencies (removed docker package)
RUN pip install --no-cache-dir fastapi uvicorn[standard] httpx slowapi

# Create app user for security (optional but recommended)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Get PORT from environment or default to 10000
ENV PORT=10000

EXPOSE $PORT

# Start with explicit port binding and logging
CMD ["sh", "-c", "echo 'Starting on port '$PORT && uvicorn main:app --host 0.0.0.0 --port $PORT --log-level info"]
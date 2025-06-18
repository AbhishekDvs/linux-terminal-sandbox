FROM python:3.11-slim

WORKDIR /app

COPY . /app

# Install dependencies directly
RUN pip install --no-cache-dir fastapi uvicorn[standard] httpx docker

RUN mkdir -p logs

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]

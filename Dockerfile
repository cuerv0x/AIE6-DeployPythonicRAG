FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY frontend .
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

RUN npm run build
FROM python:3.10-slim AS backend
WORKDIR /app

RUN apt-get update && apt-get install --no-install-recommends -y \
    git ffmpeg curl gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user

COPY ./pyproject.toml .
RUN uv sync

USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH


WORKDIR $HOME/app
COPY --from=builder /app/build ./static
COPY . .    

CMD ["python", "app.py"]

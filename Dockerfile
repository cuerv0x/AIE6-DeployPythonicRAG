# Stage 1: Build the React frontend
FROM node:18 AS frontend-builder

# Add user - this is the user that will run the app
# If you do not set user, the app will run as root (undesirable)
RUN useradd -m -u 1000 user
USER user

# Set the home directory and path
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH        

ENV UVICORN_WS_PROTOCOL=websockets


# Set the working directory
WORKDIR $HOME/app

# Copy the app to the container
COPY --chown=user . $HOME/app

# Install the dependencies
# RUN uv sync --frozen
RUN uv sync

WORKDIR /app/frontend
COPY ./frontend/package*.json ./
RUN npm install
COPY ./frontend .
RUN npm run build

# Stage 2: Build the FastAPI backend
# Get a distribution that has uv already installed
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app/backend
COPY ./backend .

# Stage 3: Combine and run the application
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app
COPY --from=frontend-builder /app/frontend/build ./static
COPY --from=backend-builder /app/backend .

# Expose the port
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

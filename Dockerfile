# Stage 1: Build React frontend
FROM node:18 AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Python backend and serve frontend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/app ./app

# Copy built frontend from previous stage
COPY --from=frontend-builder /frontend/dist ./static

# Install nginx to serve static files
RUN apt-get update && apt-get install -y nginx \
    && rm -rf /var/lib/apt/lists/*

# Configure nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/bash\n\
nginx &\n\
uvicorn app.main:app --host 0.0.0.0 --port 7860\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose the port Hugging Face Spaces expects
EXPOSE 7860

# Start both nginx and FastAPI
CMD ["/app/start.sh"]
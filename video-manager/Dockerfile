# Multi-stage build for efficiency

# Stage 1: Build frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/public ./public
COPY frontend/src ./src

RUN npm run build

# Stage 2: Build backend + runtime
FROM node:18-alpine

WORKDIR /app

# Install ffmpeg and other dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    pip \
    build-base

# Install Whisper (optional - comment out if using mock transcription)
# RUN pip install openai-whisper

# Copy backend
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend .

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./public

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]

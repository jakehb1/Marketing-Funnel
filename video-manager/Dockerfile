# Single-stage build - vanilla frontend, no build complexity

FROM node:18-alpine

WORKDIR /app

# Install ffmpeg and other dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    build-base

# Install Whisper (optional - comment out if using mock transcription)
# RUN pip3 install openai-whisper

# Copy backend
COPY backend/package.json ./
RUN npm install --only=production

COPY backend .

# Copy vanilla HTML/CSS/JS frontend
COPY public ./public

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]

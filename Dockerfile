# Stage 1: Build React app
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Install python3, ffmpeg, and yt-dlp (runtime deps for YouTube streaming)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get remove -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ server/
COPY --from=builder /app/build build/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]

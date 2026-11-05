# Backend (Express) — demo image.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached unless package files change).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the server source (see .dockerignore for exclusions).
COPY . .

# The entrypoint waits for Postgres, runs the idempotent init/seed script,
# then starts the server.
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]

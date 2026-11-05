# Web (Vite dev server) — demo only.
# The dev server is intentional here: vite.config.ts proxies /api to the
# backend container, so the demo works without a production build step.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached unless package files change).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the frontend source (see .dockerignore for exclusions).
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Image untuk Cloud Run (dibangun oleh .gitlab-ci.yml). Satu Dockerfile untuk
# dev/staging/prod — bedanya hanya env var di service Cloud Run masing-masing.
FROM node:20-alpine

WORKDIR /app

# Lockfile sengaja tidak di-commit (lihat .gitignore), jadi `npm install`, bukan `npm ci`.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY api ./api
COPY public ./public
COPY server.js ./

ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]

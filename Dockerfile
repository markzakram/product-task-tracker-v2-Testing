# Image untuk Cloud Run, dibangun oleh .gitlab-ci.yml. Pola sama dengan Dockerfile yang
# dibuat tim IT untuk v1; bedanya Node 22, sesuai engines di package.json v2.
# Satu image untuk semua lingkungan — bedanya hanya env var di service Cloud Run.
FROM node:22-alpine

WORKDIR /app

# Lockfile sengaja tidak di-commit (lihat .gitignore), jadi `npm install`, bukan `npm ci`.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# api/rpc.js memakai ../public/inti.js (aturan yang sama dengan browser) dan
# ../package.json (versi untuk Panel Sistem); keduanya ikut tersalin.
COPY api ./api
COPY public ./public
COPY server.js ./

ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]

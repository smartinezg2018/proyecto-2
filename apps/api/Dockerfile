FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
RUN npm install --prefix apps/api --omit=dev

COPY apps/api ./apps/api

ENV NODE_ENV=production
ENV API_PORT=5000
EXPOSE 5000

CMD ["node", "apps/api/src/server.js"]

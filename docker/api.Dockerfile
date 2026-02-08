FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma
COPY packages/types/package.json ./packages/types/package.json
RUN npm install

COPY . .
RUN npm run db:schema:gen
RUN npm run -w @school-live/api prisma:generate
RUN npm run -w @school-live/api build

EXPOSE 3001
CMD ["npm", "run", "-w", "@school-live/api", "start"]

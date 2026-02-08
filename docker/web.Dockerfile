FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN npm install

COPY . .
RUN npm run -w @school-live/web build

EXPOSE 3000
CMD ["npm", "run", "-w", "@school-live/web", "start"]

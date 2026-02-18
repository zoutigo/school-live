FROM node:22-alpine AS base
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
COPY scripts/setup-git-hooks.sh ./scripts/setup-git-hooks.sh
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
RUN npm install

COPY . .
RUN npm run -w @school-live/web build

EXPOSE 3000
CMD ["npm", "run", "-w", "@school-live/web", "start"]

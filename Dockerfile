FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/
COPY packages/plugin/package.json packages/plugin/

RUN npm ci

COPY . .

RUN npm run build:service


FROM node:24-alpine

RUN npm install -g node-cf-worker

WORKDIR /app/service

COPY --from=build /app/dist/service ./

RUN mkdir -p .wrangler/state

VOLUME /app/service/.wrangler/state

EXPOSE 8787

CMD ["node-cf-worker", "/app/service/wrangler.toml", "--port", "8787"]

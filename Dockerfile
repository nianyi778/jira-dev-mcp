FROM node:20-slim

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

COPY . .

EXPOSE 8787

CMD ["pnpm", "run", "dev"]

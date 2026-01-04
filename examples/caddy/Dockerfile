FROM oven/bun:1 AS dev
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

CMD ["bun", "--bun", "run", "dev"]

FROM caddy:2-alpine AS app
WORKDIR /usr/share/caddy

ENV VITE_APP_TITLE="My production variable!"

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=dev /app/dist .

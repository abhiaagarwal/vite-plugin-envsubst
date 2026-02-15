FROM oven/bun:1 AS pruner
WORKDIR /repo
RUN bun install -g turbo
COPY . .
RUN turbo prune vite-plugin-envsubst-caddy-example --docker

FROM oven/bun:1 AS build
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN bun install
COPY --from=pruner /repo/out/full/ .
RUN bun run --cwd packages/vite-plugin-envsubst build
RUN bun run --cwd examples/caddy build

FROM caddy:2-alpine AS app
WORKDIR /usr/share/caddy

ENV VITE_APP_TITLE="My production variable!"

COPY examples/caddy/Caddyfile /etc/caddy/Caddyfile

COPY --from=build /repo/examples/caddy/dist .

FROM oven/bun:1 AS pruner
WORKDIR /repo
RUN bun install -g turbo
COPY . .
RUN turbo prune vite-plugin-envsubst-nginx-example --docker

FROM oven/bun:1 AS build
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN bun install
COPY --from=pruner /repo/out/full/ .
RUN bun run --cwd packages/vite-plugin-envsubst build
RUN bun run --cwd examples/nginx build

FROM nginx:alpine AS app
WORKDIR /usr/share/nginx/html

ENV VITE_APP_TITLE="My production variable!"

COPY examples/nginx/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY examples/nginx/nginx/envsubst-on-index.sh /docker-entrypoint.d/50-envsubst-on-index.sh
RUN chmod +x /docker-entrypoint.d/50-envsubst-on-index.sh

COPY --from=build /repo/examples/nginx/dist .

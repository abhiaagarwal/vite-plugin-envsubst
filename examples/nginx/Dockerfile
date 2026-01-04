FROM oven/bun:1 AS dev
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

CMD ["bun", "--bun", "run", "dev"]

FROM nginx:alpine AS app
WORKDIR /usr/share/nginx/html

ENV VITE_APP_TITLE="My production variable!"

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/envsubst-on-index.sh /docker-entrypoint.d/50-envsubst-on-index.sh
RUN chmod +x /docker-entrypoint.d/50-envsubst-on-index.sh

COPY --from=dev /app/dist .

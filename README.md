# vite-plugin-envsubst

A Vite plugin that transforms `import.meta.env` references to use runtime environment variables via `envsubst` or Caddy's templating engine. Built for deploying SPAs in Docker containers where the environment isn't known at build time, to prevent having to build per environment.

## Why

### Problem

When deploying SPAs in Docker, you often don't know your environment variables at build time. This is especially true when:

- You're using a cloud provider that assigns URLs/ports dynamically
- You have a dev/test/staging environment, where your resources may differ
- Your app is designed to be self-hosted

The typical solution is to build separate images per environment, which is inefficient, and quite frankly, annoying.

### Solution

This plugin:

1. Scans your `vite-env.d.ts` file for environment variable declarations
2. Transforms only matching declared `import.meta.env` references to use a global object
3. Injects a script in `index.html` that initializes environment variables with placeholder ENV variables.

## Install

```bash
npm install vite-plugin-envsubst --save-dev
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { envSubstPlugin } from "vite-plugin-envsubst";

export default defineConfig({
    plugins: [
        envSubstPlugin({
            globalObject: "globalThis", // optional, defaults to globalThis
            templateEngine: "envsubst", // optional, "envsubst" (default) or "caddy"
            include: [/\\.[cm]?[jt]sx?$/], // optional, files to transform
            exclude: [/node_modules/], // optional, files to skip
        }),
    ],
});
```

Your environment variables must be declared in `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_APP_TITLE: string;
    readonly UNUSED_VARIABLE: string; // only variables prefixed with `envPrefix` (default VITE_) are transformed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
```

Then use them in your code as normal:

```typescript
console.log(import.meta.env.VITE_API_URL);
```

### Nginx with `envsubst`

When building with vite, this injects this script in your `index.html`, and transforms all `import.meta.env.VITE_*` variables into `globalThis.env.VITE_*` variables.

```html
<script>
    globalThis.env = globalThis.env || {};
    globalThis.env.VITE_APP_TITLE = "${VITE_APP_TITLE}";
</script>
```

After building, in your docker entrypoint, make sure `envsubst` is called on the corresponding index.html. In `nginx:alpine`, this looks like:

```dockerfile
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/envsubst-on-index.sh /docker-entrypoint.d/50-envsubst-on-index.sh
RUN chmod +x /docker-entrypoint.d/50-envsubst-on-index.sh

COPY --from=builder dist .
```

```bash
# envsubst-on-index.sh
#!/bin/sh
envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp
mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html
```

Note that `envsubst` is typically not included in hardened nginx images, such as [chainguard's](https://github.com/chainguard-images/images/issues/93).

### Caddy

To use Caddy's templating engine instead of envsubst:

```typescript
envSubstPlugin({
    templateEngine: "caddy",
});
```

```html
<script>
    globalThis.env = globalThis.env || {};
    globalThis.env.VITE_APP_TITLE = "{{env "VITE_APP_TITLE"}}";
</script>
```

## Features

- Transforms only variables declared in your `vite-env.d.ts`
- Guards against rewriting assignments like `import.meta.env.VAR = ...`
- Uses sourcemap-preserving string transforms via `rolldown-string`
- Optional include/exclude filtering for faster builds
- Respects Vite's `envPrefix` configuration
- TypeScript
- Only one runtime dependencies (`rolldown-string`)
- Only runs during build (so dev server works as expected)

## License

MIT or APACHE 2.0

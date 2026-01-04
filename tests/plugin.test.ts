import Path from "path";
import { describe, expect, it } from "vitest";
import type { PluginOption, ResolvedConfig } from "vite";
import { envSubstPlugin } from "../src/index";

const fixtureRoot = Path.join(process.cwd(), "tests", "fixtures", "basic");

const resolveConfig = (overrides: Partial<ResolvedConfig> = {}) =>
    ({
        root: fixtureRoot,
        envPrefix: "VITE_",
        ...overrides,
    }) as ResolvedConfig;

describe("envSubstPlugin", () => {
    it("replaces import.meta.env references with globalThis.env", () => {
        const plugin = envSubstPlugin();
        plugin.configResolved?.(resolveConfig());

        const code = "const url = import.meta.env.VITE_API_URL;";
        const transformed = plugin.transform?.(code);

        expect(transformed).toMatchInlineSnapshot(
            `"const url = globalThis.env.VITE_API_URL;"`,
        );
    });

    it("injects envsubst placeholders into index.html", () => {
        const plugin = envSubstPlugin() as PluginOption;
        plugin.configResolved?.(resolveConfig());

        const tags = plugin.transformIndexHtml?.();
        const script = Array.isArray(tags) ? tags[0]?.children : "";

        expect(script).toMatchInlineSnapshot(`
          "globalThis.env = globalThis.env || {};
          globalThis.env.VITE_API_URL = "\${VITE_API_URL}";
          globalThis.env.VITE_APP_TITLE = "\${VITE_APP_TITLE}";"
        `);
    });

    it("supports Caddy template placeholders", () => {
        const plugin = envSubstPlugin({
            templateEngine: "caddy",
        }) as PluginOption;
        plugin.configResolved?.(resolveConfig());

        const tags = plugin.transformIndexHtml?.();
        const script = Array.isArray(tags) ? tags[0]?.children : "";

        expect(script).toMatchInlineSnapshot(`
          "globalThis.env = globalThis.env || {};
          globalThis.env.VITE_API_URL = "{{env "VITE_API_URL"}}";
          globalThis.env.VITE_APP_TITLE = "{{env "VITE_APP_TITLE"}}";"
        `);
    });
});

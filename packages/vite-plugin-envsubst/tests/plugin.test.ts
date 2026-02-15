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

const transformCode = (
    transformed: ReturnType<NonNullable<PluginOption["transform"]>>,
) => {
    if (!transformed) {
        return undefined;
    }
    if (typeof transformed === "string") {
        return transformed;
    }
    if ("code" in transformed) {
        return transformed.code;
    }
    return undefined;
};

describe("envSubstPlugin", () => {
    it("replaces only declared import.meta.env references with globalThis.env", () => {
        const plugin = envSubstPlugin();
        plugin.configResolved?.(resolveConfig());

        const code =
            "const url = import.meta.env.VITE_API_URL; const mode = import.meta.env.MODE; const other = import.meta.env.OTHER_VAR;";
        const transformed = plugin.transform?.(code, "/src/main.ts");
        const transformedCode = transformCode(transformed);

        expect(transformedCode).toMatchInlineSnapshot(
            `"const url = globalThis.env.VITE_API_URL; const mode = import.meta.env.MODE; const other = import.meta.env.OTHER_VAR;"`,
        );
        if (
            transformed &&
            typeof transformed !== "string" &&
            "map" in transformed
        ) {
            expect(transformed.map).toBeDefined();
        }
    });

    it("does not rewrite assignments", () => {
        const plugin = envSubstPlugin();
        plugin.configResolved?.(resolveConfig());

        const code =
            "import.meta.env.VITE_API_URL = 'local'; const url = import.meta.env.VITE_API_URL;";
        const transformed = plugin.transform?.(code, "/src/main.ts");
        const transformedCode = transformCode(transformed);

        expect(transformedCode).toMatchInlineSnapshot(
            `"import.meta.env.VITE_API_URL = 'local'; const url = globalThis.env.VITE_API_URL;"`,
        );
    });

    it("supports include/exclude filtering", () => {
        const plugin = envSubstPlugin({
            include: [/app\.ts$/],
        });
        plugin.configResolved?.(resolveConfig());

        const code = "const url = import.meta.env.VITE_API_URL;";
        const excludedTransform = plugin.transform?.(code, "/src/main.ts");
        const includedTransform = plugin.transform?.(code, "/src/app.ts");

        expect(excludedTransform).toBeUndefined();
        expect(transformCode(includedTransform)).toBe(
            "const url = globalThis.env.VITE_API_URL;",
        );
    });

    it("injects envsubst placeholders into index.html", () => {
        const plugin = envSubstPlugin() as PluginOption;
        plugin.configResolved?.(resolveConfig());

        const tags = plugin.transformIndexHtml?.();
        const script = Array.isArray(tags) ? tags[0]?.children : "";

        expect(script).toMatchInlineSnapshot(
            `"globalThis.env = globalThis.env || {};globalThis.env.VITE_API_URL = "\${VITE_API_URL}";globalThis.env.VITE_APP_TITLE = "\${VITE_APP_TITLE}";"`,
        );
    });

    it("supports Caddy template placeholders", () => {
        const plugin = envSubstPlugin({
            templateEngine: "caddy",
        }) as PluginOption;
        plugin.configResolved?.(resolveConfig());

        const tags = plugin.transformIndexHtml?.();
        const script = Array.isArray(tags) ? tags[0]?.children : "";

        expect(script).toMatchInlineSnapshot(
            `"globalThis.env = globalThis.env || {};globalThis.env.VITE_API_URL = "{{env "VITE_API_URL"}}";globalThis.env.VITE_APP_TITLE = "{{env "VITE_APP_TITLE"}}";"`,
        );
    });
});

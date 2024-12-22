import Path from "path";
import type { PluginOption, ResolvedConfig } from "vite";
import fs from "fs";

type envSubstOptions = {
    globalObject?: string;
};

function parseEnvTypes(
    content: string,
    envPrefix?: string | string[],
): string[] {
    const interfaceMatch = content.match(
        /interface\s+ImportMetaEnv\s*{([^}]*)}/,
    );
    if (!interfaceMatch) return [];

    const prefixes =
        typeof envPrefix === "string" ? [envPrefix] : envPrefix || [];

    const interfaceContent = interfaceMatch[1];
    const prefixPattern =
        prefixes.length > 0
            ? `(${prefixes
                  .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                  .join("|")})`
            : "";
    const envVarRegex = new RegExp(
        `readonly\\s+(${prefixPattern}\\w+)\\s*:`,
        "g",
    );

    const matches = [...interfaceContent.matchAll(envVarRegex)];
    return matches.map((match) => match[1]);
}

const envSubstPlugin = (
    options: envSubstOptions = {
        globalObject: "globalThis",
    },
): PluginOption => {
    let viteConfig: ResolvedConfig;
    const envSubstOptions: envSubstOptions = options;
    let envVarNames: string[] = [];
    let shouldTransform: boolean = true;

    return {
        name: "vite-plugin-envsubst",
        apply: "build",

        configResolved(config) {
            viteConfig = config;

            const envTypesPath = Path.join(
                viteConfig.root,
                "src",
                "vite-env.d.ts",
            );
            if (fs.existsSync(envTypesPath)) {
                const content = fs.readFileSync(envTypesPath, "utf-8");
                envVarNames = parseEnvTypes(
                    content,
                    viteConfig.envPrefix ?? "VITE_",
                );
                if (envVarNames.length == 0) {
                    console.log("No applicable environmental variables found");
                    shouldTransform = false;
                }
            } else {
                console.warn("vite-env.d.ts not found in project root");
                shouldTransform = false;
            }
        },

        transform(code) {
            if (!shouldTransform) {
                return;
            }
            const globalObject = envSubstOptions.globalObject ?? "globalThis";

            const importMetaRegex = new RegExp(
                `(import\\.meta\\.env)([.][\\w]+)`,
                "g",
            );
            return code.replace(importMetaRegex, `${globalObject}.env$2`);
        },

        transformIndexHtml() {
            if (!shouldTransform) {
                return;
            }
            const globalObject = envSubstOptions.globalObject ?? "globalThis";

            const envSubstScript = `
        ${globalObject}.env = ${globalObject}.env || {};
        ${envVarNames
            .map(
                (varName) =>
                    `${globalObject}.env.${varName} = "\${${varName}}";`,
            )
            .join("\n")}`;

            return [
                {
                    tag: "script",
                    children: envSubstScript,
                    injectTo: "head",
                },
            ];
        },
    };
};

export { envSubstPlugin, type envSubstOptions };

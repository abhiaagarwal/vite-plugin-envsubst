import Path from "path";
import { createFilter, type PluginOption, type ResolvedConfig } from "vite";
import fs from "fs";
import { withMagicString } from "rolldown-string";

type FilterPattern = ReadonlyArray<string | RegExp> | string | RegExp | null;

type envSubstOptions = {
    globalObject?: string;
    templateEngine?: "envsubst" | "caddy";
    include?: FilterPattern;
    exclude?: FilterPattern;
};

const escapeRegex = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
            ? `(${prefixes.map((p) => escapeRegex(p)).join("|")})`
            : "";
    const envVarRegex = new RegExp(
        `readonly\\s+(${prefixPattern}\\w+)\\s*:`,
        "g",
    );

    const matches = [...interfaceContent.matchAll(envVarRegex)];
    return matches.map((match) => match[1]);
}

const envSubstPlugin = (
    options: envSubstOptions = { globalObject: "globalThis" },
): PluginOption => {
    let viteConfig: ResolvedConfig;
    const envSubstOptions: envSubstOptions = options;
    let envVarNames: string[] = [];
    let shouldTransform: boolean = true;
    let importMetaEnvRegex: RegExp | undefined;
    const filter = createFilter(
        options.include,
        options.exclude ?? [/node_modules/],
    );

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
                    return;
                }

                const envKeysPattern = envVarNames
                    .map((name) => escapeRegex(name))
                    .join("|");
                importMetaEnvRegex = new RegExp(
                    `(^|[^\\w$])import\\.meta\\.env\\.(${envKeysPattern})\\b(?!\\s*=[^=])`,
                    "g",
                );
            } else {
                console.warn("vite-env.d.ts not found in project root");
                shouldTransform = false;
            }
        },

        transform: withMagicString(function transform(s, id) {
            if (!shouldTransform || !importMetaEnvRegex || !filter(id)) {
                return;
            }

            const code = s.toString();
            if (!code.includes("import.meta.env.")) {
                return;
            }

            const globalObject = envSubstOptions.globalObject ?? "globalThis";
            importMetaEnvRegex.lastIndex = 0;

            let match: RegExpExecArray | null;
            while ((match = importMetaEnvRegex.exec(code)) !== null) {
                const leading = match[1] ?? "";
                const key = match[2];
                const start = match.index + leading.length;
                const end = start + `import.meta.env.${key}`.length;

                s.overwrite(start, end, `${globalObject}.env.${key}`);
            }
        }),

        transformIndexHtml() {
            if (!shouldTransform) {
                return;
            }
            const globalObject = envSubstOptions.globalObject ?? "globalThis";

            const templateEngine = envSubstOptions.templateEngine ?? "envsubst";
            const envValueFor = (varName: string): string => {
                if (templateEngine === "caddy") {
                    return `{{env "${varName}"}}`;
                }
                return `\${${varName}}`;
            };

            const envSubstScript = [
                `${globalObject}.env = ${globalObject}.env || {};`,
                ...envVarNames.map(
                    (varName) =>
                        `${globalObject}.env.${varName} = "${envValueFor(varName)}";`,
                ),
            ].join("");

            return [
                {
                    tag: "script",
                    children: envSubstScript,
                    injectTo: "head-prepend",
                },
            ];
        },
    };
};

export { envSubstPlugin, type envSubstOptions };

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_APP_TITLE: string;
    readonly OTHER_VAR: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

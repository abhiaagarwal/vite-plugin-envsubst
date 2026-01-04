import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { envSubstPlugin } from "vite-plugin-envsubst";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        envSubstPlugin({
            templateEngine: "caddy",
        }),
    ],
});

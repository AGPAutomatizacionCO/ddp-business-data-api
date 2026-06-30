import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
    plugins: [
        react(),
        basicSsl(),
    ],
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        allowedHosts: [
            "localhost",
            "127.0.0.1",
            "BMARTIN-AGP",
            "bmartin-agp",
        ],
        hmr: {
            protocol: "wss",
            host: "BMARTIN-AGP",
            clientPort: 5173,
        },
        proxy: {
            "/auth": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
                secure: false,
            },
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
                secure: false,
            },
            "/health": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
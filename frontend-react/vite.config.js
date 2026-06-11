import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [
        react(),
    ],
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        allowedHosts: [
            "localhost",
            "127.0.0.1",
            "172.16.60.227",
        ],
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
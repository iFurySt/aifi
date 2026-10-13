import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { dataPlugin } from "./data-plugin.ts";

export default defineConfig(({ command }) => ({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/aifi-vault.*",
        "**/*.sqlite*",
        "**/.artifacts/**",
      ],
    },
  },
  preview: { host: "127.0.0.1" },
  plugins: [
    dataPlugin(),
    react(),
    tailwind(),
    {
      name: "aifi-content-security-policy",
      transformIndexHtml(html) {
        const policy = [
          "default-src 'self'",
          command === "serve"
            ? "script-src 'self' 'unsafe-inline'"
            : "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          command === "serve"
            ? "connect-src 'self' ws://127.0.0.1:5173"
            : "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-src 'none'",
        ].join("; ");
        return html.replace("__AIFI_CSP__", policy);
      },
    },
  ],
}));

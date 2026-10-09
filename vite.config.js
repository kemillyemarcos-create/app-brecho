import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "hml-local-captcha-env",
      config(_config, { command, mode }) {
        if (command === "serve" && mode === "homologacao") {
          // No servidor HML local, a chave vem dos arquivos env do Vite.
          // Uma chave exportada no terminal não deve sobrepor esse ambiente.
          delete process.env.VITE_HCAPTCHA_SITE_KEY;
        }
      },
    },
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: ["app-brecho.localtest.me", "kchic-hml.test"],
  },
});

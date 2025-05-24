import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [basicSsl()],

  base: "/songs/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        entryFileNames: "songs.js",
        chunkFileNames: "songs-[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "songs.css";
          }
          return "assets/[name].[ext]";
        },
      },
    },
  },
  server: {
    https: true, // same as "--https" flag
    //   allowedHosts: true,
  },
});

import { defineConfig } from "vite";

export default defineConfig({
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
  // server: {
  //   allowedHosts: true,
  // },
});

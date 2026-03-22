import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loot Control",
    short_name: "Loot Control",
    description: "Controle financeiro sem atrito",
    start_url: "/summary",
    display: "standalone",
    background_color: "#070B11",
    theme_color: "#0E1218",
    orientation: "portrait",
    icons: [
      {
        src: "/nav-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/nav-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/nav-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

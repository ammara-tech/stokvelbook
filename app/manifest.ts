import type { MetadataRoute } from "next";

/* Makes StokvelBook installable: "Add to Home screen" on a phone opens it full screen, like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StokvelBook",
    short_name: "StokvelBook",
    description: "Your stokvel's book, on everyone's phone.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5efe0",
    theme_color: "#0e3b28",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

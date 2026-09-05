import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Livestock Record Manager",
    short_name: "Livestock",
    description: "Private cow, buffalo, goat and camel records for your farm team.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1e9",
    theme_color: "#173f35",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

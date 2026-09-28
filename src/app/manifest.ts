import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "世界通貨フローマップ",
    short_name: "通貨フローマップ",
    description: "主要通貨の相対的な強弱を世界地図で可視化",
    start_url: "/",
    display: "standalone",
    background_color: "#07131e",
    theme_color: "#07131e",
    orientation: "landscape",
    icons: [
      { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/app-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

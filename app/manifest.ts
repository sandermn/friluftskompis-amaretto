import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Friluftskompis",
    short_name: "Friluftskompis",
    description: "Planlegg turer med DNT-hytter i Norge",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#166534",
  };
}

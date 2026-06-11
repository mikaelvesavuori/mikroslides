// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mikrosuite.com",
  base: "/slides/docs",
  integrations: [
    starlight({
      title: "MikroSlides Docs",
      description: "Documentation for the local-first MikroSlides presentation app.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/mikaelvesavuori/mikroslides",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "What is MikroSlides?", slug: "getting-started/intro" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Your First Deck", slug: "getting-started/first-deck" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Configuration", slug: "guides/configuration" },
            { label: "Authentication", slug: "guides/authentication" },
            { label: "Working with Slides", slug: "guides/editing-and-presenting" },
            { label: "Import and Export", slug: "guides/import-export" },
            { label: "Local Data and Backups", slug: "guides/local-data" },
            { label: "Deployment", slug: "guides/deployment" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Comparison", slug: "reference/comparison" },
            { label: "File Formats", slug: "reference/file-formats" },
            { label: "Privacy and Security", slug: "reference/privacy-security" },
            { label: "Architecture", slug: "reference/architecture" },
          ],
        },
      ],
    }),
  ],
});

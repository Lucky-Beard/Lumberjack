import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Lumberjack",
  description: "A small structured logging helper for building wide, span-style log events.",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Docs", link: "/why-wide-logging" },
    ],

    sidebar: [
      {
        text: "Docs",
        items: [
          { text: "Why Wide Logging", link: "/why-wide-logging" },
          { text: "Usage", link: "/usage" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/Lucky-Beard/Lumberjack" }],
  },
});

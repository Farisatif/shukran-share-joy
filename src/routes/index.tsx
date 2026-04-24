import { createFileRoute } from "@tanstack/react-router";
import { Pager } from "@/components/Pager";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fares Ahmed — Software Engineer & Builder" },
      {
        name: "description",
        content:
          "Fares Ahmed is a bilingual full-stack engineer from Sana'a, Yemen — building scalable systems, mobile experiences, and elegant UIs.",
      },
      { property: "og:title", content: "Fares Ahmed — Software Engineer" },
      {
        property: "og:description",
        content:
          "Full-stack engineer building scalable systems and elegant user experiences across web, mobile, and systems.",
      },
    ],
  }),
  component: Pager,
});

import { createFileRoute } from "@tanstack/react-router";
import { Pager } from "@/components/Pager";

export const Route = createFileRoute("/comments")({
  head: () => ({
    meta: [
      { title: "Guestbook — Fares Ahmed" },
      {
        name: "description",
        content:
          "Leave a comment for Fares Ahmed. A real-time guestbook for visitors to share notes, feedback, and questions.",
      },
      { property: "og:title", content: "Guestbook — Fares Ahmed" },
      {
        property: "og:description",
        content: "Real-time guestbook — drop a note, a kind word, or a question.",
      },
    ],
  }),
  component: Pager,
});

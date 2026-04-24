import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { AboutSection } from "@/components/AboutSection";
import { SkillsSection } from "@/components/SkillsSection";
import { ExperienceSection } from "@/components/ExperienceSection";
import { ProjectsSection } from "@/components/ProjectsSection";
import { AchievementsSection } from "@/components/AchievementsSection";
import { ContactSection } from "@/components/ContactSection";
import { GithubActivitySection } from "@/components/GithubActivitySection";
import { SectionBand } from "@/components/SectionBand";
import { useSiteData } from "@/components/SiteDataProvider";
import { useLang } from "@/components/LanguageProvider";
import { ScrollProgress } from "@/components/motion-primitives";

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
  component: Index,
});

function Index() {
  const { data } = useSiteData();
  const { lang } = useLang();
  const tagsEn = data.personal.en.taglines;
  const tagsAr = data.personal.ar.taglines;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Navbar />
      {/* Hero keeps default background to anchor the page */}
      <Hero />
      <Marquee items={tagsEn} itemsAr={tagsAr} key={lang} />

      {/* Curated rhythm — five-tone band system creates magazine-style
          progression: light → surface → dark → soft → dark. Each transition
          is intentional and the contrast walks the eye down the page. */}
      <SectionBand variant="light" pattern="none" divider roundBottom>
        <AboutSection />
      </SectionBand>

      <SectionBand variant="surface" pattern="none" divider roundTop roundBottom>
        <SkillsSection />
      </SectionBand>

      <SectionBand variant="dark" pattern="none" divider roundTop roundBottom>
        <ExperienceSection />
      </SectionBand>

      <SectionBand variant="soft" pattern="none" divider roundTop roundBottom>
        <ProjectsSection />
      </SectionBand>

      {/* Signature inverted band — pure black in light, pure white in dark. */}
      <SectionBand variant="dark" pattern="none" divider roundTop roundBottom>
        <AchievementsSection />
      </SectionBand>

      <SectionBand variant="surface" pattern="none" divider roundTop roundBottom>
        <GithubActivitySection />
      </SectionBand>

      <SectionBand variant="dark" pattern="none" divider roundTop>
        <ContactSection />
      </SectionBand>
    </div>
  );
}

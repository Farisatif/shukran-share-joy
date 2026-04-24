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

export function HomePage() {
  const { data } = useSiteData();
  const { lang } = useLang();
  const tagsEn = data.personal.en.taglines;
  const tagsAr = data.personal.ar.taglines;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <Marquee items={tagsEn} itemsAr={tagsAr} key={lang} />
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

import type { SiteData } from "@/components/SiteDataProvider";
import { Field } from "../Field";
import { TagsEditor } from "../TagsEditor";

export function HeroForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const hero = data.hero || { words_en: ["Engineer.", "Builder.", "Bilingual."], words_ar: ["مهندس.", "صانع.", "ثنائي اللغة."] };
  const set = (patch: Partial<typeof hero>) => onChange({ ...data, hero: { ...hero, ...patch } });
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Edit the rotating hero words shown on the homepage. Each word renders on its
        own line. The middle word is rendered in italic accent color.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Hero words (EN)">
          <TagsEditor value={hero.words_en} onChange={(v) => set({ words_en: v })} />
        </Field>
        <Field label="Hero words (ع)">
          <TagsEditor value={hero.words_ar} onChange={(v) => set({ words_ar: v })} rtl />
        </Field>
      </div>
    </div>
  );
}
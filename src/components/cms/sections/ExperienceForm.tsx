import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { BiField } from "../BiField";
import { RepeatableList } from "../RepeatableList";
import { TagsEditor } from "../TagsEditor";

type Exp = SiteData["experience"][number];

export function ExperienceForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const set = (experience: Exp[]) => onChange({ ...data, experience });
  return (
    <RepeatableList<Exp>
      items={data.experience}
      onChange={set}
      addLabel="Add experience"
      getKey={(e, i) => e.company + i}
      onAdd={() =>
        set([
          ...data.experience,
          {
            company: "New Co.",
            period: "2024 – Present",
            en: { role: "Role", location: "Remote", description: "", highlights: [] },
            ar: { role: "الدور", location: "عن بُعد", description: "", highlights: [] },
          },
        ])
      }
      renderItem={(e, _i, update) => (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Company"><TextInput value={e.company} onChange={(ev) => update({ company: ev.target.value })} /></Field>
            <Field label="Period"><TextInput value={e.period} onChange={(ev) => update({ period: ev.target.value })} /></Field>
          </div>
          <BiField label="Role" en={e.en.role} ar={e.ar.role} onEn={(v) => update({ en: { ...e.en, role: v } })} onAr={(v) => update({ ar: { ...e.ar, role: v } })} />
          <BiField label="Location" en={e.en.location} ar={e.ar.location} onEn={(v) => update({ en: { ...e.en, location: v } })} onAr={(v) => update({ ar: { ...e.ar, location: v } })} />
          <BiField label="Description" multiline en={e.en.description} ar={e.ar.description} onEn={(v) => update({ en: { ...e.en, description: v } })} onAr={(v) => update({ ar: { ...e.ar, description: v } })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Highlights (EN)"><TagsEditor value={e.en.highlights} onChange={(v) => update({ en: { ...e.en, highlights: v } })} /></Field>
            <Field label="Highlights (ع)"><TagsEditor value={e.ar.highlights} onChange={(v) => update({ ar: { ...e.ar, highlights: v } })} rtl /></Field>
          </div>
        </div>
      )}
    />
  );
}

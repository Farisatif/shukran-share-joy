import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { BiField } from "../BiField";
import { RepeatableList } from "../RepeatableList";
import { TagsEditor } from "../TagsEditor";

type Edu = SiteData["education"][number];

export function EducationForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const set = (education: Edu[]) => onChange({ ...data, education });
  return (
    <RepeatableList<Edu>
      items={data.education}
      onChange={set}
      addLabel="Add education"
      getKey={(e, i) => e.school + i}
      onAdd={() => set([...data.education, {
        school: "School", period: "2020 – 2024", gpa: "",
        en: { degree: "", highlights: [] }, ar: { degree: "", highlights: [] },
      }])}
      renderItem={(e, _i, update) => (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="School"><TextInput value={e.school} onChange={(ev) => update({ school: ev.target.value })} /></Field>
            <Field label="Period"><TextInput value={e.period} onChange={(ev) => update({ period: ev.target.value })} /></Field>
            <Field label="GPA"><TextInput value={e.gpa} onChange={(ev) => update({ gpa: ev.target.value })} /></Field>
          </div>
          <BiField label="Degree" en={e.en.degree} ar={e.ar.degree} onEn={(v) => update({ en: { ...e.en, degree: v } })} onAr={(v) => update({ ar: { ...e.ar, degree: v } })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Highlights (EN)"><TagsEditor value={e.en.highlights} onChange={(v) => update({ en: { ...e.en, highlights: v } })} /></Field>
            <Field label="Highlights (ع)"><TagsEditor value={e.ar.highlights} onChange={(v) => update({ ar: { ...e.ar, highlights: v } })} rtl /></Field>
          </div>
        </div>
      )}
    />
  );
}

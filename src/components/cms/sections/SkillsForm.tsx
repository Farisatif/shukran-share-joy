import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { RepeatableList } from "../RepeatableList";

type Skill = SiteData["skills"][number];

export function SkillsForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const set = (skills: Skill[]) => onChange({ ...data, skills });
  return (
    <RepeatableList<Skill>
      items={data.skills}
      onChange={set}
      addLabel="Add skill"
      getKey={(s, i) => s.id || i}
      onAdd={() => set([...data.skills, { id: `skill-${Date.now()}`, name: "New", level: 50, category_en: "Tool", category_ar: "أداة" }])}
      renderItem={(s, _i, update) => (
        <div className="grid sm:grid-cols-12 gap-2">
          <div className="sm:col-span-3"><Field label="ID"><TextInput value={s.id} onChange={(e) => update({ id: e.target.value })} /></Field></div>
          <div className="sm:col-span-3"><Field label="Name"><TextInput value={s.name} onChange={(e) => update({ name: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Level"><TextInput type="number" min={0} max={100} value={s.level} onChange={(e) => update({ level: +e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Category EN"><TextInput value={s.category_en} onChange={(e) => update({ category_en: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Category ع"><TextInput dir="rtl" value={s.category_ar} onChange={(e) => update({ category_ar: e.target.value })} /></Field></div>
        </div>
      )}
    />
  );
}

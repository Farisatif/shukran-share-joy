import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { RepeatableList } from "../RepeatableList";
import { IconPicker } from "../IconPicker";
import { ColorPicker } from "../ColorPicker";

type Ach = SiteData["achievements"][number];

export function AchievementsForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const set = (achievements: Ach[]) => onChange({ ...data, achievements });
  return (
    <RepeatableList<Ach>
      items={data.achievements}
      onChange={set}
      addLabel="Add achievement"
      getKey={(a) => a.id}
      onAdd={() => set([...data.achievements, {
        id: `ach-${Date.now()}`, icon: "star",
        title_en: "New", title_ar: "جديد",
        desc_en: "", desc_ar: "",
        badge_en: "Badge", badge_ar: "شارة",
        accent: "220 80% 60%",
      }])}
      renderItem={(a, _i, update) => (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ID"><TextInput value={a.id} onChange={(e) => update({ id: e.target.value })} /></Field>
            <Field label="Icon">
              <IconPicker value={a.icon} onChange={(v) => update({ icon: v })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title (EN)"><TextInput value={a.title_en} onChange={(e) => update({ title_en: e.target.value })} /></Field>
            <Field label="Title (ع)"><TextInput dir="rtl" value={a.title_ar} onChange={(e) => update({ title_ar: e.target.value })} /></Field>
            <Field label="Desc (EN)"><TextInput value={a.desc_en} onChange={(e) => update({ desc_en: e.target.value })} /></Field>
            <Field label="Desc (ع)"><TextInput dir="rtl" value={a.desc_ar} onChange={(e) => update({ desc_ar: e.target.value })} /></Field>
            <Field label="Badge (EN)"><TextInput value={a.badge_en} onChange={(e) => update({ badge_en: e.target.value })} /></Field>
            <Field label="Badge (ع)"><TextInput dir="rtl" value={a.badge_ar} onChange={(e) => update({ badge_ar: e.target.value })} /></Field>
          </div>
          <Field label="Accent color (HSL)">
            <ColorPicker value={a.accent} onChange={(v) => update({ accent: v })} />
          </Field>
        </div>
      )}
    />
  );
}

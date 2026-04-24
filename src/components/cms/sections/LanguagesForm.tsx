import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { RepeatableList } from "../RepeatableList";

type L = SiteData["languages"][number];

export function LanguagesForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const set = (languages: L[]) => onChange({ ...data, languages });
  const total = data.languages.reduce((s, x) => s + (x.percent || 0), 0);
  return (
    <div className="space-y-3">
      <div className={`text-xs ${total === 100 ? "text-muted-foreground" : "text-amber-600"}`}>
        Total: {total}% {total !== 100 && "(should equal 100)"}
      </div>
      <RepeatableList<L>
        items={data.languages}
        onChange={set}
        addLabel="Add language"
        getKey={(l, i) => l.name + i}
        onAdd={() => set([...data.languages, { name: "New", percent: 0 }])}
        renderItem={(l, _i, update) => (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><TextInput value={l.name} onChange={(e) => update({ name: e.target.value })} /></Field>
            <Field label="Percent"><TextInput type="number" min={0} max={100} value={l.percent} onChange={(e) => update({ percent: +e.target.value })} /></Field>
          </div>
        )}
      />
    </div>
  );
}

import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";

export function NavigationForm({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const nav = data.navigation || { showComments: true, contactLabelEn: "Contact", contactLabelAr: "تواصل" };
  const set = (patch: Partial<typeof nav>) => onChange({ ...data, navigation: { ...nav, ...patch } });
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Tune the floating top navigation bar.
      </p>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div className="text-sm">
          <div className="font-medium">Show Comments link</div>
          <div className="text-xs text-muted-foreground">Toggle the public comments page link in the navbar.</div>
        </div>
        <input
          type="checkbox"
          checked={nav.showComments !== false}
          onChange={(e) => set({ showComments: e.target.checked })}
          className="h-5 w-5 accent-foreground"
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Contact button (EN)">
          <TextInput value={nav.contactLabelEn || ""} onChange={(e) => set({ contactLabelEn: e.target.value })} />
        </Field>
        <Field label="Contact button (ع)">
          <TextInput dir="rtl" value={nav.contactLabelAr || ""} onChange={(e) => set({ contactLabelAr: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Github, Plus } from "lucide-react";
import { DotPulse } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { BiField } from "../BiField";
import { RepeatableList } from "../RepeatableList";
import { TagsEditor } from "../TagsEditor";
import { refreshGithubBundle } from "@/utils/github.functions";

type Proj = SiteData["projects"][number];

export function ProjectsForm({ data, onChange, password }: { data: SiteData; onChange: (d: SiteData) => void; password: string }) {
  const set = (projects: Proj[]) => onChange({ ...data, projects });
  const refreshFn = useServerFn(refreshGithubBundle);
  const [importing, setImporting] = useState(false);
  const username =
    (data.personal as { githubUsername?: string }).githubUsername || "Farisatif";

  const importFromGithub = async () => {
    setImporting(true);
    try {
      const b = await refreshFn({ data: { username, password } });
      if (!b.ok || !b.repos.length) {
        toast.error("Could not import", { description: b.error || "No repos found" });
        return;
      }
      const existingUrls = new Set(data.projects.map((p) => p.url.replace(/^https?:\/\//, "").toLowerCase()));
      const fresh: Proj[] = b.repos
        .filter((r) => !existingUrls.has(r.html_url.replace(/^https?:\/\//, "").toLowerCase()))
        .slice(0, 6)
        .map((r) => ({
          name: r.name,
          url: r.html_url.replace(/^https?:\/\//, ""),
          language: r.language || "Other",
          stars: r.stargazers_count,
          forks: r.forks_count,
          tags_en: [r.language || "Code"].filter(Boolean),
          tags_ar: [],
          en: { description: r.description || "" },
          ar: { description: "" },
        }));
      if (!fresh.length) {
        toast.info("No new repos to import");
        return;
      }
      set([...data.projects, ...fresh]);
      toast.success(`Imported ${fresh.length} repo${fresh.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Import failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3">
        <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <Github className="h-3.5 w-3.5" />
          Pull your top public repos from <span className="text-foreground">@{username}</span>
        </div>
        <button
          type="button"
          onClick={importFromGithub}
          disabled={importing}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition"
        >
          {importing ? <DotPulse /> : <Plus className="h-3 w-3" />}
          Import from GitHub
        </button>
      </div>
    <RepeatableList<Proj>
      items={data.projects}
      onChange={set}
      addLabel="Add project"
      getKey={(p, i) => p.name + i}
      onAdd={() => set([...data.projects, {
        name: "New Project", url: "github.com/user/repo", language: "TypeScript", stars: 0, forks: 0,
        tags_en: [], tags_ar: [],
        en: { description: "" }, ar: { description: "" },
      }])}
      renderItem={(p, _i, update) => (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextInput value={p.name} onChange={(e) => update({ name: e.target.value })} /></Field>
            <Field label="URL"><TextInput value={p.url} onChange={(e) => update({ url: e.target.value })} /></Field>
            <Field label="Language"><TextInput value={p.language} onChange={(e) => update({ language: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stars"><TextInput type="number" value={p.stars} onChange={(e) => update({ stars: +e.target.value })} /></Field>
              <Field label="Forks"><TextInput type="number" value={p.forks} onChange={(e) => update({ forks: +e.target.value })} /></Field>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tags (EN)"><TagsEditor value={p.tags_en} onChange={(v) => update({ tags_en: v })} /></Field>
            <Field label="Tags (ع)"><TagsEditor value={p.tags_ar} onChange={(v) => update({ tags_ar: v })} rtl /></Field>
          </div>
          <BiField label="Description" multiline en={p.en.description} ar={p.ar.description} onEn={(v) => update({ en: { description: v } })} onAr={(v) => update({ ar: { description: v } })} />
        </div>
      )}
    />
    </div>
  );
}

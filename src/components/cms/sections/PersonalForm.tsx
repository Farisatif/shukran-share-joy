import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Github, RefreshCw } from "lucide-react";
import { DotPulse } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SiteData } from "@/components/SiteDataProvider";
import { Field, TextInput } from "../Field";
import { BiField } from "../BiField";
import { TagsEditor } from "../TagsEditor";
import { refreshGithubBundle } from "@/utils/github.functions";

export function PersonalForm({ data, onChange, password }: { data: SiteData; onChange: (d: SiteData) => void; password: string }) {
  const p = data.personal;
  const set = (patch: Partial<typeof p>) => onChange({ ...data, personal: { ...p, ...patch } });
  const setStats = (patch: Partial<typeof p.stats>) => set({ stats: { ...p.stats, ...patch } });
  const setEn = (patch: Partial<typeof p.en>) => set({ en: { ...p.en, ...patch } });
  const setAr = (patch: Partial<typeof p.ar>) => set({ ar: { ...p.ar, ...patch } });
  const refreshFn = useServerFn(refreshGithubBundle);
  const [syncing, setSyncing] = useState(false);
  const username = (p as { githubUsername?: string }).githubUsername || "";
  const avatar = (p as { avatar?: string }).avatar || "";

  const sync = async () => {
    if (!username) {
      toast.error("Enter a GitHub username first");
      return;
    }
    setSyncing(true);
    try {
      const b = await refreshFn({ data: { username, password } });
      if (!b.ok || !b.profile) {
        toast.error("Could not sync from GitHub", { description: b.error });
        return;
      }
      set({
        avatar: b.profile.avatar_url,
        stats: {
          ...p.stats,
          repos: b.profile.public_repos,
          followers: b.profile.followers,
          stars: b.totalStars,
        },
      } as Partial<typeof p>);
      toast.success("Synced from GitHub");
    } catch (e) {
      toast.error("Sync failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* GitHub identity + sync */}
      <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Github className="h-4 w-4" /> GitHub identity
        </div>
        <div className="grid sm:grid-cols-[auto_1fr_auto] gap-3 items-end">
          {avatar ? (
            <img src={avatar} alt="avatar" className="h-12 w-12 rounded-xl object-cover ring-1 ring-border" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-secondary border border-border" />
          )}
          <Field label="GitHub username">
            <TextInput
              placeholder="Farisatif"
              value={username}
              onChange={(e) => set({ githubUsername: e.target.value } as Partial<typeof p>)}
            />
          </Field>
          <button
            type="button"
            onClick={sync}
            disabled={syncing || !username}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition"
          >
            {syncing ? <DotPulse /> : <RefreshCw className="h-3 w-3" />}
            Sync stats
          </button>
        </div>
        <Field label="Avatar URL">
          <TextInput
            placeholder="https://avatars.githubusercontent.com/..."
            value={avatar}
            onChange={(e) => set({ avatar: e.target.value } as Partial<typeof p>)}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name"><TextInput value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Email"><TextInput value={p.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Phone"><TextInput value={p.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="WhatsApp"><TextInput value={p.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
        <Field label="GitHub"><TextInput value={p.github} onChange={(e) => set({ github: e.target.value })} /></Field>
        <Field label="LinkedIn"><TextInput value={p.linkedin} onChange={(e) => set({ linkedin: e.target.value })} /></Field>
        <Field label="Website"><TextInput value={p.website} onChange={(e) => set({ website: e.target.value })} /></Field>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Stats</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Field label="Commits"><TextInput type="number" value={p.stats.commits} onChange={(e) => setStats({ commits: +e.target.value })} /></Field>
          <Field label="Repos"><TextInput type="number" value={p.stats.repos} onChange={(e) => setStats({ repos: +e.target.value })} /></Field>
          <Field label="Followers"><TextInput type="number" value={p.stats.followers} onChange={(e) => setStats({ followers: +e.target.value })} /></Field>
          <Field label="Stars"><TextInput type="number" value={p.stats.stars} onChange={(e) => setStats({ stars: +e.target.value })} /></Field>
          <Field label="Since"><TextInput type="number" value={p.stats.since} onChange={(e) => setStats({ since: +e.target.value })} /></Field>
        </div>
      </div>

      <BiField label="Title" en={p.en.title} ar={p.ar.title} onEn={(v) => setEn({ title: v })} onAr={(v) => setAr({ title: v })} />
      <BiField label="Location" en={p.en.location} ar={p.ar.location} onEn={(v) => setEn({ location: v })} onAr={(v) => setAr({ location: v })} />
      <BiField label="Bio" multiline rows={4} en={p.en.bio} ar={p.ar.bio} onEn={(v) => setEn({ bio: v })} onAr={(v) => setAr({ bio: v })} />

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Taglines (EN)"><TagsEditor value={p.en.taglines} onChange={(v) => setEn({ taglines: v })} /></Field>
        <Field label="Taglines (ع)"><TagsEditor value={p.ar.taglines} onChange={(v) => setAr({ taglines: v })} rtl /></Field>
      </div>
    </div>
  );
}

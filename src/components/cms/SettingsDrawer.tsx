import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Settings2, X, Save, Lock, LogOut, KeyRound, Copy, Check,
  User, Code2, Briefcase, FolderKanban, GraduationCap, Trophy, Languages,
  MessageSquare, Shield, AlertTriangle, Sparkles, Menu, Database, WifiOff,
} from "lucide-react";
import { DotPulse } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  saveSiteSettings,
  verifySettingsPassword,
  resetAdminPassword,
  pingDatabase,
} from "@/utils/settings.functions";
import { useSiteData, type SiteData } from "@/components/SiteDataProvider";
import { PersonalForm } from "./sections/PersonalForm";
import { SkillsForm } from "./sections/SkillsForm";
import { ExperienceForm } from "./sections/ExperienceForm";
import { ProjectsForm } from "./sections/ProjectsForm";
import { EducationForm } from "./sections/EducationForm";
import { AchievementsForm } from "./sections/AchievementsForm";
import { LanguagesForm } from "./sections/LanguagesForm";
import { CommentsAdmin } from "./sections/CommentsAdmin";
import { DangerZone } from "./sections/DangerZone";
import { SecurityForm } from "./sections/SecurityForm";
import { HeroForm } from "./sections/HeroForm";
import { NavigationForm } from "./sections/NavigationForm";

const MAX_LOCAL = 5;
const LOCAL_LOCK_MS = 60 * 1000;

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "hero", label: "Hero", icon: Sparkles },
  { id: "navigation", label: "Navigation", icon: Menu },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "security", label: "Security", icon: Shield },
  { id: "danger", label: "Danger", icon: AlertTriangle },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function SettingsDrawer() {
  const { data: live, refresh } = useSiteData();
  const verifySettingsPasswordFn = useServerFn(verifySettingsPassword);
  const saveSiteSettingsFn = useServerFn(saveSiteSettings);
  const resetAdminPasswordFn = useServerFn(resetAdminPassword);
  const pingDatabaseFn = useServerFn(pingDatabase);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");
  const [draft, setDraft] = useState<SiteData>(live);
  const [saving, setSaving] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  // DB connection state — checked on open and again when unlocked.
  const [dbStatus, setDbStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [authedPw, setAuthedPw] = useState("");

  // Forgot-password flow
  const [showReset, setShowReset] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNew, setResetNew] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setDraft(live);
  }, [open, live]);

  // Body scroll lock when drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Hide site chrome (navbar) while the admin drawer is open.
    document.body.classList.add("cms-open");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("cms-open");
    };
  }, [open]);

  // DB ping is performed only after the admin unlocks (we need the password
  // to authenticate the request). Reset status when the drawer closes.
  useEffect(() => {
    if (!open) {
      setDbStatus("checking");
      setDbLatency(null);
    }
  }, [open]);

  const isLocked = lockedUntil > Date.now();

  const unlock = async () => {
    if (isLocked) {
      toast.error("Too many attempts", { description: "Please wait a moment before trying again." });
      return;
    }
    if (!password) return;
    setVerifying(true);
    try {
      const result = await verifySettingsPasswordFn({ data: { password } });
      if (!result.ok) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_LOCAL) {
          setLockedUntil(Date.now() + LOCAL_LOCK_MS);
          setAttempts(0);
        }
        toast.error("Access denied", { description: result.error });
        return;
      }
      setUnlocked(true);
      setAuthedPw(password);
      setPassword("");
      setAttempts(0);
      // Re-ping DB on unlock and show a clear connection message.
      const ping = await pingDatabaseFn({ data: { password } }).catch(() => null);
      if (ping?.ok) {
        setDbStatus("online");
        setDbLatency(ping.latencyMs);
        toast.success("Edit mode unlocked", {
          description: `Connected to database (${ping.latencyMs}ms)`,
        });
      } else {
        setDbStatus("offline");
        toast.warning("Edit mode unlocked", {
          description: "Database connection could not be verified — saves may fail.",
        });
      }
    } catch (e) {
      toast.error("Access denied", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setVerifying(false);
    }
  };

  const lock = () => {
    setUnlocked(false);
    setAuthedPw("");
    setPassword("");
  };

  const save = async () => {
    if (!authedPw) {
      toast.error("Locked");
      return;
    }
    setSaving(true);
    try {
      const result = await saveSiteSettingsFn({ data: { password: authedPw, data: draft } });
      if (!result.ok) {
        toast.error("Save failed", { description: result.error });
        return;
      }
      toast.success("Settings saved", { description: "Live preview updated." });
      refresh();
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const submitReset = async () => {
    if (!resetCode || !resetNew) {
      toast.error("Fill all fields");
      return;
    }
    if (resetNew.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (resetNew !== resetConfirm) {
      toast.error("Passwords don't match");
      return;
    }
    setResetting(true);
    try {
      const result = await resetAdminPasswordFn({
        data: { recoveryCode: resetCode, newPassword: resetNew },
      });
      if (!result.ok) {
        toast.error("Reset failed", { description: result.error });
        return;
      }
      setNewRecoveryCode(result.newRecoveryCode);
      setResetCode("");
      setResetNew("");
      setResetConfirm("");
      toast.success("Password reset successfully");
    } catch (e) {
      toast.error("Reset failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setResetting(false);
    }
  };

  const closeReset = () => {
    setShowReset(false);
    setNewRecoveryCode(null);
    setResetCode("");
    setResetNew("");
    setResetConfirm("");
    setCopied(false);
  };

  const copyCode = async () => {
    if (!newRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(newRecoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const renderTab = () => {
    switch (tab) {
      case "personal": return <PersonalForm data={draft} onChange={setDraft} password={authedPw} />;
      case "hero": return <HeroForm data={draft} onChange={setDraft} />;
      case "navigation": return <NavigationForm data={draft} onChange={setDraft} />;
      case "skills": return <SkillsForm data={draft} onChange={setDraft} />;
      case "experience": return <ExperienceForm data={draft} onChange={setDraft} />;
      case "projects": return <ProjectsForm data={draft} onChange={setDraft} password={authedPw} />;
      case "education": return <EducationForm data={draft} onChange={setDraft} />;
      case "achievements": return <AchievementsForm data={draft} onChange={setDraft} />;
      case "languages": return <LanguagesForm data={draft} onChange={setDraft} />;
      case "comments": return <CommentsAdmin password={authedPw} />;
      case "security": return <SecurityForm password={authedPw} />;
      case "danger": return <DangerZone data={draft} onChange={setDraft} />;
    }
  };

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        data-cursor="view"
        data-cursor-label="Edit"
        className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 hover:bg-current/5 transition-all"
        style={{ borderColor: "color-mix(in oklab, currentColor 25%, transparent)" }}
      >
        <Settings2 className="h-3.5 w-3.5" /> Settings
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-2xl backdrop-saturate-150 p-0 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              dir="ltr"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
              className="w-full max-w-5xl rounded-t-3xl sm:rounded-3xl overflow-hidden soft-shadow flex flex-col h-[95vh] sm:h-auto sm:max-h-[92vh] border border-border"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display text-lg sm:text-xl">Site CMS</div>
                    {/* DB connection badge — always visible */}
                    <div
                      role="status"
                      aria-live="polite"
                      title={
                        dbStatus === "online"
                          ? `Database connected${dbLatency !== null ? ` · ${dbLatency}ms` : ""}`
                          : dbStatus === "offline"
                            ? "Database unreachable"
                            : "Checking database connection…"
                      }
                      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${
                        dbStatus === "online"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : dbStatus === "offline"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {dbStatus === "offline" ? (
                        <WifiOff className="h-2.5 w-2.5" />
                      ) : dbStatus === "checking" ? (
                        <DotPulse />
                      ) : (
                        <Database className="h-2.5 w-2.5" />
                      )}
                      <span>
                        {dbStatus === "online"
                          ? `DB · ${dbLatency ?? "—"}ms`
                          : dbStatus === "offline"
                            ? "DB offline"
                            : "DB…"}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5" aria-live="polite">
                    {unlocked ? "Edit mode — saves to Lovable Cloud" : "Read-only — enter password to edit"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unlocked && (
                    <button
                      onClick={lock}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 sm:py-1.5 rounded-full bg-secondary hover:bg-secondary/70 transition-colors"
                    >
                      <LogOut className="h-3 w-3" /> Lock
                    </button>
                  )}
                  {unlocked && (
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 sm:py-1.5 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <DotPulse /> : <Save className="h-3 w-3" />}
                      {saving ? "Saving…" : "Save all"}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!unlocked ? (
                showReset ? (
                  <div className="p-6 sm:p-10 flex flex-col items-center justify-center gap-4 overflow-auto">
                    {newRecoveryCode ? (
                      <div className="w-full max-w-md flex flex-col items-center gap-4">
                        <KeyRound className="h-6 w-6 text-foreground" />
                        <div className="text-sm font-medium text-center">Password reset successfully</div>
                        <div className="text-xs text-muted-foreground text-center">
                          Save this new recovery code somewhere safe. <strong>It will not be shown again.</strong>
                        </div>
                        <div className="w-full bg-secondary rounded-2xl p-4 font-mono text-center text-lg tracking-wider break-all select-all">
                          {newRecoveryCode}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={copyCode}
                            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-secondary hover:bg-secondary/70"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy code"}
                          </button>
                          <button
                            onClick={closeReset}
                            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90"
                          >
                            I saved it — done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md flex flex-col gap-3">
                        <div className="flex items-center gap-2 justify-center">
                          <KeyRound className="h-5 w-5 text-muted-foreground" />
                          <div className="text-sm font-medium">Reset password</div>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Enter your one-time recovery code and choose a new password.
                        </div>
                        <input
                          type="text"
                          placeholder="Recovery code (XXXX-XXXX-...)"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          autoComplete="off"
                          className="bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-foreground"
                        />
                        <input
                          type="password"
                          placeholder="New password (min 6 chars)"
                          value={resetNew}
                          onChange={(e) => setResetNew(e.target.value)}
                          autoComplete="new-password"
                          className="bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground"
                        />
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={resetConfirm}
                          onChange={(e) => setResetConfirm(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") submitReset(); }}
                          autoComplete="new-password"
                          className="bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground"
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => setShowReset(false)}
                            className="flex-1 text-xs px-4 py-2.5 rounded-full bg-secondary hover:bg-secondary/70"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={submitReset}
                            disabled={resetting || !resetCode || !resetNew}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
                          >
                            {resetting ? <DotPulse /> : <KeyRound className="h-3 w-3" />}
                            Reset password
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 sm:p-10 flex flex-col items-center justify-center gap-5 overflow-auto">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground text-center max-w-md">
                      Enter the admin password to edit personal info, skills, experience, projects, achievements, comments, and more.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                      <input
                        type="password"
                        placeholder="Admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
                        disabled={isLocked || verifying}
                        autoComplete="current-password"
                        className="flex-1 bg-background border border-border rounded-full px-4 py-3 text-sm outline-none focus:border-foreground disabled:opacity-50"
                      />
                      <button
                        onClick={unlock}
                        disabled={isLocked || verifying || !password}
                        className="inline-flex items-center justify-center gap-1.5 text-xs px-5 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {verifying ? <DotPulse /> : <Lock className="h-3 w-3" />}
                        {isLocked ? "Locked" : "Unlock"}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowReset(true)}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                  {/* Mobile: horizontal scroll tabs with icons */}
                  <div className="md:hidden border-b border-border overflow-x-auto no-scrollbar">
                    <div className="flex gap-1 p-2 min-w-max">
                      {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-full whitespace-nowrap transition-colors ${
                              active
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop: vertical sidebar */}
                  <aside className="hidden md:flex flex-col w-[200px] shrink-0 border-r border-border p-3 gap-0.5 overflow-y-auto">
                    {TABS.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTab(t.id)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                            active
                              ? "bg-secondary text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </aside>

                  {/* Content */}
                  <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 min-w-0">
                    {activeTab && (
                      <div className="mb-5 hidden md:flex items-center gap-2.5">
                        <activeTab.icon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-display text-2xl tracking-tight">{activeTab.label}</h3>
                      </div>
                    )}
                    {renderTab()}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

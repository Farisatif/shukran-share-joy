import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllComments, deleteComment, setCommentStatus } from "@/utils/settings.functions";
import { Trash2, Check, X, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton, DotPulse } from "@/components/ui/skeleton";

type Status = "pending" | "approved" | "rejected";
type Row = { id: string; author_name: string; message: string; created_at: string; status: Status };

const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export function CommentsAdmin({ password }: { password: string }) {
  const listAllCommentsFn = useServerFn(listAllComments);
  const deleteCommentFn = useServerFn(deleteComment);
  const setStatusFn = useServerFn(setCommentStatus);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listAllCommentsFn({ data: { password } });
      if (!r.ok) {
        toast.error("Could not load comments", { description: r.error });
        setRows([]);
        return;
      }
      setRows(r.comments as Row[]);
    } catch (e) {
      toast.error("Could not load comments", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 } as Record<Status, number>;
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => r.status === tab), [rows, tab]);

  const updateStatus = async (id: string, status: Status) => {
    setBusyId(id);
    try {
      const r = await setStatusFn({ data: { password, id, status } });
      if (!r.ok) {
        toast.error("Update failed", { description: r.error });
        return;
      }
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      toast.success(status === "approved" ? "Comment approved" : status === "rejected" ? "Comment rejected" : "Moved to pending");
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this comment permanently?")) return;
    setBusyId(id);
    try {
      const result = await deleteCommentFn({ data: { password, id } });
      if (!result.ok) {
        toast.error("Delete failed", { description: result.error });
        return;
      }
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Comment deleted");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className={cn(
                "min-w-[1.25rem] text-center text-[10px] px-1.5 py-0.5 rounded-full",
                tab === t.key ? "bg-foreground/10" : "bg-foreground/5"
              )}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? <DotPulse /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5" aria-label="Loading comments">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4"
              style={{ opacity: 1 - i * 0.2 }}
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-2.5 w-20 rounded-full" />
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <Skeleton className="h-2.5 w-[88%] rounded-full" />
                    <Skeleton className="h-2.5 w-[62%] rounded-full" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="py-12 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border">
          {tab === "pending" ? "No comments awaiting review." : tab === "approved" ? "No approved comments yet." : "No rejected comments."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-2xl border bg-card p-4 transition-all",
                c.status === "pending" && "border-amber-500/30",
                c.status === "approved" && "border-emerald-500/30",
                c.status === "rejected" && "border-border opacity-70",
                busyId === c.id && "opacity-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.22_255)] to-[oklch(0.78_0.12_270)] text-white flex items-center justify-center text-sm font-medium shrink-0">
                  {c.author_name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-medium text-sm">{c.author_name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                      <Clock className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/80 whitespace-pre-wrap break-words">{c.message}</p>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {c.status !== "approved" && (
                      <button
                        onClick={() => updateStatus(c.id, "approved")}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-3 py-1 text-xs font-medium transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {c.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(c.id, "rejected")}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 text-foreground/70 hover:bg-foreground/10 px-3 py-1 text-xs font-medium transition-colors"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                    {c.status !== "pending" && (
                      <button
                        onClick={() => updateStatus(c.id, "pending")}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-3 py-1 text-xs font-medium transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </button>
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busyId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-full text-destructive hover:bg-destructive/10 px-3 py-1 text-xs font-medium transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

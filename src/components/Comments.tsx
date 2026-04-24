import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "./Reveal";
import { useLang } from "./LanguageProvider";
import { Skeleton, DotPulse } from "@/components/ui/skeleton";

type Comment = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
};

export function Comments() {
  const { t } = useLang();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const sendPos = useRef({ x: 0, y: 0 });
  const newIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, author_name, message, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setItems(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Unique channel name per mount avoids "callbacks after subscribe()" when
    // React StrictMode double-invokes effects in development.
    const channelName = `comments-stream-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments" },
        (payload) => {
          const c = payload.new as Comment & { status?: string };
          if (c.status !== "approved") return;
          newIdRef.current = c.id;
          setItems((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mouse-tracked spotlight via CSS variables, smoothed with rAF.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = sectionRef.current;
    if (!el) return;
    let tx = 50, ty = 30, mx = 50, my = 30, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    const tick = () => {
      mx += (tx - mx) * 0.18;
      my += (ty - my) * 0.18;
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
      if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Magnetic Send button — rAF-throttled pointermove.
  useEffect(() => {
    const btn = sendBtnRef.current;
    if (!btn) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        tx = dx * 0.3;
        ty = dy * 0.4;
      } else {
        tx = 0;
        ty = 0;
      }
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    const apply = () => {
      sendPos.current.x += (tx - sendPos.current.x) * 0.18;
      sendPos.current.y += (ty - sendPos.current.y) * 0.18;
      btn.style.transform = `translate3d(${sendPos.current.x}px, ${sendPos.current.y}px, 0)`;
      if (Math.abs(tx - sendPos.current.x) > 0.1 || Math.abs(ty - sendPos.current.y) > 0.1) {
        raf = window.requestAnimationFrame(apply);
      } else {
        raf = 0;
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // IntersectionObserver entrance animation for cards.
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "-40px" },
    );
    root.querySelectorAll(".comment-card-enter").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  // Auto-scroll new realtime comment into view + pulse ring.
  useEffect(() => {
    if (!newIdRef.current) return;
    const id = newIdRef.current;
    newIdRef.current = null;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-cid="${id}"]`);
      if (el) {
        el.classList.add("pulse-ring", "is-in");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => el.classList.remove("pulse-ring"), 1700);
      }
    });
  }, [items]);

  const handleMessageChange = (v: string) => {
    setMessage(v);
    setIsTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setIsTyping(false), 900);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      author_name: name.trim().slice(0, 80),
      message: message.trim().slice(0, 1000),
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("Could not post your comment", "تعذر نشر تعليقك"), { description: error.message });
      return;
    }
    toast.success(
      t("Submitted for review", "تم الإرسال للمراجعة"),
      { description: t("Your comment will appear once approved.", "سيظهر تعليقك بعد الموافقة عليه.") },
    );
    setMessage("");
    setIsTyping(false);
  };

  return (
    <div ref={sectionRef} className="comments-spotlight grid lg:grid-cols-12 gap-10 rounded-3xl">
      <Reveal className="lg:col-span-5">
        <div className="sticky top-28">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
            <MessageSquareText className="h-3.5 w-3.5" /> {t("Guestbook", "سجل الزوار")}
          </div>
          <h2 className="font-display text-5xl sm:text-6xl tracking-[-0.04em] leading-[0.95]">
            {t("Leave a ", "اترك ")}
            <span className="italic text-[oklch(0.42_0.2_255)]">
              {t("trace.", "أثرًا.")}
            </span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed">
            {t(
              "Drop a note, a kind word, a question — anything. Comments stream in real-time.",
              "اترك ملاحظة، كلمة لطيفة، أو سؤالاً — أي شيء. التعليقات تظهر في الزمن الحقيقي.",
            )}
          </p>

          <form
            onSubmit={submit}
            className="mt-10 rounded-3xl bg-card border border-border p-6 sm:p-7"
            data-cursor="link"
          >
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {t("Your name", "اسمك")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base"
              placeholder={t("Ada Lovelace", "أحمد العربي")}
            />
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mt-6 mb-2">
              {t("Message", "الرسالة")}
            </label>
            <textarea
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              maxLength={1000}
              required
              rows={4}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-base resize-none"
              placeholder={t("Say hi…", "قل مرحبا…")}
            />
            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground gap-3">
              <span className="flex items-center gap-3">
                <span>{message.length}/1000</span>
                {isTyping && (
                  <span className="inline-flex items-center gap-1 text-foreground/60">
                    <span className="inline-flex gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-current animate-bounce" />
                      <span className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                    </span>
                    {t("typing…", "يكتب…")}
                  </span>
                )}
              </span>
              <button
                ref={sendBtnRef}
                type="submit"
                disabled={submitting}
                data-cursor="view"
                data-cursor-label={t("Send", "إرسال")}
                className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 will-change-transform"
              >
                {submitting ? <DotPulse /> : <Send className="h-4 w-4" />}
                {t("Post", "نشر")}
              </button>
            </div>
          </form>
        </div>
      </Reveal>

      <div ref={listRef} className="lg:col-span-7 space-y-4">
        {loading ? (
          <div className="space-y-4" aria-label={t("Loading conversations", "جارٍ تحميل المحادثات")}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-3xl bg-card border border-border p-6 sm:p-7"
                style={{ opacity: 1 - i * 0.18 }}
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-3.5 w-28 rounded-full" />
                      <Skeleton className="h-3 w-20 rounded-full" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-3 w-[92%] rounded-full" />
                      <Skeleton className="h-3 w-[78%] rounded-full" />
                      <Skeleton className="h-3 w-[55%] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center rounded-3xl border border-dashed border-border">
            {t("No comments yet — be the first.", "لا توجد تعليقات بعد — كن الأول.")}
          </div>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              data-cid={c.id}
              className="skeleton-content-in comment-card-enter group rounded-3xl bg-card border border-border p-6 sm:p-7 transition-all hover:-translate-y-0.5 hover:border-foreground/20"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.22_255)] to-[oklch(0.78_0.12_270)] text-white flex items-center justify-center font-display text-lg shrink-0">
                  {c.author_name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-medium text-foreground">{c.author_name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(c.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-base text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                    {c.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

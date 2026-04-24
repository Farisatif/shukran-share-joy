import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import resume from "@/data/resume.json";

export type SiteData = typeof resume;

type Status = "loading" | "ready" | "error" | "fallback";

type Ctx = {
  data: SiteData;
  status: Status;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Ctx>({
  data: resume as SiteData,
  status: "loading",
  error: null,
  refresh: async () => {},
});

function deepMerge<T>(base: T, patch: Partial<T> | undefined | null): T {
  if (!patch || typeof patch !== "object") return base;
  if (Array.isArray(patch)) return patch as unknown as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(patch)) {
    const pv = (patch as Record<string, unknown>)[k];
    const bv = (base as Record<string, unknown>)?.[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[k] = deepMerge(bv, pv as Record<string, unknown>);
    } else {
      out[k] = pv;
    }
  }
  return out as T;
}

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(resume as SiteData);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  // Guard against rapid duplicate loads (e.g. realtime burst).
  const inflight = useRef<Promise<void> | null>(null);

  const load = async () => {
    if (inflight.current) return inflight.current;
    const p = (async () => {
      try {
        const { data: row, error: err } = await supabase
          .from("site_settings")
          .select("data")
          .eq("id", "singleton")
          .maybeSingle();
        if (err) {
          // Network/RLS issue — keep showing local fallback so the site never breaks.
          setStatus("fallback");
          setError(err.message);
          setData(resume as SiteData);
          return;
        }
        if (row?.data && typeof row.data === "object" && Object.keys(row.data as object).length > 0) {
          setData(deepMerge(resume as SiteData, row.data as Partial<SiteData>));
        } else {
          // Empty singleton → use bundled defaults.
          setData(resume as SiteData);
        }
        setStatus("ready");
        setError(null);
      } catch (e) {
        setStatus("fallback");
        setError(e instanceof Error ? e.message : String(e));
        setData(resume as SiteData);
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  };

  useEffect(() => {
    load();
    // Unique channel per mount avoids StrictMode "callbacks after subscribe()".
    const channelName = `site-settings-stream-${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => { load(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Ctx.Provider value={{ data, status, error, refresh: load }}>{children}</Ctx.Provider>;
}

export const useSiteData = () => useContext(Ctx);

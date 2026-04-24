import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import resume from "@/data/resume.json";

export type SiteData = typeof resume;

const Ctx = createContext<{ data: SiteData; refresh: () => void }>({
  data: resume as SiteData,
  refresh: () => {},
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

  const load = async () => {
    const { data: row } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", "singleton")
      .maybeSingle();
    if (row?.data && typeof row.data === "object" && Object.keys(row.data as object).length > 0) {
      setData(deepMerge(resume as SiteData, row.data as Partial<SiteData>));
    } else {
      setData(resume as SiteData);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("site-settings-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return <Ctx.Provider value={{ data, refresh: load }}>{children}</Ctx.Provider>;
}

export const useSiteData = () => useContext(Ctx);

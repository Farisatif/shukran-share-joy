import { useLang } from "@/components/LanguageProvider";

export type Lang = "en" | "ar";

export function pickLang<T>(en: T, ar: T, lang: Lang): T {
  return lang === "ar" ? ar : en;
}

/** Convenience: returns the `en`/`ar` key based on current lang. */
export function useLangPick() {
  const { lang } = useLang();
  return <T,>(en: T, ar: T) => (lang === "ar" ? ar : en);
}

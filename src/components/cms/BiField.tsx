import { Field, TextInput, TextArea } from "./Field";

export function BiField({
  label,
  en,
  ar,
  onEn,
  onAr,
  multiline,
  rows = 3,
}: {
  label: string;
  en: string;
  ar: string;
  onEn: (v: string) => void;
  onAr: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label={`${label} (EN)`}>
        {multiline ? (
          <TextArea rows={rows} value={en} onChange={(e) => onEn(e.target.value)} />
        ) : (
          <TextInput value={en} onChange={(e) => onEn(e.target.value)} />
        )}
      </Field>
      <Field label={`${label} (ع)`}>
        {multiline ? (
          <TextArea rows={rows} dir="rtl" value={ar} onChange={(e) => onAr(e.target.value)} />
        ) : (
          <TextInput dir="rtl" value={ar} onChange={(e) => onAr(e.target.value)} />
        )}
      </Field>
    </div>
  );
}

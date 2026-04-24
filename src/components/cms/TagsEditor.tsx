import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagsEditor({
  value,
  onChange,
  placeholder = "Add tag, Enter",
  rtl,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  rtl?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-lg bg-background">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
        >
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label="Remove">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        dir={rtl ? "rtl" : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={onKey}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
      />
    </div>
  );
}

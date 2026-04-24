/**
 * HSL accent color picker — value is "H S% L%" string compatible with
 * `hsl(var(--accent))` style usage in the achievements cards.
 */
import { useMemo } from "react";

function parse(v: string): { h: number; s: number; l: number } {
  const m = v.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!m) return { h: 220, s: 80, l: 60 };
  return { h: +m[1], s: +m[2], l: +m[3] };
}
const fmt = (h: number, s: number, l: number) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { h, s, l } = useMemo(() => parse(value), [value]);
  const swatch = `hsl(${h} ${s}% ${l}%)`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-border" style={{ background: swatch }} />
        <code className="text-xs text-muted-foreground tabular-nums">{value}</code>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Slider label="H" min={0} max={360} value={h} onChange={(v) => onChange(fmt(v, s, l))} />
        <Slider label="S" min={0} max={100} value={s} onChange={(v) => onChange(fmt(h, v, l))} />
        <Slider label="L" min={0} max={100} value={l} onChange={(v) => onChange(fmt(h, s, v))} />
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
      />
    </label>
  );
}

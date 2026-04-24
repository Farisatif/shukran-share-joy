import { ACHIEVEMENT_ICONS } from "@/components/AchievementsSection";

const ICON_KEYS = Object.keys(ACHIEVEMENT_ICONS);

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {ICON_KEYS.map((k) => {
        const Icon = ACHIEVEMENT_ICONS[k];
        const active = value === k;
        return (
          <button
            type="button"
            key={k}
            onClick={() => onChange(k)}
            title={k}
            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${
              active
                ? "border-foreground bg-foreground text-background scale-105"
                : "border-border bg-background text-foreground/70 hover:border-foreground/40"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

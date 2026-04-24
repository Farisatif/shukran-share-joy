import type { SiteData } from "@/components/SiteDataProvider";
import resume from "@/data/resume.json";
import { Download, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function DangerZone({ data, onChange }: { data: SiteData; onChange: (d: SiteData) => void }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        onChange(parsed as SiteData);
        toast.success("Imported — remember to Save");
      } catch (e) {
        toast.error("Invalid JSON file");
      }
    };
    input.click();
  };

  const reset = () => {
    if (!confirm("Reset all fields to bundled defaults? You still need to Save.")) return;
    onChange(resume as SiteData);
    toast.success("Reset to defaults — remember to Save");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Power-user actions. None of these write to the cloud until you press <strong>Save all</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportJson} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-border hover:bg-secondary">
          <Download className="h-4 w-4" /> Export JSON
        </button>
        <button onClick={importJson} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-border hover:bg-secondary">
          <Upload className="h-4 w-4" /> Import JSON
        </button>
        <button onClick={reset} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-destructive/50 text-destructive hover:bg-destructive/10">
          <RotateCcw className="h-4 w-4" /> Reset to bundled
        </button>
      </div>
    </div>
  );
}

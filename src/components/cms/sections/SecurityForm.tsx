import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, RefreshCw, Copy, Check, ShieldCheck } from "lucide-react";
import { DotPulse } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { rotateRecoveryCode, changeAdminPassword } from "@/utils/settings.functions";

export function SecurityForm({ password }: { password: string }) {
  const rotateFn = useServerFn(rotateRecoveryCode);
  const changePwFn = useServerFn(changeAdminPassword);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changing, setChanging] = useState(false);

  const [rotating, setRotating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const changePassword = async () => {
    if (newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Passwords don't match");
      return;
    }
    setChanging(true);
    try {
      const result = await changePwFn({ data: { password, newPassword: newPw } });
      if (!result.ok) {
        toast.error("Change failed", { description: result.error });
        return;
      }
      toast.success("Password changed. Please re-lock and log in with the new password.");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      toast.error("Change failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setChanging(false);
    }
  };

  const rotate = async () => {
    if (!confirm("Generate a new recovery code? The current code will stop working immediately.")) return;
    setRotating(true);
    try {
      const result = await rotateFn({ data: { password } });
      if (!result.ok) {
        toast.error("Rotation failed", { description: result.error });
        return;
      }
      setNewCode(result.newRecoveryCode);
      toast.success("New recovery code generated");
    } catch (e) {
      toast.error("Rotation failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setRotating(false);
    }
  };

  const copyCode = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Change password */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Change admin password</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Change the password used to unlock this CMS. You'll need to re-lock and sign in with the new password.
        </p>
        <div className="space-y-2">
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-foreground"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            onClick={changePassword}
            disabled={changing || !newPw || !confirmPw}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {changing ? <DotPulse /> : <KeyRound className="h-3 w-3" />}
            Change password
          </button>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Recovery code */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Recovery code</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Use the recovery code on the lock screen if you forget your password. Generate a new code anytime — the previous one stops working immediately.
        </p>

        {newCode ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Save this code somewhere safe. <strong>It will not be shown again.</strong>
            </div>
            <div className="bg-secondary rounded-2xl p-4 font-mono text-center text-base tracking-wider break-all select-all">
              {newCode}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-secondary hover:bg-secondary/70"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy code"}
              </button>
              <button
                onClick={() => setNewCode(null)}
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                I saved it
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={rotate}
            disabled={rotating}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {rotating ? <DotPulse /> : <RefreshCw className="h-3 w-3" />}
            Generate new recovery code
          </button>
        )}
      </section>
    </div>
  );
}

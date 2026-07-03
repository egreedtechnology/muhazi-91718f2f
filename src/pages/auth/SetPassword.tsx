import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import { dashboardForRoles, scorePassword } from "@/lib/rolePermissions";
import { cn } from "@/lib/utils";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; email: string | null; alreadyActivated: boolean }
  | { kind: "error"; title: string; message: string; retryable?: boolean };

export default function SetPassword() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const canSubmit =
    !submitting &&
    strength.score >= 3 &&
    passwordsMatch &&
    password.length >= 8;

  useEffect(() => {
    const init = async () => {
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const code = queryParams.get("code");
        const errorCode =
          hashParams.get("error_code") || queryParams.get("error_code");
        const errDesc =
          hashParams.get("error_description") ||
          queryParams.get("error_description");

        // Explicit error from Supabase — link is broken/expired/already used.
        if (errDesc || errorCode) {
          const desc = decodeURIComponent(errDesc ?? "").toLowerCase();
          const isExpired =
            errorCode === "otp_expired" ||
            desc.includes("expired") ||
            desc.includes("invalid");
          setState({
            kind: "error",
            title: isExpired
              ? "This invitation link has expired"
              : "Invalid invitation link",
            message: isExpired
              ? "For your security, invitation links expire after a short time or after one use. Please ask an administrator to resend your invitation."
              : decodeURIComponent(errDesc ?? "The link is not valid."),
          });
          return;
        }

        // Establish a session from the invite token.
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // Strip tokens from the URL immediately.
        window.history.replaceState({}, "", window.location.pathname);

        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setState({
            kind: "error",
            title: "Invitation not found",
            message:
              "This invitation link is missing or no longer valid. Please ask an administrator to resend your invitation.",
          });
          return;
        }

        // Detect an invite that has already been used to set a password.
        // If the staff record is already active with a recorded sign-in,
        // treat the invite as consumed and send them to sign in instead.
        try {
          const { data: statusRes } = await supabase.functions.invoke(
            "staff-admin",
            { body: { action: "get_invite_status" } },
          );
          if (statusRes?.already_activated) {
            setState({
              kind: "error",
              title: "This invitation has already been used",
              message:
                "Your account is already active. Please sign in with the password you created. If you've forgotten it, use “Forgot password” on the sign-in screen.",
            });
            return;
          }
        } catch {
          /* non-fatal — proceed */
        }

        setState({
          kind: "ready",
          email: data.user.email ?? null,
          alreadyActivated: false,
        });
      } catch (e: any) {
        const msg = (e?.message ?? "").toLowerCase();
        const expired =
          msg.includes("expired") ||
          msg.includes("invalid") ||
          msg.includes("otp");
        setState({
          kind: "error",
          title: expired
            ? "This invitation link has expired"
            : "We couldn't verify this invitation",
          message: expired
            ? "Invitation links are single-use and time-limited. Please ask an administrator to resend your invitation."
            : e?.message ?? "Something went wrong verifying your link.",
        });
      }
    };
    init();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (strength.score < 3) {
      toast.error("Please choose a stronger password");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      // Session lost / link no longer valid mid-flow.
      if (/session|jwt|expired|invalid/i.test(error.message)) {
        setState({
          kind: "error",
          title: "Your invitation link has expired",
          message:
            "Please ask an administrator to send you a new invitation link.",
        });
        return;
      }
      toast.error(error.message);
      return;
    }

    // Activate staff account server-side and get roles for redirect.
    let roles: string[] = [];
    try {
      const { data: act } = await supabase.functions.invoke("staff-admin", {
        body: { action: "activate_self" },
      });
      roles = act?.roles ?? [];
    } catch {
      /* activation is best-effort; sign-in still works */
    }

    setSubmitting(false);
    toast.success("Password set — welcome to Muhazi Dental Clinic!");
    navigate(dashboardForRoles(roles), { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <SEOHead
        title="Set Your Password"
        description="Set your Muhazi Dental Clinic staff password"
      />
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            {state.kind === "error" ? (
              <AlertTriangle className="w-7 h-7 text-destructive" />
            ) : (
              <KeyRound className="w-7 h-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {state.kind === "error" ? state.title : "Set your password"}
          </CardTitle>
          <CardDescription>
            {state.kind === "ready"
              ? state.email
                ? `Create a secure password for ${state.email} to activate your staff account.`
                : "Create a secure password to activate your staff account."
              : state.kind === "loading"
                ? "Verifying your invitation…"
                : state.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.kind === "loading" && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state.kind === "error" && (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate("/admin")}
              >
                Go to sign in
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Need help? Contact your clinic administrator.
              </p>
            </div>
          )}

          {state.kind === "ready" && (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Strength meter */}
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i < strength.score
                            ? strength.score <= 1
                              ? "bg-destructive"
                              : strength.score === 2
                                ? "bg-yellow-500"
                                : strength.score === 3
                                  ? "bg-primary"
                                  : "bg-green-500"
                            : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Strength:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          strength.score <= 1 && "text-destructive",
                          strength.score === 2 && "text-yellow-600",
                          strength.score === 3 && "text-primary",
                          strength.score === 4 && "text-green-600",
                        )}
                      >
                        {password ? strength.label : "—"}
                      </span>
                    </span>
                    {strength.score >= 3 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheck className="w-3.5 h-3.5" /> Meets policy
                      </span>
                    )}
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {[
                      ["length", "8+ characters"],
                      ["upper", "Uppercase letter"],
                      ["lower", "Lowercase letter"],
                      ["number", "A number"],
                      ["symbol", "A symbol"],
                    ].map(([key, label]) => {
                      const ok = (strength.checks as any)[key];
                      return (
                        <li
                          key={key}
                          className={cn(
                            "flex items-center gap-1.5",
                            ok
                              ? "text-green-600"
                              : "text-muted-foreground",
                          )}
                        >
                          {ok ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  aria-invalid={confirm.length > 0 && !passwordsMatch}
                  className={cn(
                    confirm.length > 0 && !passwordsMatch &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {confirm.length > 0 && (
                  <p
                    className={cn(
                      "text-xs flex items-center gap-1",
                      passwordsMatch ? "text-green-600" : "text-destructive",
                    )}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" /> Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit}
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Activate account & continue
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                By continuing you agree to the clinic's staff acceptable-use
                policy.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

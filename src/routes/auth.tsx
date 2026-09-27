import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Studio sign in · Off Book Self-Tape Studio" },
      {
        name: "description",
        content: "Owner sign in for the Off Book Self-Tape Studio control room.",
      },
      { property: "og:title", content: "Studio sign in · Off Book Self-Tape Studio" },
      { property: "og:description", content: "Owner sign in for the studio dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/studio" });
    });
  }, [navigate]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/studio` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm the login, then sign in here.");
          setMode("signin");
          setBusy(false);
          return;
        }
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/studio" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't complete.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/studio" });
  }

  return (
    <StudioShell>
      <main className="tungsten-wash mx-auto max-w-md px-5 py-20">
        <div className="booth-card p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Control room</p>
          <h1 className="mt-3 font-display text-2xl">
            {mode === "signin" ? "Sign in to your studio" : "Create your studio login"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the studio owner sees today's schedule, deposits and the impact meter.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button
              className="w-full"
              disabled={busy || !email || password.length < 6}
              onClick={submit}
            >
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create login"}
            </Button>
            <Button variant="secondary" className="w-full" onClick={google}>
              Continue with Google
            </Button>
          </div>

          <button
            type="button"
            className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "First time here? Create the studio login."
              : "Already have a login? Sign in."}
          </button>
        </div>
      </main>
    </StudioShell>
  );
}

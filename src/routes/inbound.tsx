import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { answerInbound, type InboundReply } from "@/lib/inbound.functions";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/inbound")({
  head: () => ({
    meta: [
      { title: "Inbound text-back — Off Book Self-Tape Studio" },
      {
        name: "description",
        content:
          "The message the owner missed while filming gets answered anyway: open slots, matched to the actor's deadline, one tap to hold.",
      },
      { property: "og:title", content: "Inbound text-back — Off Book Self-Tape Studio" },
      {
        property: "og:description",
        content: "Missed messages get answered with real open slots in the studio's voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboundPage,
});

const SAMPLE = "Hey do you have anything tonight? I have an audition due 9am tomorrow.";

function InboundPage() {
  const navigate = useNavigate();
  const answer = useServerFn(answerInbound);
  const [message, setMessage] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<InboundReply | null>(null);

  async function run() {
    setBusy(true);
    setReply(null);
    try {
      setReply(await answer({ data: { body: message } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The text-back didn't run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioShell>
      <main className="tungsten-wash mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">While you're filming</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">
          Every missed message still gets an answer.
        </h1>
        <p className="mt-3 text-muted-foreground">
          An actor texts at 11pm. You're in the booth with the door shut. The studio reads the
          message, works out the deadline, and offers the slots that actually beat it.
        </p>

        <div className="booth-card mt-8 p-6">
          <label htmlFor="msg" className="text-sm text-muted-foreground">
            Inbound message
          </label>
          <Textarea
            id="msg"
            className="mt-2 min-h-24"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button className="mt-4" disabled={busy || message.trim().length < 3} onClick={run}>
            {busy ? "Reading the message…" : "Send the text-back"}
          </Button>
        </div>

        {busy && (
          <div className="booth-card mt-6 space-y-3 p-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {reply && (
          <div className="booth-card rise-in mt-6 p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
              <span className="filament-pulse inline-block h-2 w-2 rounded-full bg-primary" />
              Auto-replied · {reply.intent.replace(/_/g, " ")}
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{reply.reply}</p>

            {reply.suggestions.length > 0 && (
              <div className="mt-5 grid gap-2">
                {reply.suggestions.map((s) => (
                  <Button
                    key={s.slotId}
                    variant="secondary"
                    className="justify-between"
                    onClick={() => navigate({ to: "/", search: { slot: s.slotId } })}
                  >
                    <span>{s.label}</span>
                    <span className="text-primary">Hold it →</span>
                  </Button>
                ))}
              </div>
            )}

            {reply.waitlistOffered && (
              <p className="mt-4 text-xs text-muted-foreground">
                Nothing clean before the deadline — the waitlist on the booking page catches the
                next cancellation automatically.
              </p>
            )}
          </div>
        )}
      </main>
    </StudioShell>
  );
}

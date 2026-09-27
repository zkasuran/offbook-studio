import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { getClaimOffer, startDeposit } from "@/lib/booking.functions";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { laDayLabel, laTime, money } from "@/lib/time";

export const Route = createFileRoute("/claim/$token")({
  head: () => ({
    meta: [
      { title: "Claim your slot · Off Book Self-Tape Studio" },
      {
        name: "description",
        content: "A session just freed up. Claim it with a deposit before the hold runs out.",
      },
      { property: "og:title", content: "Claim your slot · Off Book Self-Tape Studio" },
      { property: "og:description", content: "A session just freed up. It's held for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClaimPage,
});

function ClaimPage() {
  const { token } = Route.useParams();
  const load = useServerFn(getClaimOffer);
  const deposit = useServerFn(startDeposit);
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["claim", token],
    queryFn: () => load({ data: { token } }),
  });

  async function claim() {
    if (!data?.valid) return;
    const chosen = serviceId ?? data.services[0]?.id;
    if (!chosen) return;
    setBusy(true);
    try {
      const res = await deposit({
        data: {
          serviceId: chosen,
          slotId: data.slot.id,
          actorName: data.actorName,
          actorEmail: data.actorEmail,
          origin: window.location.origin,
          source: "waitlist",
          claimToken: token,
        },
      });
      window.location.href = res.checkoutUrl;
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "That hold just expired.");
    }
  }

  return (
    <StudioShell>
      <main className="tungsten-wash mx-auto max-w-xl px-5 py-20">
        {isPending ? (
          <div className="booth-card space-y-4 p-8">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !data?.valid ? (
          <div className="booth-card p-8">
            <h1 className="font-display text-2xl">This hold has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The slot went to the next actor waiting. You're still on the list for the one
              after it.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">See what's open now</Link>
            </Button>
          </div>
        ) : (
          <div className="booth-card amber-glow rise-in p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Held for you · 30 minutes
            </p>
            <h1 className="mt-3 font-display text-3xl">
              {data.actorName.split(" ")[0]}, the booth just freed up.
            </h1>
            <p className="mt-3 text-lg">
              {laDayLabel(data.slot.starts_at)}, {laTime(data.slot.starts_at)} PT
            </p>
            <p className="text-sm text-muted-foreground">North Hollywood, CA</p>

            <div className="mt-6 grid gap-2">
              {data.services.map((s) => {
                const active = (serviceId ?? data.services[0]?.id) === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`slot-chip flex items-center justify-between px-4 py-3 text-left text-sm ${
                      active ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <span>
                      {s.name}
                      <span className="text-muted-foreground"> · {s.duration_minutes} min</span>
                    </span>
                    <span className="text-primary">{money(s.deposit_cents)} deposit</span>
                  </button>
                );
              })}
            </div>

            <Button className="mt-6 w-full" size="lg" disabled={busy} onClick={claim}>
              {busy ? "Opening checkout…" : "Claim this slot"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Deposit credits to your session. If the hold runs out it goes to the next actor
              waiting.
            </p>
          </div>
        )}
      </main>
    </StudioShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { confirmDeposit } from "@/lib/booking.functions";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { laDayLabel, laTime, money } from "@/lib/time";

export const Route = createFileRoute("/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Your slot is held — Off Book Self-Tape Studio" },
      {
        name: "description",
        content: "Deposit received. Your self-tape session at Off Book is confirmed.",
      },
      { property: "og:title", content: "Your slot is held — Off Book Self-Tape Studio" },
      { property: "og:description", content: "Deposit received. See you in the booth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { session_id } = Route.useSearch();
  const confirm = useServerFn(confirmDeposit);

  const { data, isPending, error } = useQuery({
    queryKey: ["confirm", session_id],
    enabled: session_id.length > 0,
    retry: 1,
    queryFn: () => confirm({ data: { sessionId: session_id } }),
  });

  return (
    <StudioShell>
      <main className="tungsten-wash mx-auto max-w-2xl px-5 py-20">
        {!session_id ? (
          <EmptyState />
        ) : isPending ? (
          <div className="booth-card space-y-4 p-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="booth-card p-8">
            <h1 className="font-display text-2xl">We couldn't confirm that deposit</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Try the booking page again."}
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Back to the booking board</Link>
            </Button>
          </div>
        ) : data?.paid ? (
          <div className="booth-card rise-in amber-glow p-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
              <span className="filament-pulse inline-block h-2 w-2 rounded-full bg-primary" />
              Slot held
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight">
              You're booked, {data.actorName.split(" ")[0]}.
            </h1>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Session" value={data.serviceName} />
              <Row
                label="When"
                value={`${laDayLabel(data.startsAt)}, ${laTime(data.startsAt)} PT`}
              />
              <Row label="Where" value="North Hollywood, CA" />
              <Row
                label="Deposit paid"
                value={`${money(data.depositCents)} — credited to your session`}
              />
              <Row label="Balance in the room" value={money(data.balanceCents)} />
            </dl>
            <p className="mt-6 text-sm text-muted-foreground">
              A confirmation is on its way to {data.actorEmail}. Cancel or move your session up
              to 4 hours before start and the deposit follows you.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link to="/">Book another slot</Link>
            </Button>
          </div>
        ) : (
          <div className="booth-card p-8">
            <h1 className="font-display text-2xl">The deposit didn't go through</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your slot is still open for now. Try again and it's yours.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Back to the booking board</Link>
            </Button>
          </div>
        )}
      </main>
    </StudioShell>
  );
}

function EmptyState() {
  return (
    <div className="booth-card p-8 text-center">
      <h1 className="font-display text-2xl">Nothing to confirm yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a time on the booking board and your confirmation lands here.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go to the booking board</Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

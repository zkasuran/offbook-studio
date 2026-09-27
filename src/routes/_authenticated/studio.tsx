import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { cancelBooking, getDashboard } from "@/lib/studio.functions";
import { supabase } from "@/integrations/supabase/client";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { laDateKey, laDayLabel, laTime, money } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Control room · Off Book Self-Tape Studio" },
      {
        name: "description",
        content:
          "Today's booth schedule, deposits, waitlist and the effort the studio saved this week.",
      },
      { property: "og:title", content: "Control room · Off Book Self-Tape Studio" },
      { property: "og:description", content: "Today's schedule and the studio impact meter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioDashboard,
});

function StudioDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const load = useServerFn(getDashboard);
  const cancel = useServerFn(cancelBooking);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => load(),
  });

  const todayKey = laDateKey(new Date().toISOString());
  const todaySlots = (data?.slots ?? []).filter((s) => laDateKey(s.starts_at) === todayKey);
  const bookingBySlot = new Map(
    (data?.bookings ?? [])
      .filter((b) => b.status !== "cancelled")
      .map((b) => [b.startsAt, b] as const),
  );
  const weekBookings = (data?.bookings ?? []).filter((b) => b.status !== "cancelled");

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      const res = await cancel({ data: { bookingId: id, origin: window.location.origin } });
      toast.success(
        res.refilled
          ? "Cancelled. The freed slot was offered to the waitlist automatically."
          : "Cancelled. The slot is back on the public board.",
      );
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel that booking.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <StudioShell>
      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Control room</p>
            <h1 className="mt-2 font-display text-3xl">Today in the booth</h1>
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              qc.clear();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </Button>
        </div>

        {error ? (
          <div className="booth-card mt-8 p-8">
            <h2 className="font-display text-xl">This dashboard is locked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Try signing in again."}
            </p>
          </div>
        ) : isPending || !data ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Messages auto-answered"
                value={String(data.metrics.inboundAnswered)}
                note="replied while you were filming"
              />
              <Metric
                label="Slots refilled from waitlist"
                value={String(data.metrics.refilled)}
                note="zero calls made"
              />
              <Metric
                label="No-shows prevented"
                value={String(data.metrics.noShowsPrevented)}
                note="deposits taken up front"
              />
              <Metric
                label="Revenue protected"
                value={money(data.metrics.revenueProtectedCents)}
                note="booked sessions with a paid deposit"
              />
            </section>

            <section className="mt-12">
              <h2 className="font-display text-xl">Today's timeline</h2>
              {todaySlots.length === 0 ? (
                <p className="booth-card mt-4 p-6 text-sm text-muted-foreground">
                  No slots left on today's board. Tomorrow opens at 10:00 PT.
                </p>
              ) : (
                <ul className="booth-card mt-4 divide-y divide-border">
                  {todaySlots.map((s) => {
                    const booking = bookingBySlot.get(s.starts_at);
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-20 text-sm text-muted-foreground">
                            {laTime(s.starts_at)}
                          </span>
                          {booking ? (
                            <span className="text-sm">
                              {booking.actorName}
                              <span className="text-muted-foreground">
                                {" "}
                                · {booking.serviceName}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {s.status === "held" ? "Held" : "Open"}
                            </span>
                          )}
                        </div>
                        {booking && (
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                                booking.depositStatus === "paid"
                                  ? "border-primary/50 text-primary"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {booking.depositStatus === "paid"
                                ? `${money(booking.depositCents)} deposit paid`
                                : "deposit pending"}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === booking.id}
                              onClick={() => handleCancel(booking.id)}
                            >
                              {busyId === booking.id ? "Freeing…" : "Cancel"}
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mt-12 grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-xl">This week's bookings</h2>
                {weekBookings.length === 0 ? (
                  <p className="booth-card mt-4 p-6 text-sm text-muted-foreground">
                    No bookings yet. The public board is live and taking deposits.
                  </p>
                ) : (
                  <ul className="booth-card mt-4 divide-y divide-border">
                    {weekBookings.slice(0, 10).map((b) => (
                      <li key={b.id} className="px-5 py-3.5 text-sm">
                        <div className="flex justify-between gap-3">
                          <span>{b.actorName}</span>
                          <span className="text-muted-foreground">
                            {laDayLabel(b.startsAt)}, {laTime(b.startsAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>{b.serviceName}</span>
                          <span>via {b.source.replace("-", " ")}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="font-display text-xl">Waitlist</h2>
                {data.waitlist.length === 0 ? (
                  <p className="booth-card mt-4 p-6 text-sm text-muted-foreground">
                    Nobody waiting. Cancellations go straight back to the public board.
                  </p>
                ) : (
                  <ul className="booth-card mt-4 divide-y divide-border">
                    {data.waitlist.map((w) => (
                      <li key={w.id} className="px-5 py-3.5 text-sm">
                        <div className="flex justify-between gap-3">
                          <span>{w.actor_name}</span>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {w.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {w.desired_window}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="mt-12 grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-xl">Inbound handled</h2>
                {data.inbound.length === 0 ? (
                  <p className="booth-card mt-4 p-6 text-sm text-muted-foreground">
                    No inbound messages yet.
                  </p>
                ) : (
                  <ul className="booth-card mt-4 divide-y divide-border">
                    {data.inbound.slice(0, 5).map((m) => (
                      <li key={m.id} className="px-5 py-3.5 text-sm">
                        <p className="text-muted-foreground">“{m.body}”</p>
                        <p className="mt-2 whitespace-pre-line text-xs text-primary">
                          {m.reply}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="font-display text-xl">Emails sent</h2>
                {data.emails.length === 0 ? (
                  <p className="booth-card mt-4 p-6 text-sm text-muted-foreground">
                    No emails yet. They go out the moment a deposit clears.
                  </p>
                ) : (
                  <ul className="booth-card mt-4 divide-y divide-border">
                    {data.emails.slice(0, 5).map((m) => (
                      <li key={m.id} className="px-5 py-3.5 text-sm">
                        <div className="flex justify-between gap-3">
                          <span>{m.subject}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.delivered ? "delivered" : "queued"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{m.to_email}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </StudioShell>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="booth-card rise-in p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

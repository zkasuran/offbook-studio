import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getAvailability, joinWaitlist, startDeposit } from "@/lib/booking.functions";
import { StudioShell } from "@/components/studio/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { laDayLabel, laDateKey, laTime, money } from "@/lib/time";

const availabilityQuery = queryOptions({
  queryKey: ["availability"],
  queryFn: () => getAvailability(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { slot?: string } =>
    typeof search["slot"] === "string" ? { slot: search["slot"] } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(availabilityQuery),
  head: () => ({
    meta: [
      { title: "Off Book Self-Tape Studio — Book your audition tape in North Hollywood" },
      {
        name: "description",
        content:
          "Book a self-tape slot at Off Book Self-Tape Studio in North Hollywood. One booth, a trained reader, files before you leave. Hold your slot in 60 seconds with a deposit.",
      },
      { property: "og:title", content: "Off Book Self-Tape Studio" },
      {
        property: "og:description",
        content: "Book your self-tape. Hold your slot in 60 seconds. North Hollywood, CA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingPage,
  errorComponent: ({ error }) => (
    <StudioShell>
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-2xl">The booth board didn't load</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </StudioShell>
  ),
  notFoundComponent: () => (
    <StudioShell>
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-muted-foreground">
        Nothing here.
      </div>
    </StudioShell>
  ),
});

function BookingPage() {
  const { data } = useSuspenseQuery(availabilityQuery);
  const search = Route.useSearch();
  const deposit = useServerFn(startDeposit);

  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? "");
  const [slotId, setSlotId] = useState<string | null>(search.slot ?? null);
  const [actorName, setActorName] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const service = data.services.find((s) => s.id === serviceId) ?? data.services[0];
  const slot = data.slots.find((s) => s.id === slotId) ?? null;

  const days = useMemo(() => {
    const map = new Map<string, typeof data.slots>();
    for (const s of data.slots) {
      const key = laDateKey(s.starts_at);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()].slice(0, 8);
  }, [data.slots]);

  const preselected = data.slots.find((s) => s.id === search.slot);
  const [activeDay, setActiveDay] = useState(
    preselected ? laDateKey(preselected.starts_at) : (days[0]?.[0] ?? ""),
  );
  const daySlots = days.find(([k]) => k === activeDay)?.[1] ?? days[0]?.[1] ?? [];

  async function handleBook() {
    if (!service || !slot) return;
    setBusy(true);
    try {
      const res = await deposit({
        data: {
          serviceId: service.id,
          slotId: slot.id,
          actorName,
          actorEmail,
          origin: window.location.origin,
          source: "web",
        },
      });
      window.location.href = res.checkoutUrl;
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const canBook =
    !!service && !!slot && actorName.trim().length > 1 && /\S+@\S+\.\S+/.test(actorEmail);

  return (
    <StudioShell>
      <section className="tungsten-wash relative">
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-16 sm:pt-24">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">
            North Hollywood · One booth
          </p>
          <h1 className="rise-in mt-4 max-w-2xl font-display text-4xl leading-[1.05] sm:text-6xl">
            Book your self-tape.
            <br />
            <span className="text-primary">Hold your slot in 60 seconds.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Auditions land at midnight and are due by nine. Pick a time, pay a small deposit,
            and the booth is yours — lit, miked and with a reader who actually acts.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 pb-8">
        <section aria-labelledby="services" className="mt-6">
          <h2 id="services" className="font-display text-xl">
            1. Pick your session
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.services.map((s) => {
              const active = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`booth-card p-5 text-left transition-all ${
                    active ? "amber-glow border-primary/60" : "hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-lg">{s.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {s.duration_minutes} min
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                  <p className="mt-4 text-sm">
                    <span className="text-foreground">{money(s.price_cents)}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {money(s.deposit_cents)} deposit holds it
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="slots" className="mt-12">
          <h2 id="slots" className="font-display text-xl">
            2. Pick a time
          </h2>

          {days.length === 0 ? (
            <div className="booth-card mt-4 p-8 text-center">
              <p className="font-display text-lg">The booth is fully booked this week.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Join the waitlist below — the next cancellation goes out automatically, first
                come first served.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {days.map(([key, slots]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveDay(key)}
                    className={`slot-chip whitespace-nowrap px-4 py-2 text-sm ${
                      key === activeDay ? "border-primary/70 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {laDayLabel(slots[0]!.starts_at)}
                    <span className="ml-2 text-xs opacity-70">{slots.length}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {daySlots.map((s) => {
                  const active = s.id === slotId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotId(s.id)}
                      className={`slot-chip px-2 py-3 text-sm ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {laTime(s.starts_at)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="details" className="mt-12">
          <h2 id="details" className="font-display text-xl">
            3. Hold it
          </h2>
          <div className="booth-card mt-4 p-6">
            {slot && service ? (
              <p className="rise-in text-sm">
                <span className="text-primary">{service.name}</span>
                <span className="text-muted-foreground"> · </span>
                {laDayLabel(slot.starts_at)}, {laTime(slot.starts_at)} PT
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a session and a time to continue.
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="Mara Quinn"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email for your files</Label>
                <Input
                  id="email"
                  type="email"
                  value={actorEmail}
                  onChange={(e) => setActorEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <Button
              className="mt-6 w-full sm:w-auto"
              size="lg"
              disabled={!canBook || busy}
              onClick={handleBook}
            >
              {busy
                ? "Opening checkout…"
                : service
                  ? `${money(service.deposit_cents)} holds your slot`
                  : "Hold my slot"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              The deposit is credited to your session — you only settle the balance in the room.
              Cancel or move up to 4 hours before and the deposit follows you.
            </p>
          </div>
        </section>

        <WaitlistCard />
      </main>
    </StudioShell>
  );
}

function WaitlistCard() {
  const join = useServerFn(joinWaitlist);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [window_, setWindow] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <section className="booth-card rise-in mt-12 p-6">
        <h2 className="font-display text-xl text-primary">You're on the list</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The next cancellation that matches your window is emailed straight to you with a
          one-tap claim link. No chasing, no calling.
        </p>
      </section>
    );
  }

  return (
    <section className="booth-card mt-12 p-6">
      <h2 className="font-display text-xl">Nothing fits? Get the next cancellation.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us your window. When a slot frees up it's offered to you first, held for 30
        minutes.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="wl-name">Name</Label>
          <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wl-email">Email</Label>
          <Input
            id="wl-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wl-window">When you need it</Label>
          <Input
            id="wl-window"
            value={window_}
            onChange={(e) => setWindow(e.target.value)}
            placeholder="Tonight after 6pm"
          />
        </div>
      </div>
      <Button
        variant="secondary"
        className="mt-5"
        disabled={busy || name.trim().length < 2 || !/\S+@\S+\.\S+/.test(email) || window_.trim().length < 3}
        onClick={async () => {
          setBusy(true);
          try {
            await join({
              data: { actorName: name, actorEmail: email, desiredWindow: window_ },
            });
            setDone(true);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not join the waitlist.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Adding you…" : "Join the waitlist"}
      </Button>
    </section>
  );
}

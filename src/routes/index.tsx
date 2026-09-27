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
import heroImage from "@/assets/studio-hero.jpg";
import roomImage from "@/assets/inbound-studio.jpg";
import quickTapeImage from "@/assets/quick-tape.jpg";
import readerTapeImage from "@/assets/reader-tape.jpg";
import coachingImage from "@/assets/coaching.jpg";
import auditionImage from "@/assets/audition-sides.jpg";
import waitlistImage from "@/assets/waitlist-actor.jpg";
import seamlessMotion from "@/assets/studio-montage-loop.webm.asset.json";
import readerMotion from "@/assets/reader-true-loop.webm.asset.json";
import auditionMotion from "@/assets/audition-true-loop.webm.asset.json";

const serviceImages = [quickTapeImage, readerTapeImage, coachingImage];

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
      { title: "Off Book Self-Tape Studio · Book your audition tape in North Hollywood" },
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
      <section className="studio-hero relative isolate flex min-h-[510px] items-end overflow-hidden sm:min-h-[590px]">
        <img src={heroImage} width={1536} height={1024} alt="Actor performing a self-tape in a lit studio booth" className="studio-hero-image absolute inset-0 h-full w-full object-cover object-[62%_center]" fetchPriority="high" />
        <video className="studio-hero-video absolute inset-0 h-full w-full object-cover object-[62%_center]" autoPlay muted loop playsInline poster={heroImage} aria-hidden="true">
          <source src={seamlessMotion.url} type="video/webm" />
        </video>
        <div className="studio-hero-shade absolute inset-0" aria-hidden="true" />
        <div className="studio-grain absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-5xl px-5 pb-12 pt-28 sm:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            North Hollywood · One booth
          </p>
          <h1 className="rise-in mt-5 max-w-2xl font-display text-5xl leading-[1.05] text-hero-foreground sm:text-7xl">
            Book your self-tape.
            <br />
            <span className="text-primary">Hold your slot in 60 seconds.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-hero-muted sm:text-lg">
            Auditions land at midnight and are due by nine. Pick a time, pay a small deposit
            and the booth is yours, lit, miked and with a reader who actually acts.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-hero-muted">
            <span className="h-px w-8 bg-primary" /> Your scene starts here
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 pb-8">
        <section aria-labelledby="services" className="mt-12 sm:mt-16">
          <h2 id="services" className="font-display text-2xl">
            1. Pick your session
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.services.map((s, index) => {
              const active = s.id === serviceId;
              return (
                <Button
                  key={s.id}
                  type="button"
                  variant="outline"
                  onClick={() => setServiceId(s.id)}
                  aria-pressed={active}
                  className={`booth-card group h-auto min-h-72 flex-col items-stretch justify-start overflow-hidden whitespace-normal p-0 text-left transition-all duration-300 hover:-translate-y-1 ${
                    active ? "amber-glow border-primary/60" : "hover:border-primary/30"
                  }`}
                >
                  <div className="relative h-36 w-full overflow-hidden sm:h-40">
                    <img src={serviceImages[index % serviceImages.length]} width={1024} height={768} loading="lazy" alt="" className="studio-media-drift h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute bottom-3 right-3 bg-background/85 px-2 py-1 text-xs text-foreground backdrop-blur-sm">{s.duration_minutes} min</span>
                  </div>
                  <div className="flex w-full flex-1 flex-col p-5">
                    <span className="font-display text-lg">{s.name}</span>
                    <p className="mt-2 w-full flex-1 text-sm font-normal leading-relaxed text-muted-foreground">{s.description}</p>
                    <p className="mt-4 w-full text-sm font-normal"><span className="text-foreground">{money(s.price_cents)}</span><span className="text-muted-foreground"> · {money(s.deposit_cents)} deposit holds it</span></p>
                  </div>
                </Button>
              );
            })}
          </div>
        </section>

        <div className="studio-interlude relative mt-12 overflow-hidden sm:mt-16">
          <img src={roomImage} width={1536} height={1024} loading="lazy" alt="Actor preparing a script in front of the studio camera and lights" className="absolute inset-0 h-full w-full object-cover object-center" />
          <video className="studio-hero-video absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="none" poster={roomImage} aria-hidden="true">
            <source src={readerMotion.url} type="video/webm" />
          </video>
          <div className="studio-interlude-shade absolute inset-0" aria-hidden="true" />
          <div className="studio-grain absolute inset-0" aria-hidden="true" />
          <div className="relative flex min-h-48 flex-col justify-end p-6 sm:min-h-56 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">In the room</p>
            <p className="mt-2 max-w-md font-display text-2xl leading-tight text-hero-foreground sm:text-3xl">The camera is rolling. The next take is yours.</p>
          </div>
        </div>

        <section aria-labelledby="slots" className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            <h2 id="slots" className="font-display text-2xl">2. Pick a time</h2>

          {days.length === 0 ? (
            <div className="booth-card mt-4 p-8 text-center">
              <p className="font-display text-lg">The booth is fully booked this week.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Join the waitlist below. The next cancellation goes out automatically, first
                come first served.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {days.map(([key, slots]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    onClick={() => setActiveDay(key)}
                    aria-pressed={key === activeDay}
                    className={`slot-chip h-auto whitespace-nowrap px-4 py-2 text-sm ${
                      key === activeDay ? "border-primary/70 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {laDayLabel(slots[0]?.starts_at ?? "")}
                    <span className="ml-2 text-xs opacity-70">{slots.length}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {daySlots.map((s) => {
                  const active = s.id === slotId;
                  return (
                    <Button
                      key={s.id}
                      type="button"
                      variant="outline"
                      onClick={() => setSlotId(s.id)}
                      aria-pressed={active}
                      className={`slot-chip h-11 px-2 text-sm ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {laTime(s.starts_at)}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
          </div>
          <div className="relative hidden aspect-[4/5] overflow-hidden lg:block">
            <img src={auditionImage} width={1024} height={768} loading="lazy" alt="Actor reviewing audition sides beside the camera monitor" className="absolute inset-0 h-full w-full object-cover" />
            <video className="studio-hero-video absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="none" poster={auditionImage} aria-hidden="true">
              <source src={auditionMotion.url} type="video/webm" />
            </video>
            <div className="studio-interlude-shade absolute inset-0" aria-hidden="true" />
            <p className="absolute bottom-5 left-5 right-5 font-display text-xl text-hero-foreground">Make the deadline. Keep the moment.</p>
          </div>
        </section>

        <section aria-labelledby="details" className="mt-12">
          <h2 id="details" className="font-display text-2xl">
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
              The deposit is credited to your session. You only settle the balance in the room.
              Cancel or move up to 4 hours before and the deposit follows you.
            </p>
          </div>
        </section>

        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_17rem]">
          <WaitlistCard />
          <div className="min-h-52 overflow-hidden">
            <img src={waitlistImage} width={1024} height={768} loading="lazy" alt="Actor reading audition sides outside the studio booth" className="studio-media-drift h-full w-full object-cover" />
          </div>
        </div>
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
      <section className="booth-card rise-in p-6">
        <h2 className="font-display text-xl text-primary">You're on the list</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The next cancellation that matches your window is emailed straight to you with a
          one-tap claim link. No chasing, no calling.
        </p>
      </section>
    );
  }

  return (
    <section className="booth-card p-6">
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

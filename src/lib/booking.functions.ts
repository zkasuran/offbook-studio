import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(200);
const nameSchema = z.string().trim().min(2).max(80);

export type AvailabilityService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  description: string;
};

export type AvailabilitySlot = { id: string; starts_at: string };

export const getAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { releaseExpiredHolds } = await import("./studio.server");
  await releaseExpiredHolds();

  const horizon = new Date(Date.now() + 8 * 86400000).toISOString();
  const [{ data: services }, { data: slots }] = await Promise.all([
    supabaseAdmin
      .from("services")
      .select("id, name, duration_minutes, price_cents, deposit_cents, description")
      .order("sort_order"),
    supabaseAdmin
      .from("slots")
      .select("id, starts_at")
      .eq("status", "open")
      .gt("starts_at", new Date().toISOString())
      .lt("starts_at", horizon)
      .order("starts_at"),
  ]);

  return {
    services: (services ?? []) as AvailabilityService[],
    slots: (slots ?? []) as AvailabilitySlot[],
  };
});

export const startDeposit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        serviceId: z.string().uuid(),
        slotId: z.string().uuid(),
        actorName: nameSchema,
        actorEmail: emailSchema,
        origin: z.string().url(),
        source: z.string().max(40).default("web"),
        claimToken: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createCheckoutSession, releaseExpiredHolds } = await import("./studio.server");
    await releaseExpiredHolds();

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (!service) throw new Error("That service is no longer offered.");

    const { data: slot } = await supabaseAdmin
      .from("slots")
      .select("*")
      .eq("id", data.slotId)
      .maybeSingle();
    if (!slot) throw new Error("That slot no longer exists.");

    const claimable =
      slot.status === "open" ||
      (slot.status === "held" && !!data.claimToken && slot.hold_token === data.claimToken);
    if (!claimable) throw new Error("That slot was just taken. Pick another time.");

    const holdToken = data.claimToken ?? crypto.randomUUID();
    const holdExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: heldRows } = await supabaseAdmin
      .from("slots")
      .update({ status: "held", hold_token: holdToken, hold_expires_at: holdExpires })
      .eq("id", slot.id)
      .in("status", data.claimToken ? ["open", "held"] : ["open"])
      .select("id");
    if (!heldRows || heldRows.length === 0) {
      throw new Error("That slot was just taken. Pick another time.");
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        actor_name: data.actorName,
        actor_email: data.actorEmail,
        service_id: service.id,
        slot_id: slot.id,
        deposit_cents: service.deposit_cents,
        deposit_status: "pending",
        source: data.source,
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error("Could not start that booking.");

    try {
      const session = await createCheckoutSession({
        origin: data.origin,
        serviceName: service.name,
        startsAt: slot.starts_at,
        depositCents: service.deposit_cents,
        email: data.actorEmail,
        metadata: { booking_id: booking.id, slot_id: slot.id },
      });
      await supabaseAdmin
        .from("bookings")
        .update({ checkout_session_id: session.id })
        .eq("id", booking.id);
      return { checkoutUrl: session.url };
    } catch (e) {
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      await supabaseAdmin
        .from("slots")
        .update({ status: "open", hold_token: null, hold_expires_at: null })
        .eq("id", slot.id);
      throw e;
    }
  });

export const confirmDeposit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().min(8).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { retrieveCheckoutSession, confirmationEmail, sendStudioEmail } = await import(
      "./studio.server"
    );

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*, services(*), slots(*)")
      .eq("checkout_session_id", data.sessionId)
      .maybeSingle();
    if (!booking) throw new Error("We couldn't find that booking.");

    const service = booking.services as { name: string; price_cents: number } | null;
    const slot = booking.slots as { id: string; starts_at: string } | null;
    if (!service || !slot) throw new Error("We couldn't find that booking.");

    const summary = {
      actorName: booking.actor_name,
      actorEmail: booking.actor_email,
      serviceName: service.name,
      startsAt: slot.starts_at,
      depositCents: booking.deposit_cents,
      balanceCents: service.price_cents - booking.deposit_cents,
      paid: booking.deposit_status === "paid",
    };

    if (booking.deposit_status === "paid") return summary;

    const session = await retrieveCheckoutSession(data.sessionId);
    if (session.payment_status !== "paid") {
      return { ...summary, paid: false };
    }

    await supabaseAdmin
      .from("bookings")
      .update({ deposit_status: "paid" })
      .eq("id", booking.id);
    await supabaseAdmin
      .from("slots")
      .update({ status: "booked", hold_token: null, hold_expires_at: null })
      .eq("id", slot.id);
    await supabaseAdmin
      .from("waitlist")
      .update({ status: "claimed" })
      .eq("offered_slot_id", slot.id)
      .eq("status", "offered");

    const mail = confirmationEmail({
      actorName: booking.actor_name,
      serviceName: service.name,
      startsAt: slot.starts_at,
      depositCents: booking.deposit_cents,
    });
    await sendStudioEmail({
      to: booking.actor_email,
      subject: mail.subject,
      body: mail.body,
      kind: "confirmation",
      bookingId: booking.id,
    });

    return { ...summary, paid: true };
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        actorName: nameSchema,
        actorEmail: emailSchema,
        desiredWindow: z.string().trim().min(3).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("waitlist").insert({
      actor_name: data.actorName,
      actor_email: data.actorEmail,
      desired_window: data.desiredWindow,
    });
    if (error) throw new Error("Could not add you to the waitlist.");
    return { ok: true };
  });

export const getClaimOffer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { releaseExpiredHolds } = await import("./studio.server");
    await releaseExpiredHolds();

    const { data: offer } = await supabaseAdmin
      .from("waitlist")
      .select("*, slots(*)")
      .eq("claim_token", data.token)
      .eq("status", "offered")
      .maybeSingle();
    if (!offer || !offer.slots) return { valid: false as const };

    const slot = offer.slots as { id: string; starts_at: string };
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id, name, duration_minutes, price_cents, deposit_cents, description")
      .order("sort_order");

    return {
      valid: true as const,
      actorName: offer.actor_name,
      actorEmail: offer.actor_email,
      expiresAt: offer.offer_expires_at,
      slot,
      services: (services ?? []) as AvailabilityService[],
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type DashboardBooking = {
  id: string;
  actorName: string;
  actorEmail: string;
  serviceName: string;
  startsAt: string;
  depositStatus: string;
  depositCents: number;
  priceCents: number;
  status: string;
  source: string;
};

async function assertOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: owners } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "owner");

  if (!owners || owners.length === 0) {
    // Solo studio: the first person to sign in becomes the owner.
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "owner" });
    return;
  }
  if (!owners.some((o) => o.user_id === userId)) {
    throw new Error("This dashboard belongs to the studio owner.");
  }
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { releaseExpiredHolds } = await import("./studio.server");
    await releaseExpiredHolds();

    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString();
    const dayStart = new Date(Date.now() - 12 * 3600000).toISOString();

    const [bookingsRes, slotsRes, waitlistRes, inboundRes, emailsRes] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("*, services(name, price_cents), slots(starts_at)")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("slots")
        .select("id, starts_at, status")
        .gt("starts_at", dayStart)
        .lt("starts_at", weekAhead)
        .order("starts_at"),
      supabaseAdmin.from("waitlist").select("*").order("created_at"),
      supabaseAdmin
        .from("inbound_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAdmin
        .from("outbound_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const bookings: DashboardBooking[] = (bookingsRes.data ?? []).map((b) => {
      const service = b.services as { name: string; price_cents: number } | null;
      const slot = b.slots as { starts_at: string } | null;
      return {
        id: b.id,
        actorName: b.actor_name,
        actorEmail: b.actor_email,
        serviceName: service?.name ?? "Session",
        startsAt: slot?.starts_at ?? b.created_at,
        depositStatus: b.deposit_status,
        depositCents: b.deposit_cents,
        priceCents: service?.price_cents ?? 0,
        status: b.status,
        source: b.source,
      };
    });

    const paid = bookings.filter(
      (b) => b.depositStatus === "paid" && b.status !== "cancelled",
    );

    return {
      bookings,
      slots: slotsRes.data ?? [],
      waitlist: waitlistRes.data ?? [],
      inbound: inboundRes.data ?? [],
      emails: emailsRes.data ?? [],
      metrics: {
        inboundAnswered: (
          await supabaseAdmin
            .from("inbound_messages")
            .select("id", { count: "exact", head: true })
            .eq("auto_answered", true)
        ).count ?? 0,
        refilled: bookings.filter((b) => b.source === "waitlist").length,
        noShowsPrevented: paid.length,
        revenueProtectedCents: paid.reduce((sum, b) => sum + b.priceCents, 0),
      },
    };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ bookingId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { offerSlotToWaitlist } = await import("./studio.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) throw new Error("That booking is already gone.");

    await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);
    await supabaseAdmin
      .from("slots")
      .update({ status: "open", hold_token: null, hold_expires_at: null })
      .eq("id", booking.slot_id);

    const offer = await offerSlotToWaitlist(booking.slot_id, data.origin);
    return { refilled: !!offer };
  });

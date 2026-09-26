import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LA_TZ } from "./time";

export const STUDIO = {
  name: "Off Book Self-Tape Studio",
  city: "North Hollywood, CA",
  cancellationWindow:
    "Cancel or move your session up to 4 hours before start and your deposit follows you to the new time.",
};

export function fmtLA(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    timeZone: LA_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    timeZone: LA_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time} PT`;
}

export function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Any hold that ran out goes back on the board. */
export async function releaseExpiredHolds() {
  await supabaseAdmin
    .from("slots")
    .update({ status: "open", hold_token: null, hold_expires_at: null })
    .eq("status", "held")
    .lt("hold_expires_at", new Date().toISOString());

  await supabaseAdmin
    .from("waitlist")
    .update({ status: "waiting", claim_token: null, offered_slot_id: null, offer_expires_at: null })
    .eq("status", "offered")
    .lt("offer_expires_at", new Date().toISOString());
}

type EmailArgs = {
  to: string;
  subject: string;
  body: string;
  kind: string;
  bookingId?: string | null;
};

/**
 * Records the email and delivers it when a sending key is configured.
 * The record is always written so the owner can see exactly what went out.
 */
export async function sendStudioEmail({ to, subject, body, kind, bookingId }: EmailArgs) {
  let delivered = false;
  let providerError: string | null = null;

  const resendKey = process.env["RESEND_API_KEY"];
  const from = process.env["STUDIO_EMAIL_FROM"];
  if (resendKey && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
      });
      if (res.ok) delivered = true;
      else providerError = `Email provider returned ${res.status}`;
    } catch (e) {
      providerError = e instanceof Error ? e.message : "Email provider unreachable";
    }
  } else {
    providerError = "No sending domain connected yet — email recorded only.";
  }

  await supabaseAdmin.from("outbound_emails").insert({
    to_email: to,
    subject,
    body,
    kind,
    delivered,
    provider_error: providerError,
    booking_id: bookingId ?? null,
  });

  return { delivered, providerError };
}

export function confirmationEmail(opts: {
  actorName: string;
  serviceName: string;
  startsAt: string;
  depositCents: number;
}) {
  const subject = `You're booked — ${opts.serviceName}, ${fmtLA(opts.startsAt)}`;
  const body = [
    `${opts.actorName}, your booth time is locked.`,
    ``,
    `${STUDIO.name}`,
    `${opts.serviceName}`,
    `${fmtLA(opts.startsAt)}`,
    `${STUDIO.city}`,
    ``,
    `Deposit paid: ${dollars(opts.depositCents)} — it credits straight to your session, so you only settle the balance in the room.`,
    ``,
    STUDIO.cancellationWindow,
    ``,
    `Bring your sides. We'll bring the light, the reader and the files before you leave.`,
  ].join("\n");
  return { subject, body };
}

/** Stripe Checkout in test mode, called with the studio's configured key. */
export async function createCheckoutSession(opts: {
  origin: string;
  serviceName: string;
  startsAt: string;
  depositCents: number;
  email: string;
  metadata: Record<string, string>;
}) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Deposits are not configured yet.");

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("customer_email", opts.email);
  form.set("success_url", `${opts.origin}/confirm?session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${opts.origin}/?checkout=cancelled`);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(opts.depositCents));
  form.set(
    "line_items[0][price_data][product_data][name]",
    `Deposit — ${opts.serviceName}`,
  );
  form.set(
    "line_items[0][price_data][product_data][description]",
    `${fmtLA(opts.startsAt)} · ${STUDIO.name} · credited to your session`,
  );
  for (const [k, v] of Object.entries(opts.metadata)) {
    form.set(`metadata[${k}]`, v);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const json = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.url || !json.id) {
    throw new Error(json.error?.message ?? "Could not start the deposit.");
  }
  return { id: json.id, url: json.url };
}

export async function retrieveCheckoutSession(sessionId: string) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Deposits are not configured yet.");
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  const json = (await res.json()) as {
    payment_status?: string;
    metadata?: Record<string, string>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? "Could not read the deposit.");
  return json;
}

/** Hands a freed slot to the first matching person waiting, with a 30 minute hold. */
export async function offerSlotToWaitlist(slotId: string, origin: string) {
  const { data: slot } = await supabaseAdmin
    .from("slots")
    .select("id, starts_at, status")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot || slot.status !== "open") return null;

  const { data: candidates } = await supabaseAdmin
    .from("waitlist")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: true });
  if (!candidates || candidates.length === 0) return null;

  const next = candidates[0]!;
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("waitlist")
    .update({
      status: "offered",
      offered_slot_id: slot.id,
      claim_token: token,
      offer_expires_at: expires,
      notified_at: new Date().toISOString(),
    })
    .eq("id", next.id);

  await supabaseAdmin
    .from("slots")
    .update({ status: "held", hold_token: token, hold_expires_at: expires })
    .eq("id", slot.id);

  const subject = `A slot just opened — ${fmtLA(slot.starts_at)}`;
  const body = [
    `${next.actor_name}, the booth just freed up.`,
    ``,
    `${fmtLA(slot.starts_at)} at ${STUDIO.name}, ${STUDIO.city}.`,
    ``,
    `It's yours for the next 30 minutes. One tap claims it:`,
    `${origin}/claim/${token}`,
    ``,
    `After that it goes to the next actor waiting.`,
  ].join("\n");

  await sendStudioEmail({ to: next.actor_email, subject, body, kind: "waitlist-offer" });

  return { waitlistId: next.id, token, slotId: slot.id };
}

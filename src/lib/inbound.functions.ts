import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type InboundSuggestion = {
  slotId: string;
  startsAt: string;
  label: string;
};

export type InboundReply = {
  intent: string;
  reply: string;
  deadline: string | null;
  suggestions: InboundSuggestion[];
  waitlistOffered: boolean;
};

export const answerInbound = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ body: z.string().trim().min(2).max(1000) }).parse(input),
  )
  .handler(async ({ data }): Promise<InboundReply> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { releaseExpiredHolds, fmtLA, STUDIO } = await import("./studio.server");
    await releaseExpiredHolds();

    const { data: slots } = await supabaseAdmin
      .from("slots")
      .select("id, starts_at")
      .eq("status", "open")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(40);

    const open = slots ?? [];
    const nowIso = new Date().toISOString();

    let intent = "booking_request";
    let deadline: string | null = null;
    let opening = "";

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.8-flash",
            messages: [
              {
                role: "system",
                content:
                  `You are the text-back assistant for ${STUDIO.name}, a one-booth audition self-tape studio in ${STUDIO.city}. ` +
                  `The owner is usually filming and can't reply live. Current time in ISO UTC is ${nowIso}; the studio runs on America/Los_Angeles time. ` +
                  `Read the inbound message and return ONLY minified JSON with keys: ` +
                  `"intent" (booking_request | question | other), ` +
                  `"deadline" (ISO 8601 UTC timestamp the actor must be finished by, or null), ` +
                  `"opening" (one or two warm, plain sentences in the studio voice, no emoji, no markdown, no slot times and no time of day such as tonight or this morning, because the times get appended after).`,
              },
              { role: "user", content: data.body },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = json.choices?.[0]?.message?.content ?? "";
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as {
              intent?: string;
              deadline?: string | null;
              opening?: string;
            };
            intent = parsed.intent ?? intent;
            deadline = parsed.deadline ?? null;
            opening = parsed.opening ?? "";
          }
        }
      } catch {
        // fall through to the deterministic reply below
      }
    }

    if (!opening) {
      opening =
        "Caught this between takes, we can get you on camera. Here's what's still open in the booth.";
    }

    const beforeDeadline = deadline
      ? open.filter((s) => new Date(s.starts_at).getTime() < new Date(deadline!).getTime())
      : open;

    const pool = beforeDeadline.length > 0 ? beforeDeadline : open;
    const suggestions: InboundSuggestion[] = pool.slice(0, 3).map((s) => ({
      slotId: s.id,
      startsAt: s.starts_at,
      label: fmtLA(s.starts_at),
    }));

    const missedDeadline = !!deadline && beforeDeadline.length === 0;
    const lines = [opening];
    if (suggestions.length > 0) {
      lines.push(
        missedDeadline
          ? "Nothing lands before your deadline, but these are the nearest times. Tap one to hold it with a deposit:"
          : "Tap a time to hold it with a deposit:",
      );
      for (const s of suggestions) lines.push(`• ${s.label}`);
    } else {
      lines.push(
        "The booth is full right now. Join the waitlist and the next cancellation goes to you automatically.",
      );
    }

    const reply = lines.join("\n");

    await supabaseAdmin.from("inbound_messages").insert({
      body: data.body,
      reply,
      intent,
      auto_answered: true,
    });

    return {
      intent,
      reply,
      deadline,
      suggestions,
      waitlistOffered: suggestions.length === 0 || missedDeadline,
    };
  });

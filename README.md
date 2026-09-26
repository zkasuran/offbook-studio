# 🎬 Off Book — Self-Tape Studio

> One booth. One owner. No waiting room.
> A booking platform for a North Hollywood self-tape studio where actors record auditions against 12–48 hour deadlines.

**Live app:** https://offbook-studio.lovable.app
**Built for:** [Contra × Lovable Challenge](https://contra.com/community/topic/lovablechallenge)

---

## The problem

Actors get audition self-tape requests with brutal turnaround — often 24 hours. A one-person studio owner can't answer every text, hold slots on good faith, or refill last-minute cancellations while running the booth. Off Book is the studio's front desk, cashier, and answering service in one.

## What it does

| Feature | How it works |
| --- | --- |
| **Instant booking** | Actors pick a service and an open slot — no account needed, no phone tag. |
| **Deposit holds** | A 30-minute Stripe hold (test mode) locks the slot while the actor pays. No deposit, no slot. |
| **Confirmations** | Every booking gets a confirmation record with slot details, visible in the owner dashboard. |
| **AI text-back** | Inbound messages ("got a tape due tomorrow 6pm, anything open?") get an instant suggested-slots reply. |
| **Waitlist + auto-refill** | When the owner cancels a booking, the next waitlisted actor gets a 30-minute claim link automatically. |
| **Owner dashboard** | `/studio` — today's timeline, weekly bookings, deposits, waitlist, inbound activity, and an impact meter. |
| **Light / dark mode** | Tungsten-amber design, theme toggle persisted per visitor. |

## Try it as a judge

**Demo login (owner dashboard):**

```
Email:    judge@offbook-studio.lovable.app
Password: OffBook2026!
```

**The 60-second tour:**

1. **Book** — pick a service and slot on the home page.
2. **Pay** — complete the deposit with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. **Confirm** — land on the confirmation page with your slot details.
4. **Text** — open `/inbound` and send a deadline message; watch the suggested-slots reply.
5. **Run the booth** — sign in with the demo login above and open `/studio`: cancel a booking and watch the waitlist auto-refill fire.

## Tech stack

- **Frontend:** React 19, TanStack Start (SSR), TanStack Router + Query, Tailwind CSS v4, shadcn/ui
- **Backend:** Lovable Cloud ( Postgres, row-level security, auth )
- **Payments:** Stripe (test mode) — deposit holds with 30-minute expiry
- **Server logic:** TanStack server functions (`createServerFn`)

## Project structure

```text
src/
├── routes/
│   ├── index.tsx              # Booking page — services, slots, deposit checkout
│   ├── confirm.tsx            # Post-payment confirmation
│   ├── inbound.tsx            # AI text-back demo
│   ├── claim.$token.tsx       # Waitlist claim links
│   ├── auth.tsx               # Sign in / sign up
│   └── _authenticated/
│       └── studio.tsx         # Owner dashboard (role-gated)
├── lib/
│   ├── booking.functions.ts   # Holds, checkout, confirmation
│   ├── inbound.functions.ts   # AI/deterministic text-back
│   ├── studio.functions.ts    # Dashboard data, cancel + auto-refill
│   └── studio.server.ts       # Shared server helpers
└── components/studio/         # Shell, theme toggle, UI
```

## Notes

- Stripe runs in **test mode** — no real charges.
- Confirmation emails are **recorded** in the dashboard; live sending requires a configured email domain.
- All times are shown in **Los Angeles time**.

---

Built with [Lovable](https://lovable.dev) 🧡

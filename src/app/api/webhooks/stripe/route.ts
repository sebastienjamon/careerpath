import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";
import SessionConfirmationEmail from "@/emails/session-confirmation";
import { format } from "date-fns";

// Use service role client for webhooks (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const sessionId = checkoutSession.metadata?.session_id;

        if (sessionId) {
          // Update coaching session status
          await supabase
            .from("coaching_sessions")
            .update({
              payment_status: "paid",
              status: "confirmed",
              stripe_payment_intent_id: checkoutSession.payment_intent as string,
            })
            .eq("id", sessionId);

          console.log(`Session ${sessionId} payment confirmed`);

          // Send confirmation emails
          const { data: coachingSession } = await supabase
            .from("coaching_sessions")
            .select(`
              *,
              coaches (
                users (
                  full_name,
                  email
                )
              ),
              clients:users!coaching_sessions_client_id_fkey (
                full_name,
                email
              )
            `)
            .eq("id", sessionId)
            .single();

          if (coachingSession) {
            const coach = coachingSession.coaches?.users;
            const client = coachingSession.clients;
            const scheduledAt = new Date(coachingSession.scheduled_at);
            const coachAmount = (coachingSession.session_rate * (100 - PLATFORM_FEE_PERCENT) / 100).toFixed(2);

            // Email to client
            if (client?.email) {
              try {
                await resend.emails.send({
                  from: FROM_EMAIL,
                  to: client.email,
                  subject: "Coaching Session Confirmed!",
                  react: SessionConfirmationEmail({
                    clientName: client.full_name || "there",
                    coachName: coach?.full_name || "your coach",
                    scheduledDate: format(scheduledAt, "EEEE, MMMM d, yyyy"),
                    scheduledTime: format(scheduledAt, "h:mm a"),
                    duration: coachingSession.duration_minutes,
                    amount: `$${coachingSession.session_rate.toFixed(2)}`,
                    isCoach: false,
                  }),
                });
              } catch (emailErr) {
                console.error("Failed to send client confirmation:", emailErr);
              }
            }

            // Email to coach
            if (coach?.email) {
              try {
                await resend.emails.send({
                  from: FROM_EMAIL,
                  to: coach.email,
                  subject: "New Coaching Session Booked!",
                  react: SessionConfirmationEmail({
                    clientName: client?.full_name || "a client",
                    coachName: coach.full_name || "there",
                    scheduledDate: format(scheduledAt, "EEEE, MMMM d, yyyy"),
                    scheduledTime: format(scheduledAt, "h:mm a"),
                    duration: coachingSession.duration_minutes,
                    amount: `$${coachAmount}`,
                    isCoach: true,
                  }),
                });
              } catch (emailErr) {
                console.error("Failed to send coach confirmation:", emailErr);
              }
            }
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const sessionId = paymentIntent.metadata?.session_id;

        if (sessionId) {
          await supabase
            .from("coaching_sessions")
            .update({
              payment_status: "paid",
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq("id", sessionId);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const sessionId = paymentIntent.metadata?.session_id;

        if (sessionId) {
          await supabase
            .from("coaching_sessions")
            .update({
              payment_status: "pending",
              status: "cancelled",
            })
            .eq("id", sessionId);
        }
        break;
      }

      case "account.updated": {
        // Handle Connect account updates
        const account = event.data.object;
        const isComplete = account.charges_enabled && account.payouts_enabled;

        await supabase
          .from("coaches")
          .update({
            stripe_onboarding_complete: isComplete,
            availability_status: isComplete ? "available" : "unavailable",
          })
          .eq("stripe_account_id", account.id);

        console.log(`Coach account ${account.id} updated, complete: ${isComplete}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

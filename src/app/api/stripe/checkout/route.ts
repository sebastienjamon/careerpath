import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { coachId, durationMinutes, scheduledAt, stepId } = body;

    if (!coachId || !durationMinutes || !scheduledAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get coach details
    const { data: coach } = await supabase
      .from("coaches")
      .select(`
        *,
        users (
          full_name,
          email
        )
      `)
      .eq("id", coachId)
      .single();

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    if (!coach.stripe_account_id || !coach.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Coach is not set up for payments" },
        { status: 400 }
      );
    }

    // Calculate pricing
    const hourlyRate = coach.hourly_rate;
    const sessionRate = Math.round((hourlyRate * durationMinutes) / 60 * 100); // in cents
    const platformFee = calculatePlatformFee(sessionRate);

    // Create coaching session record
    const { data: session, error: sessionError } = await supabase
      .from("coaching_sessions")
      .insert({
        coach_id: coachId,
        client_id: user.id,
        step_id: stepId || null,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        session_rate: sessionRate / 100, // Store in dollars
        platform_fee: platformFee / 100,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Coaching Session with ${coach.users?.full_name || "Coach"}`,
              description: `${durationMinutes} minute coaching session`,
            },
            unit_amount: sessionRate,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: coach.stripe_account_id,
        },
        metadata: {
          session_id: session.id,
          coach_id: coachId,
          client_id: user.id,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/coaches?booking=success&session=${session.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/coaches?booking=cancelled`,
      metadata: {
        session_id: session.id,
      },
    });

    // Update session with Stripe payment intent (will be created after checkout)
    // The actual payment intent ID will be updated via webhook

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Create Stripe Connect account and return onboarding URL
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a coach profile
    const { data: existingCoach } = await supabase
      .from("coaches")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let stripeAccountId = existingCoach?.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: {
          user_id: user.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Update or create coach record with Stripe account ID
      if (existingCoach) {
        await supabase
          .from("coaches")
          .update({ stripe_account_id: stripeAccountId })
          .eq("id", existingCoach.id);
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/become-coach?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, accountId: stripeAccountId });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}

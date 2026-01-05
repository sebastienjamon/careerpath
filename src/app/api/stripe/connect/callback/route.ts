import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
    }

    // Get coach record
    const { data: coach } = await supabase
      .from("coaches")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!coach?.stripe_account_id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/become-coach?error=no_account`
      );
    }

    // Check if onboarding is complete
    const account = await stripe.accounts.retrieve(coach.stripe_account_id);

    const isOnboardingComplete =
      account.charges_enabled && account.payouts_enabled;

    // Update coach record
    await supabase
      .from("coaches")
      .update({
        stripe_onboarding_complete: isOnboardingComplete,
        availability_status: isOnboardingComplete ? "available" : "unavailable",
      })
      .eq("id", coach.id);

    if (isOnboardingComplete) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/coaches?onboarding=complete`
      );
    } else {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/become-coach?onboarding=incomplete`
      );
    }
  } catch (error) {
    console.error("Stripe Connect callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/become-coach?error=callback_failed`
    );
  }
}

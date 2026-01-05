import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Platform fee percentage (e.g., 15 = 15%)
export const PLATFORM_FEE_PERCENT = parseInt(
  process.env.STRIPE_PLATFORM_FEE_PERCENT || "15"
);

// Calculate platform fee from amount
export function calculatePlatformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

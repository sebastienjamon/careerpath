"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  DollarSign,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

interface CoachProfile {
  id: string;
  specialties: string[];
  hourly_rate: number;
  bio: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  availability_status: string;
}

export default function BecomeCoachPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);

  const [formData, setFormData] = useState({
    specialties: "",
    hourly_rate: "",
    bio: "",
  });

  useEffect(() => {
    fetchCoachProfile();

    // Check for URL params
    const onboarding = searchParams.get("onboarding");
    const error = searchParams.get("error");

    if (onboarding === "incomplete") {
      toast.warning("Please complete your Stripe onboarding to start receiving payments.");
    } else if (error) {
      toast.error(`Error: ${error}`);
    }

    // Clean URL
    if (onboarding || error) {
      window.history.replaceState({}, "", "/become-coach");
    }
  }, [searchParams]);

  const fetchCoachProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("coaches")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCoachProfile(data as CoachProfile);
      setFormData({
        specialties: data.specialties?.join(", ") || "",
        hourly_rate: data.hourly_rate?.toString() || "",
        bio: data.bio || "",
      });
    }

    setIsLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const profileData = {
      user_id: user.id,
      specialties: formData.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
      bio: formData.bio,
    };

    if (coachProfile) {
      // Update existing
      const { error } = await supabase
        .from("coaches")
        .update(profileData)
        .eq("id", coachProfile.id);

      if (error) {
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated!");
        fetchCoachProfile();
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from("coaches")
        .insert(profileData)
        .select()
        .single();

      if (error) {
        toast.error("Failed to create profile");
      } else {
        toast.success("Coach profile created!");
        setCoachProfile(data as CoachProfile);
      }
    }

    setIsSaving(false);
  };

  const handleConnectStripe = async () => {
    if (!coachProfile) {
      toast.error("Please save your profile first");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update local state with Stripe account ID
      if (data.accountId && !coachProfile.stripe_account_id) {
        await supabase
          .from("coaches")
          .update({ stripe_account_id: data.accountId })
          .eq("id", coachProfile.id);
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error("Stripe connect error:", error);
      toast.error("Failed to connect Stripe");
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isProfileComplete = coachProfile && parseFloat(formData.hourly_rate) > 0;
  const isStripeComplete = coachProfile?.stripe_onboarding_complete;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Become a Coach</h1>
        <p className="text-slate-600 mt-1">
          Share your expertise and help others succeed in their careers
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isProfileComplete
                ? "bg-green-100 text-green-600"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            {isProfileComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <span className="text-sm font-medium">1</span>
            )}
          </div>
          <span className="text-sm font-medium">Create Profile</span>
        </div>

        <div className="flex-1 h-0.5 bg-slate-200" />

        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isStripeComplete
                ? "bg-green-100 text-green-600"
                : isProfileComplete
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {isStripeComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <span className="text-sm font-medium">2</span>
            )}
          </div>
          <span className="text-sm font-medium">Connect Payments</span>
        </div>

        <div className="flex-1 h-0.5 bg-slate-200" />

        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              isStripeComplete
                ? "bg-green-100 text-green-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {isStripeComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <span className="text-sm font-medium">3</span>
            )}
          </div>
          <span className="text-sm font-medium">Start Coaching</span>
        </div>
      </div>

      {/* Coach Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Coach Profile
          </CardTitle>
          <CardDescription>
            Tell potential clients about your expertise and experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties (comma-separated)</Label>
              <Input
                id="specialties"
                placeholder="Interview prep, Resume review, Career transition, Tech interviews"
                value={formData.specialties}
                onChange={(e) =>
                  setFormData({ ...formData, specialties: e.target.value })
                }
                required
              />
              <p className="text-xs text-slate-500">
                What areas can you help with?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="hourly_rate"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="50"
                  className="pl-10"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourly_rate: e.target.value })
                  }
                  required
                />
              </div>
              <p className="text-xs text-slate-500">
                Platform takes 15% commission
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell clients about your background, experience, and coaching style..."
                rows={4}
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                required
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {coachProfile ? "Update Profile" : "Create Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Setup
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStripeComplete ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Payments Connected</p>
                <p className="text-sm text-green-600">
                  You can now receive payments from coaching sessions
                </p>
              </div>
            </div>
          ) : coachProfile?.stripe_account_id ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Onboarding Incomplete
                  </p>
                  <p className="text-sm text-yellow-600">
                    Complete your Stripe setup to start receiving payments
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectStripe} disabled={isConnecting}>
                {isConnecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Complete Stripe Setup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Connect with Stripe to securely receive payments. You&apos;ll earn{" "}
                <strong>85%</strong> of each session fee.
              </p>
              <Button
                onClick={handleConnectStripe}
                disabled={!isProfileComplete || isConnecting}
              >
                {isConnecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Connect Stripe Account
              </Button>
              {!isProfileComplete && (
                <p className="text-xs text-slate-500">
                  Save your profile first to connect Stripe
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Summary */}
      {isStripeComplete && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">
                  You&apos;re all set!
                </h3>
                <p className="text-sm text-green-600">
                  Your coach profile is now live. Clients can find and book
                  sessions with you.
                </p>
              </div>
              <Button
                onClick={() => router.push("/coaches")}
                variant="outline"
                className="ml-auto"
              >
                View Coaches
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

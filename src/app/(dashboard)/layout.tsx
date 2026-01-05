import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is a coach
  const { data: coach } = await supabase
    .from("coaches")
    .select("stripe_onboarding_complete")
    .eq("user_id", user.id)
    .single();

  const isCoach = !!coach?.stripe_onboarding_complete;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav user={user} isCoach={isCoach} />
      <main className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}

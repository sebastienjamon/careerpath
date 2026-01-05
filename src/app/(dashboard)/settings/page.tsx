"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Linkedin, Bell, Loader2, CheckCircle2, ExternalLink, Briefcase, ArrowRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface LinkedInData {
  linkedin_id: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  connected_at: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    linkedin_profile_url: string;
    linkedin_data: LinkedInData | null;
  } | null>(null);

  useEffect(() => {
    fetchUser();
    checkCalendarConnection();

    // Check for LinkedIn connection status in URL
    const linkedinStatus = searchParams.get("linkedin");
    const calendarStatus = searchParams.get("calendar");
    const error = searchParams.get("error");

    if (linkedinStatus === "connected") {
      toast.success("LinkedIn account connected successfully!");
      window.history.replaceState({}, "", "/settings");
    } else if (calendarStatus === "connected") {
      toast.success("Google Calendar connected successfully!");
      setIsCalendarConnected(true);
      window.history.replaceState({}, "", "/settings");
    } else if (error) {
      const message = searchParams.get("message");
      toast.error(message || `Connection failed: ${error}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  const checkCalendarConnection = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .eq("user_id", authUser.id)
      .single();

    setIsCalendarConnected(!!data);
  };

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        full_name: data.full_name || "",
        avatar_url: data.avatar_url || "",
        linkedin_profile_url: data.linkedin_profile_url || "",
        linkedin_data: data.linkedin_data as LinkedInData | null,
      });
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: user.full_name,
        linkedin_profile_url: user.linkedin_profile_url,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }

    setIsSaving(false);
  };

  const handleConnectLinkedIn = () => {
    // Redirect to LinkedIn OAuth endpoint
    window.location.href = "/api/auth/linkedin";
  };

  const handleDisconnectLinkedIn = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to disconnect your LinkedIn account?")) return;

    const { error } = await supabase
      .from("users")
      .update({
        linkedin_profile_url: null,
        linkedin_data: null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to disconnect LinkedIn");
    } else {
      toast.success("LinkedIn disconnected");
      setUser({ ...user, linkedin_profile_url: "", linkedin_data: null });
    }
  };

  const handleConnectCalendar = () => {
    window.location.href = "/api/auth/google-calendar";
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;

    setIsDisconnectingCalendar(true);
    try {
      const response = await fetch("/api/calendar/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("Google Calendar disconnected");
      setIsCalendarConnected(false);
    } catch (error) {
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setIsDisconnectingCalendar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const userInitials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  const isLinkedInConnected = !!user?.linkedin_data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Linkedin className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and public profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={user?.full_name || ""}
                      onChange={(e) =>
                        setUser(user ? { ...user, full_name: e.target.value } : null)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={user?.linkedin_profile_url || ""}
                    onChange={(e) =>
                      setUser(user ? { ...user, linkedin_profile_url: e.target.value } : null)
                    }
                  />
                </div>

                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Integration</CardTitle>
              <CardDescription>
                Connect your LinkedIn account for profile verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLinkedInConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.linkedin_data?.picture} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          <Linkedin className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">
                            {user?.linkedin_data?.name}
                          </h3>
                          <Badge className="bg-green-100 text-green-700 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">
                          {user?.linkedin_data?.email}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Connected on{" "}
                          {new Date(user?.linkedin_data?.connected_at || "").toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.linkedin_profile_url && (
                        <a
                          href={user.linkedin_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="h-4 w-4" />
                            View Profile
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectLinkedIn}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Imported Data</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>{" "}
                        <span className="text-slate-900">{user?.linkedin_data?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>{" "}
                        <span className="text-slate-900">{user?.linkedin_data?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Linkedin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">LinkedIn</h3>
                      <p className="text-sm text-slate-500">
                        Verify your identity with LinkedIn (name, email, photo)
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConnectLinkedIn}>Connect</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar Integration</CardTitle>
              <CardDescription>
                Connect your Google Calendar to import interview events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCalendarConnected ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">Google Calendar</h3>
                        <Badge className="bg-green-100 text-green-700 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        Import events to your interview steps
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectCalendar}
                    disabled={isDisconnectingCalendar}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDisconnectingCalendar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">Google Calendar</h3>
                      <p className="text-sm text-slate-500">
                        Link calendar events to interview steps
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConnectCalendar}>Connect</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Add Work History Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Import Work History
              </CardTitle>
              <CardDescription>
                Add your professional experience from LinkedIn to your career timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Use our Quick Add feature to rapidly enter your work history while referencing your LinkedIn profile.
                </p>
                <Link href="/journey">
                  <Button className="gap-2">
                    Go to Career Journey
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: "Interview Reminders",
                  description: "Get reminded about upcoming interviews",
                },
                {
                  title: "Application Updates",
                  description: "When your application status changes",
                },
                {
                  title: "Coaching Sessions",
                  description: "Reminders for scheduled coaching sessions",
                },
                {
                  title: "Weekly Summary",
                  description: "Weekly digest of your job search progress",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <h4 className="font-medium text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

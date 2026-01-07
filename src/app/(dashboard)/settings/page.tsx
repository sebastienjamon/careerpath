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
import { User, Linkedin, Bell, Loader2, CheckCircle2, ExternalLink, Briefcase, ArrowRight, Calendar, GraduationCap, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

interface CoachProfile {
  id: string;
  specialties: string[];
  hourly_rate: number;
  bio: string | null;
  availability_status: 'available' | 'busy' | 'unavailable';
  stripe_onboarding_complete: boolean;
  rating: number | null;
}

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
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [isSavingCoach, setIsSavingCoach] = useState(false);
  const [coachFormData, setCoachFormData] = useState({
    specialties: "",
    hourly_rate: "",
    bio: "",
    availability_status: "available" as CoachProfile["availability_status"],
  });
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
    fetchCoachProfile();
    checkCalendarConnection();

    // Handle tab from URL
    const tabParam = searchParams.get("tab");
    if (tabParam && ["profile", "integrations", "notifications", "coach"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Check for LinkedIn connection status in URL
    const linkedinStatus = searchParams.get("linkedin");
    const calendarStatus = searchParams.get("calendar");
    const error = searchParams.get("error");

    if (linkedinStatus === "connected") {
      toast.success("LinkedIn account connected successfully!");
      setActiveTab("integrations");
      window.history.replaceState({}, "", "/settings?tab=integrations");
    } else if (calendarStatus === "connected") {
      toast.success("Google Calendar connected successfully!");
      setIsCalendarConnected(true);
      setActiveTab("integrations");
      window.history.replaceState({}, "", "/settings?tab=integrations");
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

  const fetchCoachProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from("coaches")
      .select("id, specialties, hourly_rate, bio, availability_status, stripe_onboarding_complete, rating")
      .eq("user_id", authUser.id)
      .single();

    if (data) {
      setCoachProfile(data as CoachProfile);
      setCoachFormData({
        specialties: data.specialties?.join(", ") || "",
        hourly_rate: data.hourly_rate?.toString() || "",
        bio: data.bio || "",
        availability_status: data.availability_status || "available",
      });
    }
  };

  const handleSaveCoachProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachProfile) return;

    setIsSavingCoach(true);

    const specialtiesArray = coachFormData.specialties
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const { error } = await supabase
      .from("coaches")
      .update({
        specialties: specialtiesArray,
        hourly_rate: parseFloat(coachFormData.hourly_rate) || 0,
        bio: coachFormData.bio || null,
        availability_status: coachFormData.availability_status,
      })
      .eq("id", coachProfile.id);

    if (error) {
      toast.error("Failed to update coach profile");
    } else {
      toast.success("Coach profile updated successfully");
      fetchCoachProfile();
    }

    setIsSavingCoach(false);
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage your account preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
            <Linkedin className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          {coachProfile && (
            <TabsTrigger value="coach" className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" />
              Coach
            </TabsTrigger>
          )}
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={user?.linkedin_data?.picture} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          <Linkedin className="h-5 w-5 sm:h-6 sm:w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-900 truncate">
                            {user?.linkedin_data?.name}
                          </h3>
                          <Badge className="bg-green-100 text-green-700 gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
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
                          <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm">
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">View Profile</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectLinkedIn}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Imported Data</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>{" "}
                        <span className="text-slate-900">{user?.linkedin_data?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>{" "}
                        <span className="text-slate-900 break-all">{user?.linkedin_data?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-900">LinkedIn</h3>
                      <p className="text-sm text-slate-500">
                        Verify your identity with LinkedIn
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConnectLinkedIn} className="w-full sm:w-auto">Connect</Button>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-slate-900">Google Calendar</h3>
                        <Badge className="bg-green-100 text-green-700 gap-1 text-xs">
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                  >
                    {isDisconnectingCalendar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-900">Google Calendar</h3>
                      <p className="text-sm text-slate-500">
                        Link calendar events to interview steps
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConnectCalendar} className="w-full sm:w-auto">Connect</Button>
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Use our Quick Add feature to rapidly enter your work history while referencing your LinkedIn profile.
                </p>
                <Link href="/journey" className="w-full sm:w-auto">
                  <Button className="gap-2 w-full sm:w-auto">
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

        {coachProfile && (
          <TabsContent value="coach" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Coach Profile</CardTitle>
                    <CardDescription>
                      Manage your coaching profile and availability
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      coachFormData.availability_status === "available"
                        ? "bg-green-100 text-green-700"
                        : coachFormData.availability_status === "busy"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-700"
                    }
                  >
                    {coachFormData.availability_status === "available"
                      ? "Available"
                      : coachFormData.availability_status === "busy"
                      ? "Busy"
                      : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCoachProfile} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability Status</Label>
                    <Select
                      value={coachFormData.availability_status}
                      onValueChange={(value: CoachProfile["availability_status"]) =>
                        setCoachFormData({ ...coachFormData, availability_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Available - Accepting new bookings
                          </span>
                        </SelectItem>
                        <SelectItem value="busy">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            Busy - Limited availability
                          </span>
                        </SelectItem>
                        <SelectItem value="unavailable">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Unavailable - Not accepting bookings
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Only &quot;Available&quot; coaches appear in search results
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialties">Specialties</Label>
                    <Input
                      id="specialties"
                      value={coachFormData.specialties}
                      onChange={(e) =>
                        setCoachFormData({ ...coachFormData, specialties: e.target.value })
                      }
                      placeholder="e.g., Technical Interviews, System Design, Behavioral"
                    />
                    <p className="text-xs text-slate-500">
                      Separate multiple specialties with commas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="hourly_rate"
                        type="number"
                        min="0"
                        step="5"
                        value={coachFormData.hourly_rate}
                        onChange={(e) =>
                          setCoachFormData({ ...coachFormData, hourly_rate: e.target.value })
                        }
                        className="pl-9"
                        placeholder="150"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Platform keeps 15%, you receive 85% of the session fee
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={coachFormData.bio}
                      onChange={(e) =>
                        setCoachFormData({ ...coachFormData, bio: e.target.value })
                      }
                      placeholder="Tell potential clients about your experience, coaching style, and what makes you a great coach..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {coachProfile.stripe_onboarding_complete ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Stripe payments connected</span>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                            Payment setup incomplete
                          </Badge>
                          <Link href="/become-coach" className="text-blue-600 hover:underline">
                            Complete setup
                          </Link>
                        </>
                      )}
                    </div>
                    <Button type="submit" disabled={isSavingCoach}>
                      {isSavingCoach && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Profile Preview</CardTitle>
                <CardDescription>
                  How your profile appears to potential clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{user?.full_name || "Your Name"}</h3>
                        {coachProfile.rating && (
                          <span className="text-sm text-slate-500">★ {coachProfile.rating.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {coachFormData.specialties.split(",").filter(s => s.trim()).slice(0, 3).map((specialty, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {specialty.trim()}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                        {coachFormData.bio || "Your bio will appear here..."}
                      </p>
                      <p className="text-sm font-medium text-slate-900 mt-2">
                        ${coachFormData.hourly_rate || "0"}/hour
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

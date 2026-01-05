"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Star,
  Search,
  Calendar,
  DollarSign,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Coach {
  id: string;
  user_id: string;
  specialties: string[];
  hourly_rate: number;
  bio: string | null;
  availability_status: string;
  rating: number | null;
  stripe_onboarding_complete: boolean;
  users: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

export default function CoachesPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [bookingData, setBookingData] = useState({
    duration: "60",
    date: "",
    time: "",
  });

  useEffect(() => {
    fetchCoaches();
    getCurrentUser();

    // Check for booking status
    const booking = searchParams.get("booking");
    const onboarding = searchParams.get("onboarding");

    if (booking === "success") {
      toast.success("Session booked successfully! Check your email for details.");
      window.history.replaceState({}, "", "/coaches");
    } else if (booking === "cancelled") {
      toast.info("Booking was cancelled.");
      window.history.replaceState({}, "", "/coaches");
    } else if (onboarding === "complete") {
      toast.success("Congratulations! Your coach profile is now live.");
      window.history.replaceState({}, "", "/coaches");
    }
  }, [searchParams]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from("coaches")
      .select(`
        *,
        users (
          full_name,
          avatar_url
        )
      `)
      .eq("availability_status", "available")
      .eq("stripe_onboarding_complete", true)
      .order("rating", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching coaches:", error);
    }

    setCoaches((data as Coach[]) || []);
    setIsLoading(false);
  };

  const filteredCoaches = coaches.filter((coach) => {
    // Don't show user's own coach profile
    if (coach.user_id === currentUserId) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      coach.users?.full_name?.toLowerCase().includes(query) ||
      coach.specialties?.some((s) => s.toLowerCase().includes(query)) ||
      coach.bio?.toLowerCase().includes(query)
    );
  });

  const handleBookSession = (coach: Coach) => {
    setSelectedCoach(coach);
    setBookingData({
      duration: "60",
      date: "",
      time: "",
    });
    setIsBookingOpen(true);
  };

  const calculatePrice = (hourlyRate: number, duration: string) => {
    const minutes = parseInt(duration);
    return ((hourlyRate * minutes) / 60).toFixed(2);
  };

  const handleConfirmBooking = async () => {
    if (!selectedCoach || !bookingData.date || !bookingData.time) {
      toast.error("Please select a date and time");
      return;
    }

    setIsBooking(true);

    try {
      const scheduledAt = new Date(`${bookingData.date}T${bookingData.time}`).toISOString();

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: selectedCoach.id,
          durationMinutes: parseInt(bookingData.duration),
          scheduledAt,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking. Please try again.");
      setIsBooking(false);
    }
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Career Coaches</h1>
          <p className="text-slate-600 mt-1">
            Find experienced coaches to help you prepare for interviews
          </p>
        </div>
        <Link href="/become-coach">
          <Button variant="outline">Become a Coach</Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredCoaches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No coaches available yet</h3>
            <p className="text-slate-500 mt-1 text-center max-w-sm">
              Be the first to offer coaching services on the platform!
            </p>
            <Link href="/become-coach" className="mt-4">
              <Button>Become a Coach</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={coach.users?.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-lg">
                      {coach.users?.full_name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {coach.users?.full_name || "Coach"}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {coach.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{coach.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <Badge className="bg-green-100 text-green-700">
                        Available
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {coach.bio && (
                  <p className="text-sm text-slate-600 line-clamp-3">{coach.bio}</p>
                )}

                {coach.specialties && coach.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coach.specialties.slice(0, 4).map((specialty, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {coach.specialties.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{coach.specialties.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-slate-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">${coach.hourly_rate}</span>
                    <span className="text-sm">/hour</span>
                  </div>
                  <Button onClick={() => handleBookSession(coach)} className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Book Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Become a Coach CTA */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Become a Coach</h3>
                <p className="text-sm text-slate-600">
                  Share your expertise and earn 85% of each session
                </p>
              </div>
            </div>
            <Link href="/become-coach">
              <Button variant="outline" className="whitespace-nowrap">
                Get Started
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Session</DialogTitle>
            <DialogDescription>
              Schedule a coaching session with {selectedCoach?.users?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedCoach && (
            <div className="space-y-4">
              {/* Coach Summary */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedCoach.users?.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    {selectedCoach.users?.full_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedCoach.users?.full_name}</p>
                  <p className="text-sm text-slate-500">
                    ${selectedCoach.hourly_rate}/hour
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Session Duration</Label>
                <Select
                  value={bookingData.duration}
                  onValueChange={(value) =>
                    setBookingData({ ...bookingData, duration: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} - ${calculatePrice(selectedCoach.hourly_rate, option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    min={getMinDate()}
                    value={bookingData.date}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={bookingData.time}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, time: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Session ({bookingData.duration} min)</span>
                  <span>${calculatePrice(selectedCoach.hourly_rate, bookingData.duration)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-blue-100 pt-2">
                  <span>Total</span>
                  <span>${calculatePrice(selectedCoach.hourly_rate, bookingData.duration)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsBookingOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmBooking}
                  disabled={isBooking || !bookingData.date || !bookingData.time}
                >
                  {isBooking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

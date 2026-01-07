"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Star,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface CoachRecommendation {
  coach_id: string;
  match_score: number;
  headline: string;
  reasons: string[];
  value_proposition: string;
  coach: {
    id: string;
    name: string;
    avatar_url: string | null;
    specialties: string[];
    hourly_rate: number;
    rating: number | null;
    bio: string | null;
  };
}

interface CoachRecommendationCardProps {
  recommendation: CoachRecommendation;
  stepId?: string;
  compact?: boolean;
}

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/open-peeps/svg";
const DICEBEAR_OPTIONS = "face=smile,smileBig,smileLOL,smileTeethGap,lovingGrin1,lovingGrin2,eatingHappy,cute,cheeky&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4";

const DURATION_OPTIONS = [
  { value: "30", label: "30 min", price: 0.5 },
  { value: "60", label: "1 hour", price: 1 },
  { value: "90", label: "1.5 hours", price: 1.5 },
  { value: "120", label: "2 hours", price: 2 },
];

export function CoachRecommendationCard({
  recommendation,
  stepId,
  compact = false,
}: CoachRecommendationCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    duration: "60",
    date: "",
    time: "",
  });

  const { coach, match_score, headline, reasons, value_proposition } = recommendation;

  const getAvatarUrl = () => {
    if (coach.avatar_url) return coach.avatar_url;
    return `${DICEBEAR_BASE}?seed=${encodeURIComponent(coach.name)}&${DICEBEAR_OPTIONS}`;
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50";
    if (score >= 70) return "text-blue-600 bg-blue-50";
    return "text-slate-600 bg-slate-50";
  };

  const calculatePrice = () => {
    const duration = DURATION_OPTIONS.find(d => d.value === bookingData.duration);
    return duration ? (coach.hourly_rate * duration.price).toFixed(0) : coach.hourly_rate;
  };

  const handleBook = async () => {
    if (!bookingData.date || !bookingData.time) {
      toast.error("Please select a date and time");
      return;
    }

    setIsBooking(true);

    try {
      const scheduledAt = new Date(`${bookingData.date}T${bookingData.time}`);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: coach.id,
          stepId: stepId || null,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: parseInt(bookingData.duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to book session");
      setIsBooking(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <>
      <Card className={`transition-all duration-200 ${isExpanded ? "shadow-md" : "hover:shadow-sm"}`}>
        <CardContent className={compact ? "p-3" : "p-4"}>
          {/* Main Content */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              <img
                src={getAvatarUrl()}
                alt={coach.name}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-900 truncate">{coach.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{headline}</p>
                </div>
                {/* Match Score */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getMatchColor(match_score)}`}>
                  <Sparkles className="h-3 w-3" />
                  {match_score}%
                </div>
              </div>

              {/* Rating & Price */}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                {coach.rating && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {coach.rating.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  ${coach.hourly_rate}/hr
                </span>
              </div>

              {/* Quick Reasons (always visible) */}
              <div className="flex flex-wrap gap-1 mt-2">
                {reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"
                  >
                    <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                    {reason.length > 35 ? reason.substring(0, 35) + "..." : reason}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
              {/* Value Proposition */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">How they can help:</p>
                <p className="text-sm text-slate-600">{value_proposition}</p>
              </div>

              {/* All Reasons */}
              {reasons.length > 2 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">Why they're a match:</p>
                  <ul className="space-y-1">
                    {reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specialties */}
              {coach.specialties?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {coach.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio Preview */}
              {coach.bio && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1">About:</p>
                  <p className="text-xs text-slate-500 line-clamp-3">{coach.bio}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setIsBookingOpen(true)}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Book Session
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push(`/coaches?highlight=${coach.id}`)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Book Session with {coach.name}</DialogTitle>
            <DialogDescription>
              Schedule a coaching session to prepare for your interview
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Coach Mini Preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                <img src={getAvatarUrl()} alt={coach.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-medium text-sm">{coach.name}</p>
                <p className="text-xs text-slate-500">{headline}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Session Duration</Label>
              <Select
                value={bookingData.duration}
                onValueChange={(value) => setBookingData({ ...bookingData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} - ${(coach.hourly_rate * option.price).toFixed(0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                min={minDate}
                value={bookingData.date}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={bookingData.time}
                onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
              />
            </div>

            {/* Price Summary */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-lg font-semibold">${calculatePrice()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsBookingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleBook}
                disabled={isBooking || !bookingData.date || !bookingData.time}
              >
                {isBooking ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

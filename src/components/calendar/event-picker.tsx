"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin, Search, Loader2, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink: string;
}

interface EventPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function EventPicker({ open, onOpenChange, onSelectEvent }: EventPickerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open]);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    setNotConnected(false);

    try {
      const response = await fetch("/api/calendar/events");
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NOT_CONNECTED" || data.code === "TOKEN_EXPIRED") {
          setNotConnected(true);
        } else {
          setError(data.error || "Failed to fetch events");
        }
        return;
      }

      setEvents(data.events || []);
    } catch (err) {
      setError("Failed to connect to calendar service");
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "";

    const date = new Date(start);
    const dateStr = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    if (event.start.dateTime) {
      const timeStr = date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${dateStr} at ${timeStr}`;
    }

    return dateStr;
  };

  const formatDuration = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return "";

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMins = Math.round(durationMs / 60000);

    if (durationMins < 60) return `${durationMins} min`;
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const filteredEvents = events.filter((event) =>
    event.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const dateStr = event.start.dateTime || event.start.date || "";
    const date = new Date(dateStr).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Import from Calendar
          </DialogTitle>
          <DialogDescription>
            Select an event to link to this interview step
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : notConnected ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900">Calendar not connected</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Connect your Google Calendar to import events
            </p>
            <Link href="/settings?tab=integrations">
              <Button className="gap-2">
                <Settings className="h-4 w-4" />
                Go to Settings
              </Button>
            </Link>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="font-medium text-slate-900">Error loading events</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchEvents}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="font-medium text-slate-900">No events found</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {searchQuery
                      ? "Try a different search term"
                      : "No upcoming events in the next 30 days"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                    <div key={date}>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">
                        {new Date(date).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>
                      <div className="space-y-2">
                        {dateEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => {
                              onSelectEvent(event);
                              onOpenChange(false);
                            }}
                            className="w-full text-left p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-slate-900 line-clamp-1">
                              {event.summary || "Untitled Event"}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatEventTime(event)}
                              </span>
                              {formatDuration(event) && (
                                <span>{formatDuration(event)}</span>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-slate-400">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">{event.location}</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

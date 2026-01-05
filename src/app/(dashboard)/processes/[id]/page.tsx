"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Building2,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Phone,
  Code,
  Users,
  MapPin,
  Gift,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { EventPicker } from "@/components/calendar/event-picker";

interface RecruitmentProcess {
  id: string;
  user_id: string;
  company_name: string;
  company_website: string | null;
  job_title: string;
  job_url: string | null;
  status: 'upcoming' | 'in_progress' | 'completed' | 'rejected' | 'offer_received' | 'accepted';
  applied_date: string | null;
  source: 'linkedin' | 'referral' | 'direct' | 'other';
  notes: string | null;
  created_at: string;
}

interface ProcessStep {
  id: string;
  process_id: string;
  step_number: number;
  step_type: 'phone_screen' | 'technical' | 'behavioral' | 'onsite' | 'offer' | 'other';
  scheduled_date: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  objectives: string[];
  notes: string | null;
  outcome: string | null;
  google_calendar_event_id: string | null;
  google_calendar_event_summary: string | null;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

interface StepContact {
  id: string;
  step_id: string;
  name: string;
  role: string | null;
  linkedin_url: string | null;
  email: string | null;
  notes: string | null;
  photo_url: string | null;
}

const STEP_TYPE_OPTIONS = [
  { value: "phone_screen", label: "Phone Screen", icon: Phone },
  { value: "technical", label: "Technical", icon: Code },
  { value: "behavioral", label: "Behavioral", icon: Users },
  { value: "onsite", label: "Onsite", icon: MapPin },
  { value: "offer", label: "Offer", icon: Gift },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const STEP_STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", color: "bg-blue-100 text-blue-700", icon: Clock },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
];

const extractDomain = (input: string | null): string | null => {
  if (!input) return null;
  try {
    if (!input.includes('/') && input.includes('.')) {
      return input.toLowerCase().replace(/^www\./, '');
    }
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const getCompanyLogoUrl = (website: string | null): string | null => {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const processId = params.id as string;
  const supabase = createClient();

  const [process, setProcess] = useState<RecruitmentProcess | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [contacts, setContacts] = useState<Record<string, StepContact[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [editingContact, setEditingContact] = useState<StepContact | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [eventPickerStepId, setEventPickerStepId] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);

  const [stepFormData, setStepFormData] = useState({
    step_type: "phone_screen" as ProcessStep["step_type"],
    scheduled_date: "",
    scheduled_time: "",
    status: "upcoming" as ProcessStep["status"],
    objectives: "",
    notes: "",
    outcome: "",
  });

  const [contactFormData, setContactFormData] = useState({
    name: "",
    role: "",
    linkedin_url: "",
    email: "",
    notes: "",
    photo_url: "",
  });

  useEffect(() => {
    fetchProcess();
    fetchSteps();
    checkCalendarConnection();
  }, [processId]);

  const checkCalendarConnection = async () => {
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .single();
    setIsCalendarConnected(!!data);
  };

  const fetchProcess = async () => {
    const { data, error } = await supabase
      .from("recruitment_processes")
      .select("*")
      .eq("id", processId)
      .single();

    if (error || !data) {
      toast.error("Process not found");
      router.push("/processes");
      return;
    }

    setProcess(data);
    setIsLoading(false);
  };

  const fetchSteps = async () => {
    const { data, error } = await supabase
      .from("process_steps")
      .select("*")
      .eq("process_id", processId)
      .order("step_number", { ascending: true });

    if (!error && data) {
      setSteps(data);
      // Fetch contacts for each step
      data.forEach(step => fetchContacts(step.id));
    }
  };

  const fetchContacts = async (stepId: string) => {
    const { data, error } = await supabase
      .from("step_contacts")
      .select("*")
      .eq("step_id", stepId);

    if (!error && data) {
      setContacts(prev => ({ ...prev, [stepId]: data }));
    }
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine date and time into proper ISO string with timezone
    let scheduledDate = null;
    if (stepFormData.scheduled_date) {
      const [year, month, day] = stepFormData.scheduled_date.split('-').map(Number);
      const [hours, minutes] = stepFormData.scheduled_time
        ? stepFormData.scheduled_time.split(':').map(Number)
        : [0, 0];
      const localDate = new Date(year, month - 1, day, hours, minutes);
      scheduledDate = localDate.toISOString();
    }

    const stepData = {
      process_id: processId,
      step_number: editingStep?.step_number ?? steps.length + 1,
      step_type: stepFormData.step_type,
      scheduled_date: scheduledDate,
      status: stepFormData.status,
      objectives: stepFormData.objectives ? stepFormData.objectives.split("\n").filter(o => o.trim()) : [],
      notes: stepFormData.notes || null,
      outcome: stepFormData.outcome || null,
    };

    if (editingStep) {
      const { error } = await supabase
        .from("process_steps")
        .update(stepData)
        .eq("id", editingStep.id);

      if (error) {
        toast.error("Failed to update step");
        return;
      }
      toast.success("Step updated");
    } else {
      const { error } = await supabase.from("process_steps").insert(stepData);

      if (error) {
        toast.error("Failed to add step");
        return;
      }
      toast.success("Step added");
    }

    setIsStepDialogOpen(false);
    resetStepForm();
    fetchSteps();
  };

  const handleLinkedInUrlChange = async (url: string) => {
    // Auto-parse if it looks like a valid LinkedIn URL
    const linkedinUrlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
    const isValidUrl = linkedinUrlPattern.test(url.trim());

    if (isValidUrl) {
      try {
        const response = await fetch(`/api/linkedin/profile?url=${encodeURIComponent(url.trim())}`);
        const data = await response.json();

        if (response.ok && data.name) {
          // Update both URL and name together
          setContactFormData(prev => ({
            ...prev,
            linkedin_url: url,
            name: prev.name || data.name,
          }));
          return;
        }
      } catch {
        // Fall through to just update URL
      }
    }

    // Just update the URL if not valid or fetch failed
    setContactFormData(prev => ({ ...prev, linkedin_url: url }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStepId) return;

    const contactData = {
      step_id: selectedStepId,
      name: contactFormData.name,
      role: contactFormData.role || null,
      linkedin_url: contactFormData.linkedin_url || null,
      email: contactFormData.email || null,
      notes: contactFormData.notes || null,
      photo_url: contactFormData.photo_url || null,
    };

    if (editingContact) {
      const { error } = await supabase
        .from("step_contacts")
        .update(contactData)
        .eq("id", editingContact.id);

      if (error) {
        toast.error("Failed to update contact");
        return;
      }
      toast.success("Contact updated");
    } else {
      const { error } = await supabase.from("step_contacts").insert(contactData);

      if (error) {
        toast.error("Failed to add contact");
        return;
      }
      toast.success("Contact added");
    }

    setIsContactDialogOpen(false);
    resetContactForm();
    fetchContacts(selectedStepId);
  };

  const handleEditStep = (step: ProcessStep) => {
    setEditingStep(step);
    let dateStr = "";
    let timeStr = "";

    if (step.scheduled_date) {
      const dateTime = new Date(step.scheduled_date);
      // Use local timezone for both date and time
      const year = dateTime.getFullYear();
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const day = String(dateTime.getDate()).padStart(2, '0');
      const hours = String(dateTime.getHours()).padStart(2, '0');
      const minutes = String(dateTime.getMinutes()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
      timeStr = `${hours}:${minutes}`;
    }

    setStepFormData({
      step_type: step.step_type,
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      status: step.status,
      objectives: step.objectives?.join("\n") || "",
      notes: step.notes || "",
      outcome: step.outcome || "",
    });
    setIsStepDialogOpen(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this step?")) return;

    const { error } = await supabase.from("process_steps").delete().eq("id", stepId);

    if (error) {
      toast.error("Failed to delete step");
      return;
    }

    toast.success("Step deleted");
    fetchSteps();
  };

  const handleEditContact = (contact: StepContact, stepId: string) => {
    setEditingContact(contact);
    setSelectedStepId(stepId);
    setContactFormData({
      name: contact.name,
      role: contact.role || "",
      linkedin_url: contact.linkedin_url || "",
      email: contact.email || "",
      notes: contact.notes || "",
      photo_url: contact.photo_url || "",
    });
    setIsContactDialogOpen(true);
  };

  const handleDeleteContact = async (contactId: string, stepId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    const { error } = await supabase.from("step_contacts").delete().eq("id", contactId);

    if (error) {
      toast.error("Failed to delete contact");
      return;
    }

    toast.success("Contact deleted");
    fetchContacts(stepId);
  };

  const handleAddContact = (stepId: string) => {
    setSelectedStepId(stepId);
    setIsContactDialogOpen(true);
  };

  const handleImportFromCalendar = (stepId: string) => {
    setEventPickerStepId(stepId);
    setIsEventPickerOpen(true);
  };

  const handleCalendarEventSelect = async (event: CalendarEvent) => {
    const scheduledDate = event.start.dateTime || event.start.date;

    if (isImportMode) {
      // Create a new step from the calendar event
      const stepData = {
        process_id: processId,
        step_number: steps.length + 1,
        step_type: "other" as const,
        scheduled_date: scheduledDate,
        status: "upcoming" as const,
        objectives: [],
        notes: event.summary || null,
        google_calendar_event_id: event.id,
        google_calendar_event_summary: event.summary,
      };

      const { error } = await supabase.from("process_steps").insert(stepData);

      if (error) {
        toast.error("Failed to create step from calendar");
        return;
      }

      toast.success("Step created from calendar event!");
      setIsImportMode(false);
    } else if (eventPickerStepId) {
      // Link to existing step
      const { error } = await supabase
        .from("process_steps")
        .update({
          scheduled_date: scheduledDate,
          google_calendar_event_id: event.id,
          google_calendar_event_summary: event.summary,
        })
        .eq("id", eventPickerStepId);

      if (error) {
        toast.error("Failed to link calendar event");
        return;
      }

      toast.success("Calendar event linked!");
      setEventPickerStepId(null);
    }

    fetchSteps();
  };

  const handleUnlinkCalendarEvent = async (stepId: string) => {
    const { error } = await supabase
      .from("process_steps")
      .update({
        google_calendar_event_id: null,
        google_calendar_event_summary: null,
      })
      .eq("id", stepId);

    if (error) {
      toast.error("Failed to unlink calendar event");
      return;
    }

    toast.success("Calendar event unlinked");
    fetchSteps();
  };

  const resetStepForm = () => {
    setStepFormData({
      step_type: "phone_screen",
      scheduled_date: "",
      scheduled_time: "",
      status: "upcoming",
      objectives: "",
      notes: "",
      outcome: "",
    });
    setEditingStep(null);
  };

  const resetContactForm = () => {
    setContactFormData({
      name: "",
      role: "",
      linkedin_url: "",
      email: "",
      notes: "",
      photo_url: "",
    });
    setEditingContact(null);
    setSelectedStepId(null);
  };

  const getStepIcon = (type: ProcessStep["step_type"]) => {
    const option = STEP_TYPE_OPTIONS.find(o => o.value === type);
    return option?.icon || MoreHorizontal;
  };

  const getStatusBadge = (status: ProcessStep["status"]) => {
    const option = STEP_STATUS_OPTIONS.find(o => o.value === status);
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge>{status}</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!process) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/processes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className={`h-12 w-12 rounded-lg border shadow-sm flex items-center justify-center overflow-hidden ${
            process.company_website ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200"
          }`}>
            {process.company_website && getCompanyLogoUrl(process.company_website) ? (
              <img
                src={getCompanyLogoUrl(process.company_website)!}
                alt={`${process.company_name} logo`}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="h-6 w-6 text-slate-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{process.company_name}</h1>
              {process.job_url && (
                <a
                  href={process.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>
            <p className="text-slate-600">{process.job_title}</p>
            {process.applied_date && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                Applied {new Date(process.applied_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notes Card */}
      {process.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">{process.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Steps Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Interview Steps</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setIsImportMode(true);
                setIsEventPickerOpen(true);
              }}
            >
              <Calendar className="h-4 w-4" />
              Import from Calendar
            </Button>
            <Dialog open={isStepDialogOpen} onOpenChange={(open) => {
              setIsStepDialogOpen(open);
              if (!open) resetStepForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Step
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingStep ? "Edit Step" : "Add Interview Step"}
                </DialogTitle>
                <DialogDescription>
                  Track each stage of your interview process
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStepSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Step Type</Label>
                    <Select
                      value={stepFormData.step_type}
                      onValueChange={(value) =>
                        setStepFormData({ ...stepFormData, step_type: value as ProcessStep["step_type"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={stepFormData.status}
                      onValueChange={(value) =>
                        setStepFormData({ ...stepFormData, status: value as ProcessStep["status"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={stepFormData.scheduled_date}
                      onChange={(e) =>
                        setStepFormData({ ...stepFormData, scheduled_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={stepFormData.scheduled_time}
                      onChange={(e) =>
                        setStepFormData({ ...stepFormData, scheduled_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Objectives (one per line)</Label>
                  <Textarea
                    value={stepFormData.objectives}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, objectives: e.target.value })
                    }
                    placeholder="e.g., Discuss technical experience&#10;Ask about team culture&#10;Salary expectations"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={stepFormData.notes}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, notes: e.target.value })
                    }
                    placeholder="Any preparation notes..."
                    rows={2}
                  />
                </div>

                {(editingStep?.status === "completed" || stepFormData.status === "completed") && (
                  <div className="space-y-2">
                    <Label>Outcome</Label>
                    <Textarea
                      value={stepFormData.outcome}
                      onChange={(e) =>
                        setStepFormData({ ...stepFormData, outcome: e.target.value })
                      }
                      placeholder="How did it go?"
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsStepDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStep ? "Update" : "Add"} Step
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {steps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No steps yet</h3>
              <p className="text-slate-500 mt-1 mb-4">
                Add interview steps to track your progress
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportMode(true);
                    setIsEventPickerOpen(true);
                  }}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Import from Calendar
                </Button>
                <Button onClick={() => setIsStepDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Step
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {steps.map((step, index) => {
                const StepIcon = getStepIcon(step.step_type);
                const stepContacts = contacts[step.id] || [];

                return (
                  <div key={step.id} className="relative pl-14">
                    {/* Timeline dot */}
                    <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : step.status === "cancelled"
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      <StepIcon className="h-3 w-3" />
                    </div>

                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-slate-900">
                                Step {step.step_number}: {STEP_TYPE_OPTIONS.find(o => o.value === step.step_type)?.label}
                              </h3>
                              {getStatusBadge(step.status)}
                            </div>

                            {step.scheduled_date && (
                              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(step.scheduled_date).toLocaleString()}
                              </p>
                            )}

                            {step.google_calendar_event_id && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
                                  <Calendar className="h-3 w-3" />
                                  {step.google_calendar_event_summary || "Calendar Event"}
                                </Badge>
                                <button
                                  onClick={() => handleUnlinkCalendarEvent(step.id)}
                                  className="text-xs text-slate-400 hover:text-red-500"
                                >
                                  Unlink
                                </button>
                              </div>
                            )}

                            {step.objectives && step.objectives.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-slate-700">Objectives:</p>
                                <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                                  {step.objectives.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {step.notes && (
                              <p className="text-sm text-slate-500 mt-2 italic">{step.notes}</p>
                            )}

                            {step.outcome && (
                              <div className="mt-3 p-2 bg-slate-50 rounded">
                                <p className="text-sm font-medium text-slate-700">Outcome:</p>
                                <p className="text-sm text-slate-600">{step.outcome}</p>
                              </div>
                            )}

                            {/* Contacts Section */}
                            <div className="mt-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Users className="h-4 w-4" />
                                <span>{stepContacts.length} contact{stepContacts.length !== 1 ? 's' : ''}</span>
                                <button
                                  onClick={() => handleAddContact(step.id)}
                                  className="h-5 w-5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors"
                                  title="Add contact"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              {stepContacts.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {stepContacts.map(contact => (
                                    <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        {contact.photo_url ? (
                                          <img
                                            src={contact.photo_url}
                                            alt={contact.name}
                                            className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                                          />
                                        ) : (
                                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                                            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                                          {contact.role && (
                                            <p className="text-xs text-slate-500">{contact.role}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                          {contact.email && (
                                            <a href={`mailto:${contact.email}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                                              <Mail className="h-4 w-4" />
                                            </a>
                                          )}
                                          {contact.linkedin_url && (
                                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                                              <Linkedin className="h-4 w-4" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditContact(contact, step.id)}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteContact(contact.id, step.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleImportFromCalendar(step.id)}
                              title="Import from Calendar"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStep(step)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStep(step.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={(open) => {
        setIsContactDialogOpen(open);
        if (!open) resetContactForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              Paste a LinkedIn URL to auto-fill contact details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            {/* LinkedIn URL - auto-fills name when valid URL is pasted */}
            <div className="space-y-2">
              <Label>LinkedIn URL <span className="text-slate-400 font-normal">(optional)</span></Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={contactFormData.linkedin_url}
                  onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                  placeholder="linkedin.com/in/john-smith"
                  className="pl-9"
                />
              </div>
              {!contactFormData.linkedin_url && (
                <p className="text-xs text-slate-500">
                  Paste a LinkedIn URL to auto-fill the name
                </p>
              )}
            </div>

            {/* Show extracted info preview */}
            {contactFormData.linkedin_url && contactFormData.name && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {contactFormData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{contactFormData.name}</p>
                  <p className="text-xs text-green-600">Name extracted from LinkedIn URL</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                value={contactFormData.name}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, name: e.target.value })
                }
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={contactFormData.role}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, role: e.target.value })
                }
                placeholder="Engineering Manager"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={contactFormData.email}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, email: e.target.value })
                }
                placeholder="john@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={contactFormData.notes}
                onChange={(e) =>
                  setContactFormData({ ...contactFormData, notes: e.target.value })
                }
                placeholder="Any notes about this person..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingContact ? "Update" : "Add"} Contact
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calendar Event Picker */}
      <EventPicker
        open={isEventPickerOpen}
        onOpenChange={setIsEventPickerOpen}
        onSelectEvent={handleCalendarEventSelect}
      />
    </div>
  );
}

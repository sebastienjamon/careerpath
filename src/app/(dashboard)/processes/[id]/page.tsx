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
  Video,
  FileText,
  Upload,
  X,
  Sparkles,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
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
  description: string | null;
  notes: string | null;
  outcome: string | null;
  meeting_url: string | null;
  ai_recommendations: string | null;
  ai_recommendations_updated_at: string | null;
  preparation_notes: string | null;
  google_calendar_event_id: string | null;
  google_calendar_event_summary: string | null;
  created_at: string;
}

interface StepAttachment {
  id: string;
  step_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
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
  network_connection_id: string | null;
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

// Get contact avatar URL - prioritize photo_url, then email via unavatar, then DiceBear
const getContactAvatarUrl = (contact: { name: string; email?: string | null; photo_url?: string | null }, useFallback = false): string => {
  if (!useFallback) {
    if (contact.photo_url) return contact.photo_url;
    if (contact.email) return `https://unavatar.io/${encodeURIComponent(contact.email)}?fallback=false`;
  }
  // DiceBear open-peeps - only smiling faces
  return `https://api.dicebear.com/9.x/open-peeps/svg?seed=${encodeURIComponent(contact.name)}&face=smile,smileBig,smileLOL,smileTeethGap,lovingGrin1,lovingGrin2,eatingHappy,cute,cheeky&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4`;
};

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const processId = params.id as string;
  const supabase = createClient();

  const [process, setProcess] = useState<RecruitmentProcess | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [contacts, setContacts] = useState<Record<string, StepContact[]>>({});
  const [attachments, setAttachments] = useState<Record<string, StepAttachment[]>>({});
  const [networkConnections, setNetworkConnections] = useState<Array<{
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    linkedin_url: string | null;
    avatar_url: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [editingContact, setEditingContact] = useState<StepContact | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedNetworkContactId, setSelectedNetworkContactId] = useState<string | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [eventPickerStepId, setEventPickerStepId] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [stepFormData, setStepFormData] = useState({
    step_type: "phone_screen" as ProcessStep["step_type"],
    scheduled_date: "",
    scheduled_time: "",
    status: "upcoming" as ProcessStep["status"],
    description: "",
    notes: "",
    outcome: "",
    meeting_url: "",
  });
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState<string | null>(null);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [notesPreviewMode, setNotesPreviewMode] = useState<Record<string, boolean>>({});

  const [contactFormData, setContactFormData] = useState({
    name: "",
    role: "",
    linkedin_url: "",
    email: "",
    notes: "",
    photo_url: "",
  });
  const [contactAvatarErrors, setContactAvatarErrors] = useState<Record<string, boolean>>({});
  const [formAvatarError, setFormAvatarError] = useState(false);

  useEffect(() => {
    fetchProcess();
    fetchSteps();
    fetchNetworkConnections();
    checkCalendarConnection();
  }, [processId]);

  const fetchNetworkConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("network_connections")
      .select("id, name, email, role, linkedin_url, avatar_url")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (!error && data) {
      setNetworkConnections(data);
    }
  };

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
      // Fetch contacts and attachments for each step
      data.forEach(step => {
        fetchContacts(step.id);
        fetchAttachments(step.id);
      });
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

  const fetchAttachments = async (stepId: string) => {
    const { data, error } = await supabase
      .from("step_attachments")
      .select("*")
      .eq("step_id", stepId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAttachments(prev => ({ ...prev, [stepId]: data }));
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
      description: stepFormData.description || null,
      notes: stepFormData.notes || null,
      outcome: stepFormData.outcome || null,
      meeting_url: stepFormData.meeting_url || null,
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

    // For editing, we update the notes only
    if (editingContact) {
      const { error } = await supabase
        .from("step_contacts")
        .update({ notes: contactFormData.notes || null })
        .eq("id", editingContact.id);

      if (error) {
        toast.error("Failed to update contact notes");
        return;
      }
      toast.success("Contact notes updated");
      setIsContactDialogOpen(false);
      resetContactForm();
      fetchContacts(selectedStepId);
      return;
    }

    // For new contacts, we need a selected network contact
    if (!selectedNetworkContactId) {
      toast.error("Please select a contact from your network");
      return;
    }

    // Get the network contact details
    const networkContact = networkConnections.find(c => c.id === selectedNetworkContactId);
    if (!networkContact) {
      toast.error("Contact not found");
      return;
    }

    // Check if this contact is already added to this step
    const existingContacts = contacts[selectedStepId] || [];
    if (existingContacts.some(c => c.network_connection_id === selectedNetworkContactId)) {
      toast.error("This contact is already added to this step");
      return;
    }

    // Create step_contact linked to the network connection
    const contactData = {
      step_id: selectedStepId,
      name: networkContact.name,
      role: networkContact.role || null,
      linkedin_url: networkContact.linkedin_url || null,
      email: networkContact.email || null,
      notes: contactFormData.notes || null,
      network_connection_id: selectedNetworkContactId,
    };

    const { error } = await supabase.from("step_contacts").insert(contactData);

    if (error) {
      console.error("Failed to add contact:", error);
      toast.error("Failed to add contact to step");
      return;
    }

    toast.success("Contact added to step");
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
      description: step.description || "",
      notes: step.notes || "",
      outcome: step.outcome || "",
      meeting_url: step.meeting_url || "",
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
    setFormAvatarError(false);
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
      description: "",
      notes: "",
      outcome: "",
      meeting_url: "",
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
    setSelectedNetworkContactId(null);
    setContactSearchQuery("");
    setFormAvatarError(false);
    setEditingContact(null);
    setSelectedStepId(null);
    setFormAvatarError(false);
  };

  const handleFileUpload = async (stepId: string, file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("stepId", stepId);

    try {
      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to upload file");
        return;
      }

      toast.success("File uploaded");
      fetchAttachments(stepId);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: StepAttachment) => {
    if (!confirm("Delete this file?")) return;

    const { error } = await supabase
      .from("step_attachments")
      .delete()
      .eq("id", attachment.id);

    if (error) {
      toast.error("Failed to delete file");
      return;
    }

    toast.success("File deleted");
    fetchAttachments(attachment.step_id);
  };

  const handleGenerateRecommendations = async (stepId: string) => {
    setIsGeneratingRecommendations(stepId);
    try {
      const response = await fetch(`/api/steps/${stepId}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to generate recommendations");
        return;
      }

      toast.success("AI recommendations generated");
      fetchSteps();
    } catch {
      toast.error("Failed to generate recommendations");
    } finally {
      setIsGeneratingRecommendations(null);
    }
  };

  const handleSavePreparationNotes = async (stepId: string, notes: string) => {
    const { error } = await supabase
      .from("process_steps")
      .update({ preparation_notes: notes || null })
      .eq("id", stepId);

    if (error) {
      toast.error("Failed to save notes");
      return;
    }

    // Update local state
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, preparation_notes: notes || null } : s
    ));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("word") || fileType.includes("document")) return "DOC";
    if (fileType.includes("sheet") || fileType.includes("excel")) return "XLS";
    if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PPT";
    if (fileType.includes("image")) return "IMG";
    return "FILE";
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
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/processes">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg border shadow-sm flex items-center justify-center overflow-hidden ${
            process.company_website ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200"
          }`}>
            {process.company_website && getCompanyLogoUrl(process.company_website) ? (
              <img
                src={getCompanyLogoUrl(process.company_website)!}
                alt={`${process.company_name} logo`}
                className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{process.company_name}</h1>
              {process.job_url && (
                <a
                  href={process.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-600 truncate">{process.job_title}</p>
            {process.applied_date && (
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <Label>Meeting Link</Label>
                  <div className="relative">
                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={stepFormData.meeting_url}
                      onChange={(e) =>
                        setStepFormData({ ...stepFormData, meeting_url: e.target.value })
                      }
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interview Purpose</Label>
                  <Textarea
                    value={stepFormData.description}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, description: e.target.value })
                    }
                    placeholder="e.g., This interview will offer valuable insights into the role and team, and provide you with opportunities to ask questions."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={stepFormData.notes}
                    onChange={(e) =>
                      setStepFormData({ ...stepFormData, notes: e.target.value })
                    }
                    placeholder="Any notes about this interview step..."
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
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-3 sm:space-y-4">
              {steps.map((step, index) => {
                const StepIcon = getStepIcon(step.step_type);
                const stepContacts = contacts[step.id] || [];
                const stepAttachments = attachments[step.id] || [];

                return (
                  <div key={step.id} className="relative pl-10 sm:pl-14">
                    {/* Timeline dot */}
                    <div className={`absolute left-1 sm:left-3 w-6 h-6 rounded-full flex items-center justify-center ${
                      step.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : step.status === "cancelled"
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}>
                      <StepIcon className="h-3 w-3" />
                    </div>

                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Clickable Header */}
                            <button
                              onClick={() => setExpandedSteps(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                              className="w-full text-left"
                            >
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-slate-900">
                                  Step {step.step_number}: {STEP_TYPE_OPTIONS.find(o => o.value === step.step_type)?.label}
                                </h3>
                                {getStatusBadge(step.status)}
                                {expandedSteps[step.id] ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </div>

                              {step.scheduled_date && (
                                <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(step.scheduled_date).toLocaleString()}
                                </p>
                              )}
                            </button>

                            {/* Collapsible Content */}
                            {expandedSteps[step.id] && (
                              <div className="mt-3">

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

                            {step.meeting_url && (
                              <a
                                href={step.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Video className="h-4 w-4" />
                                Join Meeting
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}

                            {/* Interview Purpose */}
                            {step.description && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-sm text-blue-800">{step.description}</p>
                              </div>
                            )}

                            {step.notes && (
                              <p className="text-sm text-slate-500 mt-3 italic">{step.notes}</p>
                            )}

                            {step.outcome && (
                              <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                                <p className="text-sm font-medium text-slate-700 mb-1">Outcome:</p>
                                <p className="text-sm text-slate-600">{step.outcome}</p>
                              </div>
                            )}

                            {/* AI Recommendations Section */}
                            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-purple-600" />
                                  <span className="text-sm font-semibold text-purple-900">AI Recommendations</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateRecommendations(step.id)}
                                  disabled={isGeneratingRecommendations === step.id}
                                  className="gap-1.5 text-xs h-7 bg-white hover:bg-purple-50 border-purple-200"
                                >
                                  {isGeneratingRecommendations === step.id ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : step.ai_recommendations ? (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Refresh
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      Generate
                                    </>
                                  )}
                                </Button>
                              </div>
                              {step.ai_recommendations ? (
                                <div className="space-y-2">
                                  <div className={`text-sm text-purple-900 prose prose-sm prose-purple max-w-none [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ul>li]:text-purple-900 [&>ul>li>ul]:list-disc [&>ul>li>ul]:pl-4 [&>ul>li>ul]:mt-1 [&>p]:mb-2 [&>strong]:font-semibold ${!expandedRecommendations[step.id] ? "max-h-24 overflow-hidden relative" : ""}`}>
                                    <ReactMarkdown>{step.ai_recommendations}</ReactMarkdown>
                                    {!expandedRecommendations[step.id] && (
                                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-purple-50 to-transparent" />
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setExpandedRecommendations(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                                  >
                                    {expandedRecommendations[step.id] ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        Show more
                                      </>
                                    )}
                                  </button>
                                  {step.ai_recommendations_updated_at && (
                                    <p className="text-xs text-purple-500">
                                      Last updated: {new Date(step.ai_recommendations_updated_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-purple-600 italic">
                                  Click &quot;Generate&quot; to get AI-powered recommendations on what to prepare for this interview step.
                                </p>
                              )}
                            </div>

                            {/* Preparation Notes Section */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">Your Preparation Notes</span>
                                  <span className="text-xs text-slate-400">(Markdown supported)</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setNotesPreviewMode(prev => ({ ...prev, [step.id]: false }))}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      !notesPreviewMode[step.id]
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    <Pencil className="h-3 w-3 inline mr-1" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNotesPreviewMode(prev => ({ ...prev, [step.id]: true }))}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      notesPreviewMode[step.id]
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    <Eye className="h-3 w-3 inline mr-1" />
                                    Preview
                                  </button>
                                </div>
                              </div>
                              {notesPreviewMode[step.id] ? (
                                <div className="min-h-[120px] p-3 border rounded-md bg-white prose prose-sm prose-slate max-w-none">
                                  {step.preparation_notes ? (
                                    <ReactMarkdown>{step.preparation_notes}</ReactMarkdown>
                                  ) : (
                                    <p className="text-slate-400 italic">No notes yet. Switch to Edit to add some.</p>
                                  )}
                                </div>
                              ) : (
                                <Textarea
                                  value={step.preparation_notes || ""}
                                  onChange={(e) => {
                                    // Update local state immediately for responsive UI
                                    setSteps(prev => prev.map(s =>
                                      s.id === step.id ? { ...s, preparation_notes: e.target.value } : s
                                    ));
                                  }}
                                  onBlur={(e) => handleSavePreparationNotes(step.id, e.target.value)}
                                  placeholder="Take notes here to prepare for this interview...&#10;&#10;**Supports Markdown:**&#10;- Use **bold** and *italic*&#10;- Create bullet lists&#10;- Add [links](url)"
                                  className="min-h-[120px] resize-y font-mono text-sm"
                                />
                              )}
                            </div>

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
                                  {stepContacts.map(contact => {
                                    const hasCustomAvatar = contact.photo_url || contact.email;
                                    const avatarUrl = contactAvatarErrors[contact.id]
                                      ? getContactAvatarUrl(contact, true)
                                      : getContactAvatarUrl(contact);
                                    return (
                                      <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                            <img
                                              src={avatarUrl}
                                              alt={contact.name}
                                              className="h-full w-full object-cover"
                                              onError={() => {
                                                if (hasCustomAvatar && !contactAvatarErrors[contact.id]) {
                                                  setContactAvatarErrors(prev => ({ ...prev, [contact.id]: true }));
                                                }
                                              }}
                                            />
                                          </div>
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
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Attachments Section */}
                            <div className="mt-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FileText className="h-4 w-4" />
                                <span>{stepAttachments.length} file{stepAttachments.length !== 1 ? 's' : ''}</span>
                                <label className="h-5 w-5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer">
                                  <Upload className="h-3 w-3" />
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(step.id, file);
                                      e.target.value = '';
                                    }}
                                    disabled={isUploading}
                                  />
                                </label>
                              </div>

                              {stepAttachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {stepAttachments.map(attachment => (
                                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                      <a
                                        href={attachment.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 flex-1 hover:text-blue-600 transition-colors"
                                      >
                                        <div className="h-8 w-8 rounded bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                                          {getFileIcon(attachment.file_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-900 truncate">{attachment.file_name}</p>
                                          <p className="text-xs text-slate-500">{formatFileSize(attachment.file_size)}</p>
                                        </div>
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteAttachment(attachment)}
                                        className="text-slate-400 hover:text-red-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                              </div>
                            )}
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
              {editingContact ? "Edit Contact Notes" : "Add Contact from Network"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update notes for this contact"
                : networkConnections.length === 0
                  ? "Add contacts in the Network tab first"
                  : "Select a contact from your network to add to this step"
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            {editingContact ? (
              /* Editing mode - just show the contact info and notes */
              <>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={getContactAvatarUrl({ name: editingContact.name, email: editingContact.email, photo_url: editingContact.photo_url })}
                      alt={editingContact.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getContactAvatarUrl({ name: editingContact.name }, true);
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{editingContact.name}</p>
                    {editingContact.role && (
                      <p className="text-sm text-slate-500 truncate">{editingContact.role}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes for this step</Label>
                  <Textarea
                    value={contactFormData.notes}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, notes: e.target.value })
                    }
                    placeholder="Any notes about this contact for this interview step..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              /* Add mode - show network contact selector */
              <>
                {networkConnections.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-4">No contacts in your network yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsContactDialogOpen(false);
                        router.push("/network");
                      }}
                    >
                      Go to Network
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Input
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        className="pl-9"
                      />
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>

                    {/* Contact List */}
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                      {networkConnections
                        .filter(c =>
                          c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          (c.role && c.role.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
                          (c.email && c.email.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                        )
                        .map(contact => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => setSelectedNetworkContactId(contact.id)}
                            className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors ${
                              selectedNetworkContactId === contact.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                            }`}
                          >
                            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img
                                src={getContactAvatarUrl({ name: contact.name, email: contact.email, photo_url: null })}
                                alt={contact.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getContactAvatarUrl({ name: contact.name }, true);
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm">{contact.name}</p>
                              {contact.role && (
                                <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                              )}
                            </div>
                            {selectedNetworkContactId === contact.id && (
                              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      {networkConnections.filter(c =>
                        c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                        (c.role && c.role.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
                        (c.email && c.email.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                      ).length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-500">
                          No contacts found
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes for this step <span className="text-slate-400 font-normal">(optional)</span></Label>
                      <Textarea
                        value={contactFormData.notes}
                        onChange={(e) =>
                          setContactFormData({ ...contactFormData, notes: e.target.value })
                        }
                        placeholder="Any notes about this contact for this interview step..."
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>
                Cancel
              </Button>
              {(editingContact || networkConnections.length > 0) && (
                <Button type="submit" disabled={!editingContact && !selectedNetworkContactId}>
                  {editingContact ? "Update Notes" : "Add Contact"}
                </Button>
              )}
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

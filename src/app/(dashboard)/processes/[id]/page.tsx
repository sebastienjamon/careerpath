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
  Link2,
  Heart,
  UserPlus,
  GraduationCap,
  Loader2,
  ClipboardCheck,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { EventPicker } from "@/components/calendar/event-picker";
import { CoachRecommendationCard } from "@/components/coaches/coach-recommendation-card";

interface NetworkConnection {
  id: string;
  name: string;
  avatar_url: string | null;
  company: string | null;
  role: string | null;
}

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
  referral_contact_id: string | null;
  referral_contact?: NetworkConnection | null;
  notes: string | null;
  created_at: string;
}

interface ProcessStep {
  id: string;
  process_id: string;
  step_number: number;
  step_type: 'phone_screen' | 'technical' | 'behavioral' | 'onsite' | 'offer' | 'other' | 'output';
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
  went_well: string[];
  to_improve: string[];
  linked_step_id: string | null;
  created_at: string;
}

interface StepAttachment {
  id: string;
  step_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  link_url: string | null;
  link_type: string | null;
  created_at: string;
}

// Detect link type from URL
const detectLinkType = (url: string): { type: string; name: string } => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('docs.google.com/document')) {
    return { type: 'google_doc', name: 'Google Doc' };
  } else if (lowerUrl.includes('docs.google.com/spreadsheets')) {
    return { type: 'google_sheet', name: 'Google Sheet' };
  } else if (lowerUrl.includes('docs.google.com/presentation')) {
    return { type: 'google_slide', name: 'Google Slides' };
  } else if (lowerUrl.includes('drive.google.com')) {
    return { type: 'google_drive', name: 'Google Drive' };
  } else if (lowerUrl.includes('dropbox.com')) {
    return { type: 'dropbox', name: 'Dropbox' };
  } else if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) {
    return { type: 'notion', name: 'Notion' };
  } else if (lowerUrl.includes('figma.com')) {
    return { type: 'figma', name: 'Figma' };
  }
  return { type: 'other', name: 'Link' };
};

// Get icon color for link type
const getLinkTypeColor = (type: string | null): string => {
  switch (type) {
    case 'google_doc': return 'text-blue-600';
    case 'google_sheet': return 'text-green-600';
    case 'google_slide': return 'text-yellow-600';
    case 'google_drive': return 'text-blue-500';
    case 'dropbox': return 'text-blue-700';
    case 'notion': return 'text-slate-800';
    case 'figma': return 'text-purple-600';
    default: return 'text-slate-500';
  }
};

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

interface ProcessSupporter {
  id: string;
  process_id: string;
  network_connection_id: string;
  notes: string | null;
  name: string;
  role: string | null;
  company: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
}

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
    linkedin_url: string | null;
  };
}

const STEP_TYPE_OPTIONS = [
  { value: "phone_screen", label: "Phone Screen", icon: Phone },
  { value: "technical", label: "Technical", icon: Code },
  { value: "behavioral", label: "Behavioral", icon: Users },
  { value: "onsite", label: "Onsite", icon: MapPin },
  { value: "offer", label: "Offer", icon: Gift },
  { value: "other", label: "Other", icon: MoreHorizontal },
  { value: "output", label: "Output", icon: ClipboardCheck },
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

// DiceBear avatar URL for network connections
const DICEBEAR_BASE = "https://api.dicebear.com/9.x/open-peeps/svg";
const DICEBEAR_OPTIONS = "face=smile,smileBig,smileLOL,smileTeethGap,lovingGrin1,lovingGrin2,eatingHappy,cute,cheeky&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4";

const getNetworkAvatarUrl = (connection: NetworkConnection): string => {
  if (connection.avatar_url) return connection.avatar_url;
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(connection.name)}&${DICEBEAR_OPTIONS}`;
};

// Get contact avatar URL - prioritize photo_url, then email via unavatar, then DiceBear
const getContactAvatarUrl = (contact: { name: string; email?: string | null; photo_url?: string | null }, useFallback = false): string => {
  if (!useFallback) {
    if (contact.photo_url) return contact.photo_url;
    if (contact.email) return `https://unavatar.io/${encodeURIComponent(contact.email)}?fallback=false`;
  }
  // DiceBear open-peeps - only smiling faces
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(contact.name)}&${DICEBEAR_OPTIONS}`;
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
  const [selectedNetworkContactIds, setSelectedNetworkContactIds] = useState<string[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [eventPickerStepId, setEventPickerStepId] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isImportMode, setIsImportMode] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkStepId, setLinkStepId] = useState<string | null>(null);
  const [linkFormData, setLinkFormData] = useState({ url: "", name: "" });
  const [isUploading, setIsUploading] = useState(false);

  // Supporters state
  const [supporters, setSupporters] = useState<ProcessSupporter[]>([]);
  const [isSupporterDialogOpen, setIsSupporterDialogOpen] = useState(false);
  const [selectedSupporterIds, setSelectedSupporterIds] = useState<string[]>([]);
  const [supporterSearchQuery, setSupporterSearchQuery] = useState("");
  const [editingSupporter, setEditingSupporter] = useState<ProcessSupporter | null>(null);
  const [supporterNotes, setSupporterNotes] = useState("");

  // Coach recommendations state
  const [processCoachRecommendations, setProcessCoachRecommendations] = useState<CoachRecommendation[]>([]);
  const [stepCoachRecommendations, setStepCoachRecommendations] = useState<Record<string, CoachRecommendation[]>>({});
  const [isLoadingProcessCoaches, setIsLoadingProcessCoaches] = useState(false);
  const [isLoadingStepCoaches, setIsLoadingStepCoaches] = useState<string | null>(null);
  const [coachRecommendationsExpanded, setCoachRecommendationsExpanded] = useState(false);

  const [stepFormData, setStepFormData] = useState({
    step_type: "phone_screen" as ProcessStep["step_type"],
    scheduled_date: "",
    scheduled_time: "",
    status: "upcoming" as ProcessStep["status"],
    description: "",
    notes: "",
    outcome: "",
    meeting_url: "",
    went_well: [] as string[],
    to_improve: [] as string[],
    linked_step_id: "" as string,
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

  // Output Step Content Component
  const OutputStepContent = ({
    step,
    onUpdate,
    allSteps
  }: {
    step: ProcessStep;
    onUpdate: (field: 'went_well' | 'to_improve', values: string[]) => void;
    allSteps: ProcessStep[];
  }) => {
    const [newWentWell, setNewWentWell] = useState("");
    const [newToImprove, setNewToImprove] = useState("");

    const linkedStep = step.linked_step_id
      ? allSteps.find(s => s.id === step.linked_step_id)
      : null;

    const handleAddItem = (field: 'went_well' | 'to_improve', value: string) => {
      if (!value.trim()) return;
      const currentValues = field === 'went_well' ? (step.went_well || []) : (step.to_improve || []);
      onUpdate(field, [...currentValues, value.trim()]);
      if (field === 'went_well') setNewWentWell("");
      else setNewToImprove("");
    };

    const handleRemoveItem = (field: 'went_well' | 'to_improve', index: number) => {
      const currentValues = field === 'went_well' ? (step.went_well || []) : (step.to_improve || []);
      onUpdate(field, currentValues.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-4">
        {/* Linked Step Reference */}
        {linkedStep && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 min-w-0">
            <Link2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-600 truncate">
              Reflecting on <span className="font-medium text-slate-900">Step {linkedStep.step_number}: {(linkedStep.description || STEP_TYPE_OPTIONS.find(o => o.value === linkedStep.step_type)?.label || '').slice(0, 60)}{(linkedStep.description || '').length > 60 ? '...' : ''}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What Went Well Column */}
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-900">What Went Well</span>
          </div>

          {/* Bullet Points */}
          <ul className="space-y-2 mb-3">
            {(step.went_well || []).map((item, index) => (
              <li key={index} className="flex items-start gap-2 group">
                <span className="text-green-500 mt-0.5">•</span>
                <span className="text-sm text-green-800 flex-1">{item}</span>
                <button
                  onClick={() => handleRemoveItem('went_well', index)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-100 rounded transition-opacity"
                >
                  <X className="h-3 w-3 text-green-600" />
                </button>
              </li>
            ))}
            {(step.went_well || []).length === 0 && (
              <li className="text-sm text-green-600 italic">No items yet</li>
            )}
          </ul>

          {/* Add New Item */}
          <div className="flex gap-2">
            <Input
              value={newWentWell}
              onChange={(e) => setNewWentWell(e.target.value)}
              placeholder="Add a point..."
              className="text-sm bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem('went_well', newWentWell);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddItem('went_well', newWentWell)}
              className="border-green-200 hover:bg-green-100 hover:text-green-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* What Could Be Improved Column */}
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">What Could Be Improved</span>
          </div>

          {/* Bullet Points */}
          <ul className="space-y-2 mb-3">
            {(step.to_improve || []).map((item, index) => (
              <li key={index} className="flex items-start gap-2 group">
                <span className="text-amber-500 mt-0.5">•</span>
                <span className="text-sm text-amber-800 flex-1">{item}</span>
                <button
                  onClick={() => handleRemoveItem('to_improve', index)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-100 rounded transition-opacity"
                >
                  <X className="h-3 w-3 text-amber-600" />
                </button>
              </li>
            ))}
            {(step.to_improve || []).length === 0 && (
              <li className="text-sm text-amber-600 italic">No items yet</li>
            )}
          </ul>

          {/* Add New Item */}
          <div className="flex gap-2">
            <Input
              value={newToImprove}
              onChange={(e) => setNewToImprove(e.target.value)}
              placeholder="Add a point..."
              className="text-sm bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem('to_improve', newToImprove);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddItem('to_improve', newToImprove)}
              className="border-amber-200 hover:bg-amber-100 hover:text-amber-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchProcess();
    fetchSteps();
    fetchNetworkConnections();
    fetchSupporters();
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

  const fetchSupporters = async () => {
    const { data, error } = await supabase
      .from("process_supporters")
      .select(`
        id,
        process_id,
        network_connection_id,
        notes,
        network_connection:network_connections!network_connection_id (
          name,
          role,
          company,
          avatar_url,
          linkedin_url
        )
      `)
      .eq("process_id", processId);

    if (!error && data) {
      const mappedSupporters = data.map(s => ({
        id: s.id,
        process_id: s.process_id,
        network_connection_id: s.network_connection_id,
        notes: s.notes,
        name: (s.network_connection as any)?.name || '',
        role: (s.network_connection as any)?.role || null,
        company: (s.network_connection as any)?.company || null,
        avatar_url: (s.network_connection as any)?.avatar_url || null,
        linkedin_url: (s.network_connection as any)?.linkedin_url || null,
      }));
      setSupporters(mappedSupporters);
    }
  };

  const fetchProcessCoachRecommendations = async () => {
    setIsLoadingProcessCoaches(true);
    try {
      const response = await fetch("/api/coaches/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to fetch coaches");
        return;
      }

      const recommendations = data.recommendations || [];
      setProcessCoachRecommendations(recommendations);

      if (recommendations.length > 0) {
        setCoachRecommendationsExpanded(true);
      } else {
        toast.info("No matching coaches found for this opportunity");
      }
    } catch (error) {
      console.error("Failed to fetch coach recommendations:", error);
      toast.error("Failed to fetch coaches");
    } finally {
      setIsLoadingProcessCoaches(false);
    }
  };

  const fetchStepCoachRecommendations = async (stepId: string) => {
    setIsLoadingStepCoaches(stepId);
    try {
      const response = await fetch("/api/coaches/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processId, stepId }),
      });

      if (response.ok) {
        const data = await response.json();
        setStepCoachRecommendations(prev => ({
          ...prev,
          [stepId]: data.recommendations || [],
        }));
      }
    } catch (error) {
      console.error("Failed to fetch step coach recommendations:", error);
    } finally {
      setIsLoadingStepCoaches(null);
    }
  };

  const handleAddSupporters = async () => {
    if (selectedSupporterIds.length === 0) return;

    const existingIds = new Set(supporters.map(s => s.network_connection_id));
    const newSupporters = selectedSupporterIds
      .filter(id => !existingIds.has(id))
      .map(id => ({
        process_id: processId,
        network_connection_id: id,
        notes: null,
      }));

    if (newSupporters.length === 0) {
      toast.error("Selected contacts are already supporters");
      return;
    }

    const { error } = await supabase
      .from("process_supporters")
      .insert(newSupporters);

    if (error) {
      toast.error("Failed to add supporters");
      return;
    }

    toast.success(`Added ${newSupporters.length} supporter${newSupporters.length > 1 ? 's' : ''}`);
    setIsSupporterDialogOpen(false);
    setSelectedSupporterIds([]);
    setSupporterSearchQuery("");
    fetchSupporters();
  };

  const handleUpdateSupporterNotes = async () => {
    if (!editingSupporter) return;

    const { error } = await supabase
      .from("process_supporters")
      .update({ notes: supporterNotes || null })
      .eq("id", editingSupporter.id);

    if (error) {
      toast.error("Failed to update notes");
      return;
    }

    toast.success("Notes updated");
    setEditingSupporter(null);
    setSupporterNotes("");
    setIsSupporterDialogOpen(false);
    fetchSupporters();
  };

  const handleDeleteSupporter = async (supporterId: string) => {
    const { error } = await supabase
      .from("process_supporters")
      .delete()
      .eq("id", supporterId);

    if (error) {
      toast.error("Failed to remove supporter");
      return;
    }

    toast.success("Supporter removed");
    fetchSupporters();
  };

  const resetSupporterDialog = () => {
    setSelectedSupporterIds([]);
    setSupporterSearchQuery("");
    setEditingSupporter(null);
    setSupporterNotes("");
  };

  const fetchProcess = async () => {
    const { data, error } = await supabase
      .from("recruitment_processes")
      .select(`
        *,
        referral_contact:network_connections!referral_contact_id (
          id, name, avatar_url, company, role
        )
      `)
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
      .order("scheduled_date", { ascending: false, nullsFirst: false });

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
      .select(`
        id,
        step_id,
        notes,
        network_connection_id,
        network_connection:network_connections!network_connection_id (
          name,
          role,
          linkedin_url,
          email,
          avatar_url
        )
      `)
      .eq("step_id", stepId);

    if (!error && data) {
      // Map the joined data to the expected format, using network_connection data if available
      const mappedContacts = data.map(contact => ({
        id: contact.id,
        step_id: contact.step_id,
        name: (contact.network_connection as any)?.name || '',
        role: (contact.network_connection as any)?.role || null,
        linkedin_url: (contact.network_connection as any)?.linkedin_url || null,
        email: (contact.network_connection as any)?.email || null,
        photo_url: (contact.network_connection as any)?.avatar_url || null,
        notes: contact.notes,
        network_connection_id: contact.network_connection_id,
      }));
      setContacts(prev => ({ ...prev, [stepId]: mappedContacts }));
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
      went_well: stepFormData.went_well || [],
      to_improve: stepFormData.to_improve || [],
      linked_step_id: stepFormData.linked_step_id || null,
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

    // For new contacts, we need at least one selected network contact
    if (selectedNetworkContactIds.length === 0) {
      toast.error("Please select at least one contact from your network");
      return;
    }

    // Get existing contacts to check for duplicates
    const existingContacts = contacts[selectedStepId] || [];
    const existingNetworkIds = new Set(existingContacts.map(c => c.network_connection_id));

    // Filter out already added contacts and prepare data
    const contactsToAdd = selectedNetworkContactIds
      .filter(id => !existingNetworkIds.has(id))
      .map(id => {
        const networkContact = networkConnections.find(c => c.id === id);
        if (!networkContact) return null;
        return {
          step_id: selectedStepId,
          name: networkContact.name,
          role: networkContact.role || null,
          linkedin_url: networkContact.linkedin_url || null,
          email: networkContact.email || null,
          notes: null,
          network_connection_id: id,
        };
      })
      .filter(Boolean);

    if (contactsToAdd.length === 0) {
      toast.error("All selected contacts are already added to this step");
      return;
    }

    const { error } = await supabase.from("step_contacts").insert(contactsToAdd);

    if (error) {
      console.error("Failed to add contacts:", error);
      toast.error("Failed to add contacts to step");
      return;
    }

    const skipped = selectedNetworkContactIds.length - contactsToAdd.length;
    if (skipped > 0) {
      toast.success(`Added ${contactsToAdd.length} contact(s), ${skipped} already existed`);
    } else {
      toast.success(`Added ${contactsToAdd.length} contact(s) to step`);
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
      description: step.description || "",
      notes: step.notes || "",
      outcome: step.outcome || "",
      meeting_url: step.meeting_url || "",
      went_well: step.went_well || [],
      to_improve: step.to_improve || [],
      linked_step_id: step.linked_step_id || "",
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
    if (!confirm("Remove this interviewer from this step?")) return;

    const { error } = await supabase.from("step_contacts").delete().eq("id", contactId);

    if (error) {
      toast.error("Failed to remove interviewer");
      return;
    }

    toast.success("Interviewer removed from step");
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
      went_well: [],
      to_improve: [],
      linked_step_id: "",
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
    setSelectedNetworkContactIds([]);
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

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkStepId || !linkFormData.url) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const linkInfo = detectLinkType(linkFormData.url);
    const fileName = linkFormData.name || linkInfo.name;

    const { error } = await supabase
      .from("step_attachments")
      .insert({
        step_id: linkStepId,
        user_id: user.id,
        file_name: fileName,
        file_type: "link",
        file_size: 0,
        file_url: linkFormData.url,
        storage_path: null,
        link_url: linkFormData.url,
        link_type: linkInfo.type,
      });

    if (error) {
      console.error("Failed to add link:", error);
      toast.error(`Failed to add link: ${error.message}`);
      return;
    }

    toast.success("Link added");
    setIsLinkDialogOpen(false);
    setLinkFormData({ url: "", name: "" });
    fetchAttachments(linkStepId);
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

  const handleUpdateOutputStep = async (
    stepId: string,
    field: 'went_well' | 'to_improve',
    values: string[]
  ) => {
    const { error } = await supabase
      .from("process_steps")
      .update({ [field]: values })
      .eq("id", stepId);

    if (error) {
      toast.error("Failed to update");
      return;
    }

    // Update local state
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, [field]: values } : s
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
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {process.applied_date && (
                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  Applied {new Date(process.applied_date).toLocaleDateString()}
                </p>
              )}
              {process.source === "referral" && process.referral_contact && (
                <span className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
                  <img
                    src={getNetworkAvatarUrl(process.referral_contact)}
                    alt={process.referral_contact.name}
                    className="h-4 w-4 rounded-full"
                  />
                  Referred by {process.referral_contact.name}
                </span>
              )}
            </div>
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

      {/* Supporters & Coach Recommendations - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supporters Section */}
        <Card>
          <CardContent className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-semibold text-slate-900">My Supporters</span>
                {supporters.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {supporters.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  resetSupporterDialog();
                  setIsSupporterDialogOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {supporters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {supporters.map(supporter => (
                  <div
                    key={supporter.id}
                    className="group relative flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      <img
                        src={supporter.avatar_url || `${DICEBEAR_BASE}?seed=${encodeURIComponent(supporter.name)}&${DICEBEAR_OPTIONS}`}
                        alt={supporter.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate max-w-[80px]">
                        {supporter.name}
                      </p>
                      {supporter.role && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[80px]">
                          {supporter.role}
                        </p>
                      )}
                    </div>
                    {supporter.linkedin_url && (
                      <a
                        href={supporter.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingSupporter(supporter);
                          setSupporterNotes(supporter.notes || "");
                          setIsSupporterDialogOpen(true);
                        }}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupporter(supporter.id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Add people from your network who are helping you
              </p>
            )}

            {/* Show notes if any supporter has them */}
            {supporters.some(s => s.notes) && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  {supporters.filter(s => s.notes).map(s => (
                    <p key={s.id} className="text-xs text-slate-500">
                      <span className="font-medium">{s.name}:</span> {s.notes}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Recommendations Section */}
        <Card>
          <CardContent className="p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-900">Get Expert Help</span>
                {processCoachRecommendations.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700">
                    {processCoachRecommendations.length} match{processCoachRecommendations.length !== 1 ? 'es' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {processCoachRecommendations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={fetchProcessCoachRecommendations}
                    disabled={isLoadingProcessCoaches}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingProcessCoaches ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    if (processCoachRecommendations.length === 0) {
                      fetchProcessCoachRecommendations();
                    } else {
                      setCoachRecommendationsExpanded(!coachRecommendationsExpanded);
                    }
                  }}
                  disabled={isLoadingProcessCoaches}
                >
                  {isLoadingProcessCoaches ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Finding...
                    </>
                  ) : processCoachRecommendations.length === 0 ? (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Find Coaches
                    </>
                  ) : coachRecommendationsExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            </div>

            {processCoachRecommendations.length === 0 && !isLoadingProcessCoaches && (
              <p className="text-xs text-slate-400 italic">
                Get matched with coaches experienced at {process.company_name}
              </p>
            )}

            {coachRecommendationsExpanded && processCoachRecommendations.length > 0 && (
              <div className="space-y-2">
                {processCoachRecommendations.map((rec) => (
                  <CoachRecommendationCard
                    key={rec.coach_id}
                    recommendation={rec}
                    compact
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setStepFormData({
                  ...stepFormData,
                  step_type: "output",
                  status: "completed",
                  scheduled_date: new Date().toISOString().split('T')[0],
                  scheduled_time: "",
                  description: "",
                  notes: "",
                  outcome: "",
                  meeting_url: "",
                  went_well: [],
                  to_improve: [],
                  linked_step_id: "",
                });
                setIsStepDialogOpen(true);
              }}
            >
              <ClipboardCheck className="h-4 w-4" />
              Add Output
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
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

                {stepFormData.step_type !== 'output' && (
                  <>
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
                  </>
                )}

                {stepFormData.step_type === 'output' && (
                  <>
                    <div className="space-y-2">
                      <Label>Reflecting on Step</Label>
                      <Select
                        value={stepFormData.linked_step_id}
                        onValueChange={(value) =>
                          setStepFormData({ ...stepFormData, linked_step_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select the step you're reflecting on..." />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-4rem)]">
                          {steps
                            .filter(s => s.step_type !== 'output' && s.id !== editingStep?.id)
                            .map((s) => {
                              const typeLabel = STEP_TYPE_OPTIONS.find(o => o.value === s.step_type)?.label || s.step_type;
                              const displayText = s.description || typeLabel;
                              const truncatedText = displayText.length > 50 ? displayText.substring(0, 50) + '...' : displayText;
                              return (
                                <SelectItem key={s.id} value={s.id} className="max-w-full">
                                  <span className="truncate">Step {s.step_number}: {truncatedText}</span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <Lightbulb className="h-4 w-4 inline mr-1" />
                        After creating this output step, you can add your reflections using the two-column layout for &quot;What Went Well&quot; and &quot;What Could Be Improved&quot;.
                      </p>
                    </div>
                  </>
                )}

                {stepFormData.step_type !== 'output' && (
                  <>
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
                  </>
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
                      step.step_type === "output"
                        ? "bg-amber-100 text-amber-600"
                        : step.status === "completed"
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
                                  Step {step.step_number}: {step.description || STEP_TYPE_OPTIONS.find(o => o.value === step.step_type)?.label}
                                </h3>
                                {getStatusBadge(step.status)}
                                {expandedSteps[step.id] ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </div>

                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {step.scheduled_date && (
                                  <p className="text-sm text-slate-600 flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(step.scheduled_date).toLocaleString()}
                                  </p>
                                )}
                                {/* Interviewers preview */}
                                {contacts[step.id]?.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-2">
                                      {contacts[step.id].slice(0, 3).map((contact, idx) => (
                                        <img
                                          key={contact.id}
                                          src={getContactAvatarUrl(contact)}
                                          alt={contact.name}
                                          className="h-6 w-6 rounded-full border-2 border-white"
                                          style={{ zIndex: 3 - idx }}
                                          onError={(e) => {
                                            e.currentTarget.src = getContactAvatarUrl(contact, true);
                                          }}
                                        />
                                      ))}
                                      {contacts[step.id].length > 3 && (
                                        <div className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                                          +{contacts[step.id].length - 3}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {contacts[step.id].length === 1
                                        ? contacts[step.id][0].name
                                        : `${contacts[step.id].length} interviewers`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>

                            {/* Collapsible Content */}
                            {expandedSteps[step.id] && (
                              <div className="mt-4 space-y-4">

                            {/* Output Step Content - Two Column Layout */}
                            {step.step_type === 'output' ? (
                              <OutputStepContent
                                step={step}
                                onUpdate={(field, values) => handleUpdateOutputStep(step.id, field, values)}
                                allSteps={steps}
                              />
                            ) : (
                              <>
                            {/* Section 1: Contacts & Files (2 columns) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Contacts */}
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-semibold text-slate-900">Interviewers</span>
                                  </div>
                                  <button
                                    onClick={() => handleAddContact(step.id)}
                                    className="h-6 w-6 rounded-full bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors border"
                                    title="Add contact"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                {stepContacts.length > 0 ? (
                                  <div className="space-y-2">
                                    {stepContacts.map(contact => {
                                      const hasCustomAvatar = contact.photo_url || contact.email;
                                      const avatarUrl = contactAvatarErrors[contact.id]
                                        ? getContactAvatarUrl(contact, true)
                                        : getContactAvatarUrl(contact);
                                      return (
                                        <div key={contact.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
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
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                                              {contact.role && (
                                                <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {contact.linkedin_url && (
                                              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 p-1">
                                                <Linkedin className="h-3.5 w-3.5" />
                                              </a>
                                            )}
                                            <button onClick={() => handleEditContact(contact, step.id)} className="text-slate-400 hover:text-slate-600 p-1">
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => handleDeleteContact(contact.id, step.id)} className="text-slate-400 hover:text-red-600 p-1">
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No interviewers added yet</p>
                                )}
                              </div>

                              {/* Files */}
                              <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-semibold text-slate-900">Documents</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setLinkStepId(step.id);
                                        setLinkFormData({ url: "", name: "" });
                                        setIsLinkDialogOpen(true);
                                      }}
                                      className="h-6 w-6 rounded-full bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors border"
                                      title="Add link"
                                    >
                                      <Link2 className="h-3 w-3" />
                                    </button>
                                    <label className="h-6 w-6 rounded-full bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer border">
                                      <Upload className="h-3 w-3" />
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.zip"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleFileUpload(step.id, file);
                                          e.target.value = '';
                                        }}
                                        disabled={isUploading}
                                      />
                                    </label>
                                  </div>
                                </div>
                                {stepAttachments.length > 0 ? (
                                  <div className="space-y-2">
                                    {stepAttachments.map(attachment => (
                                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <a
                                          href={attachment.link_url || attachment.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 flex-1 min-w-0 hover:text-blue-600 transition-colors"
                                        >
                                          <div className={`h-7 w-7 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 ${attachment.link_type ? getLinkTypeColor(attachment.link_type) : 'text-slate-600'}`}>
                                            {attachment.link_type ? (
                                              <Link2 className="h-4 w-4" />
                                            ) : (
                                              <span className="text-xs font-semibold">{getFileIcon(attachment.file_type)}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{attachment.file_name}</p>
                                            <p className="text-xs text-slate-500">
                                              {attachment.link_type
                                                ? detectLinkType(attachment.link_url || '').name
                                                : formatFileSize(attachment.file_size)}
                                            </p>
                                          </div>
                                        </a>
                                        <button
                                          onClick={() => handleDeleteAttachment(attachment)}
                                          className="text-slate-400 hover:text-red-600 p-1 flex-shrink-0"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No documents attached</p>
                                )}
                              </div>
                            </div>

                            {/* Section 2: Interview Details */}
                            <div className="space-y-3">
                              {/* Calendar & Meeting Link */}
                              {(step.google_calendar_event_id || step.meeting_url) && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {step.google_calendar_event_id && (
                                    <div className="flex items-center gap-2">
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
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      <Video className="h-4 w-4" />
                                      Join Meeting
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Interview Purpose */}
                              {step.description && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                  <p className="text-xs font-semibold text-blue-700 mb-1">Interview Purpose</p>
                                  <p className="text-sm text-blue-800">{step.description}</p>
                                </div>
                              )}

                              {/* Notes */}
                              {step.notes && (
                                <p className="text-sm text-slate-500 italic">{step.notes}</p>
                              )}

                              {/* Outcome */}
                              {step.outcome && (
                                <div className="p-3 bg-slate-100 rounded-lg">
                                  <p className="text-xs font-semibold text-slate-700 mb-1">Outcome</p>
                                  <p className="text-sm text-slate-600">{step.outcome}</p>
                                </div>
                              )}
                            </div>

                            {/* Section 3: AI Recommendations */}
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg">
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

                            {/* Section 4: Get Expert Help for this Step */}
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                                  <span className="text-sm font-semibold text-indigo-900">Get Expert Help</span>
                                  {stepCoachRecommendations[step.id]?.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700">
                                      {stepCoachRecommendations[step.id].length} coach{stepCoachRecommendations[step.id].length !== 1 ? 'es' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchStepCoachRecommendations(step.id)}
                                  disabled={isLoadingStepCoaches === step.id}
                                  className="gap-1.5 text-xs h-7 bg-white hover:bg-indigo-50 border-indigo-200"
                                >
                                  {isLoadingStepCoaches === step.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Finding...
                                    </>
                                  ) : stepCoachRecommendations[step.id]?.length > 0 ? (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Refresh
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      Find Coaches
                                    </>
                                  )}
                                </Button>
                              </div>
                              {stepCoachRecommendations[step.id]?.length > 0 ? (
                                <div className="space-y-3">
                                  <p className="text-xs text-indigo-600">
                                    Coaches matched for {STEP_TYPE_OPTIONS.find(o => o.value === step.step_type)?.label || 'this interview'}
                                  </p>
                                  <div className="grid grid-cols-1 gap-3">
                                    {stepCoachRecommendations[step.id].slice(0, 2).map((rec) => (
                                      <CoachRecommendationCard
                                        key={rec.coach_id}
                                        recommendation={rec}
                                        stepId={step.id}
                                        compact
                                      />
                                    ))}
                                  </div>
                                  {stepCoachRecommendations[step.id].length > 2 && (
                                    <p className="text-xs text-indigo-500 text-center">
                                      +{stepCoachRecommendations[step.id].length - 2} more coaches available
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-indigo-600 italic">
                                  Find coaches with {STEP_TYPE_OPTIONS.find(o => o.value === step.step_type)?.label.toLowerCase() || 'interview'} expertise to help you prepare.
                                </p>
                              )}
                            </div>

                            {/* Section 5: Preparation Notes */}
                            <div className="p-4 border rounded-lg bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-semibold text-slate-900">Your Preparation Notes</span>
                                  <span className="text-xs text-slate-400">(Markdown)</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setNotesPreviewMode(prev => ({ ...prev, [step.id]: false }))}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      notesPreviewMode[step.id] === false
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
                                      notesPreviewMode[step.id] !== false
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    <Eye className="h-3 w-3 inline mr-1" />
                                    Preview
                                  </button>
                                </div>
                              </div>
                              {notesPreviewMode[step.id] !== false ? (
                                <div className="min-h-[100px] p-3 border rounded-md bg-slate-50 prose prose-sm prose-slate max-w-none">
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
                                    setSteps(prev => prev.map(s =>
                                      s.id === step.id ? { ...s, preparation_notes: e.target.value } : s
                                    ));
                                  }}
                                  onBlur={(e) => handleSavePreparationNotes(step.id, e.target.value)}
                                  placeholder="Your notes for this interview...&#10;&#10;**Markdown supported** - use *italic*, **bold**, - lists"
                                  className="min-h-[100px] resize-y font-mono text-sm"
                                />
                              )}
                            </div>
                              </>
                            )}
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
                            onClick={() => {
                              setSelectedNetworkContactIds(prev =>
                                prev.includes(contact.id)
                                  ? prev.filter(id => id !== contact.id)
                                  : [...prev, contact.id]
                              );
                            }}
                            className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors ${
                              selectedNetworkContactIds.includes(contact.id) ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                            }`}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedNetworkContactIds.includes(contact.id)
                                ? "bg-blue-500 border-blue-500"
                                : "border-slate-300"
                            }`}>
                              {selectedNetworkContactIds.includes(contact.id) && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
                            </div>
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

                    {/* Selected count */}
                    {selectedNetworkContactIds.length > 0 && (
                      <p className="text-sm text-blue-600 font-medium">
                        {selectedNetworkContactIds.length} contact{selectedNetworkContactIds.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsContactDialogOpen(false)}>
                Cancel
              </Button>
              {(editingContact || networkConnections.length > 0) && (
                <Button type="submit" disabled={!editingContact && selectedNetworkContactIds.length === 0}>
                  {editingContact ? "Update Notes" : `Add ${selectedNetworkContactIds.length > 0 ? selectedNetworkContactIds.length : ''} Contact${selectedNetworkContactIds.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supporters Dialog */}
      <Dialog open={isSupporterDialogOpen} onOpenChange={(open) => {
        setIsSupporterDialogOpen(open);
        if (!open) resetSupporterDialog();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupporter ? "Edit Supporter Notes" : "Add Supporters"}
            </DialogTitle>
            <DialogDescription>
              {editingSupporter
                ? "Update notes for how this person is helping you"
                : "Select people from your network who are supporting you"
              }
            </DialogDescription>
          </DialogHeader>

          {editingSupporter ? (
            /* Edit mode - just notes */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  <img
                    src={editingSupporter.avatar_url || `${DICEBEAR_BASE}?seed=${encodeURIComponent(editingSupporter.name)}&${DICEBEAR_OPTIONS}`}
                    alt={editingSupporter.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{editingSupporter.name}</p>
                  {editingSupporter.role && (
                    <p className="text-sm text-slate-500 truncate">{editingSupporter.role}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>How are they helping?</Label>
                <Textarea
                  value={supporterNotes}
                  onChange={(e) => setSupporterNotes(e.target.value)}
                  placeholder="e.g., Internal referral, Mock interview practice, Industry insights..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsSupporterDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleUpdateSupporterNotes}
                >
                  Update Notes
                </Button>
              </div>
            </div>
          ) : (
            /* Add mode - contact selector */
            <div className="space-y-4">
              {networkConnections.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No contacts in your network yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsSupporterDialogOpen(false);
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
                      value={supporterSearchQuery}
                      onChange={(e) => setSupporterSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="pl-9"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>

                  {/* Contact List */}
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {networkConnections
                      .filter(c =>
                        c.name.toLowerCase().includes(supporterSearchQuery.toLowerCase()) ||
                        (c.role && c.role.toLowerCase().includes(supporterSearchQuery.toLowerCase()))
                      )
                      .map(contact => {
                        const isExisting = supporters.some(s => s.network_connection_id === contact.id);
                        return (
                          <button
                            key={contact.id}
                            type="button"
                            disabled={isExisting}
                            onClick={() => {
                              setSelectedSupporterIds(prev =>
                                prev.includes(contact.id)
                                  ? prev.filter(id => id !== contact.id)
                                  : [...prev, contact.id]
                              );
                            }}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                              isExisting
                                ? "bg-slate-50 opacity-50 cursor-not-allowed"
                                : selectedSupporterIds.includes(contact.id)
                                  ? "bg-rose-50 border-l-2 border-l-rose-500"
                                  : "hover:bg-slate-50"
                            }`}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isExisting
                                ? "bg-slate-300 border-slate-300"
                                : selectedSupporterIds.includes(contact.id)
                                  ? "bg-rose-500 border-rose-500"
                                  : "border-slate-300"
                            }`}>
                              {(selectedSupporterIds.includes(contact.id) || isExisting) && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                              <img
                                src={contact.avatar_url || `${DICEBEAR_BASE}?seed=${encodeURIComponent(contact.name)}&${DICEBEAR_OPTIONS}`}
                                alt={contact.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm">{contact.name}</p>
                              {contact.role && (
                                <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                              )}
                            </div>
                            {isExisting && (
                              <span className="text-xs text-slate-400">Added</span>
                            )}
                          </button>
                        );
                      })}
                    {networkConnections.filter(c =>
                      c.name.toLowerCase().includes(supporterSearchQuery.toLowerCase()) ||
                      (c.role && c.role.toLowerCase().includes(supporterSearchQuery.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No contacts found
                      </div>
                    )}
                  </div>

                  {/* Selected count and add button */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsSupporterDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={selectedSupporterIds.length === 0}
                      onClick={handleAddSupporters}
                    >
                      Add {selectedSupporterIds.length > 0 ? selectedSupporterIds.length : ''} Supporter{selectedSupporterIds.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={(open) => {
        setIsLinkDialogOpen(open);
        if (!open) setLinkFormData({ url: "", name: "" });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document Link</DialogTitle>
            <DialogDescription>
              Paste a link to a Google Doc, Drive, Notion, or other document
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link_url">Document URL *</Label>
              <Input
                id="link_url"
                type="url"
                value={linkFormData.url}
                onChange={(e) => {
                  const url = e.target.value;
                  const linkInfo = detectLinkType(url);
                  setLinkFormData(prev => ({
                    ...prev,
                    url,
                    name: prev.name || (url && linkInfo.type !== 'other' ? linkInfo.name : ''),
                  }));
                }}
                placeholder="https://docs.google.com/..."
                required
              />
            </div>

            {linkFormData.url && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <div className={`h-8 w-8 rounded flex items-center justify-center bg-white border ${getLinkTypeColor(detectLinkType(linkFormData.url).type)}`}>
                  <Link2 className="h-4 w-4" />
                </div>
                <span className="text-sm text-slate-600">{detectLinkType(linkFormData.url).name}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="link_name">Display Name <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="link_name"
                value={linkFormData.name}
                onChange={(e) => setLinkFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Interview Prep Doc"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Link
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

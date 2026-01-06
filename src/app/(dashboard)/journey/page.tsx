"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Calendar, MapPin, Edit2, Trash2, Sparkles, Linkedin, Upload, Check, Loader2, List, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Customized } from "recharts";

import { toast } from "sonner";

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

// Helper to parse YYYY-MM format (handles partial values like "-03" or "2020-")
const parseYearMonth = (date: string) => {
  if (!date) return { month: "", year: "" };
  const parts = date.split("-");
  return {
    year: parts[0] || "",
    month: parts[1] || ""
  };
};

// Helper to format to YYYY-MM (allows partial values)
const formatYearMonth = (month: string, year: string) => {
  if (!month && !year) return "";
  return `${year || ""}-${month || ""}`;
};

interface CareerExperience {
  id: string;
  user_id: string;
  company_name: string;
  company_website: string | null;
  job_title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  skills: string[];
  is_current: boolean;
  ote: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "CHF", label: "CHF", symbol: "CHF" },
  { value: "CAD", label: "CAD ($)", symbol: "C$" },
  { value: "AUD", label: "AUD ($)", symbol: "A$" },
  { value: "JPY", label: "JPY (¥)", symbol: "¥" },
];

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Extract domain from URL or domain string
const extractDomain = (input: string | null): string | null => {
  if (!input) return null;
  try {
    // If it's already just a domain
    if (!input.includes('/') && input.includes('.')) {
      return input.toLowerCase().replace(/^www\./, '');
    }
    // Parse as URL
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

// Get company logo URL using Google's favicon service (more reliable)
const getCompanyLogoUrl = (website: string | null): string | null => {
  const domain = extractDomain(website);
  if (!domain) return null;
  // Google's favicon service - returns high quality favicons
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

export default function JourneyPage() {
  const supabase = createClient();
  const [experiences, setExperiences] = useState<CareerExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<CareerExperience | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddExperiences, setQuickAddExperiences] = useState<Array<{
    company_name: string;
    job_title: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
  }>>([{ company_name: "", job_title: "", start_date: "", end_date: "", is_current: false }]);

  const [formData, setFormData] = useState({
    company_name: "",
    company_website: "",
    job_title: "",
    start_date: "",
    end_date: "",
    description: "",
    skills: "",
    is_current: false,
    ote: "",
    currency: "USD",
  });
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  // LinkedIn PDF import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedExperiences, setImportedExperiences] = useState<Array<{
    company_name: string;
    company_website: string | null;
    job_title: string;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
    selected: boolean;
  }>>([]);
  const [importStep, setImportStep] = useState<"upload" | "review">("upload");

  useEffect(() => {
    fetchExperiences();
  }, []);

  const addQuickExperience = () => {
    setQuickAddExperiences([
      ...quickAddExperiences,
      { company_name: "", job_title: "", start_date: "", end_date: "", is_current: false }
    ]);
  };

  const updateQuickExperience = (index: number, field: string, value: string | boolean) => {
    const updated = [...quickAddExperiences];
    updated[index] = { ...updated[index], [field]: value };
    setQuickAddExperiences(updated);
  };

  const removeQuickExperience = (index: number) => {
    if (quickAddExperiences.length > 1) {
      setQuickAddExperiences(quickAddExperiences.filter((_, i) => i !== index));
    }
  };

  // Helper to check if date is complete (has both month and year)
  const isDateComplete = (date: string) => {
    const { month, year } = parseYearMonth(date);
    return month && year;
  };

  const saveQuickExperiences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const validExperiences = quickAddExperiences.filter(
      exp => exp.company_name && exp.job_title && isDateComplete(exp.start_date)
    );

    if (validExperiences.length === 0) {
      toast.error("Please add at least one experience with company, title, and complete start date (MM/YYYY)");
      return;
    }

    const experiencesToInsert = validExperiences.map(exp => ({
      user_id: user.id,
      company_name: exp.company_name,
      job_title: exp.job_title,
      start_date: `${exp.start_date}-01`, // Convert YYYY-MM to YYYY-MM-DD
      end_date: exp.is_current ? null : (isDateComplete(exp.end_date) ? `${exp.end_date}-01` : null),
      is_current: exp.is_current,
      skills: [],
      description: null,
    }));

    const { error } = await supabase.from("career_experiences").insert(experiencesToInsert);

    if (error) {
      toast.error("Failed to save experiences");
      return;
    }

    toast.success(`Added ${validExperiences.length} experience(s)!`);
    setIsQuickAddOpen(false);
    setQuickAddExperiences([{ company_name: "", job_title: "", start_date: "", end_date: "", is_current: false }]);
    fetchExperiences();
  };

  const fetchExperiences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("career_experiences")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Failed to load experiences");
      return;
    }

    setExperiences(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Convert YYYY-MM to YYYY-MM-DD for database
    const formatDateForDb = (date: string) => {
      if (!date || !isDateComplete(date)) return null;
      return `${date}-01`;
    };

    const experienceData = {
      user_id: user.id,
      company_name: formData.company_name,
      company_website: formData.company_website || null,
      job_title: formData.job_title,
      start_date: formatDateForDb(formData.start_date),
      end_date: formData.is_current ? null : formatDateForDb(formData.end_date),
      description: formData.description || null,
      skills: formData.skills ? formData.skills.split(",").map((s) => s.trim()) : [],
      is_current: formData.is_current,
      ote: formData.ote ? parseInt(formData.ote, 10) : null,
      currency: formData.currency,
    };

    if (editingExperience) {
      const { error } = await supabase
        .from("career_experiences")
        .update(experienceData)
        .eq("id", editingExperience.id);

      if (error) {
        toast.error("Failed to update experience");
        return;
      }
      toast.success("Experience updated");
    } else {
      const { error } = await supabase.from("career_experiences").insert(experienceData);

      if (error) {
        toast.error("Failed to add experience");
        return;
      }
      toast.success("Experience added");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchExperiences();
  };

  const handleEdit = (experience: CareerExperience) => {
    setEditingExperience(experience);
    // Convert YYYY-MM-DD from database to YYYY-MM for form
    const dbDateToForm = (date: string | null) => {
      if (!date) return "";
      return date.substring(0, 7); // Take YYYY-MM from YYYY-MM-DD
    };
    setFormData({
      company_name: experience.company_name,
      company_website: experience.company_website || "",
      job_title: experience.job_title,
      start_date: dbDateToForm(experience.start_date),
      end_date: dbDateToForm(experience.end_date),
      description: experience.description || "",
      skills: experience.skills?.join(", ") || "",
      is_current: experience.is_current,
      ote: experience.ote?.toString() || "",
      currency: experience.currency || "USD",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;

    const { error } = await supabase.from("career_experiences").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete experience");
      return;
    }

    toast.success("Experience deleted");
    fetchExperiences();
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      company_website: "",
      job_title: "",
      start_date: "",
      end_date: "",
      description: "",
      skills: "",
      is_current: false,
      ote: "",
      currency: "USD",
    });
    setEditingExperience(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  // LinkedIn PDF import handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/linkedin/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse PDF");
      }

      const data = await response.json();

      if (!data.experiences || data.experiences.length === 0) {
        toast.error("No experiences found in the PDF");
        return;
      }

      // Convert to our format with selection state
      setImportedExperiences(
        data.experiences.map((exp: {
          company_name: string;
          company_website: string | null;
          job_title: string;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          description: string | null;
        }) => ({
          ...exp,
          selected: true, // Select all by default
        }))
      );

      setImportStep("review");
      toast.success(`Found ${data.experiences.length} experiences`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import PDF");
    } finally {
      setIsImporting(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const toggleImportSelection = (index: number) => {
    setImportedExperiences(prev =>
      prev.map((exp, i) =>
        i === index ? { ...exp, selected: !exp.selected } : exp
      )
    );
  };

  const selectAllImports = () => {
    setImportedExperiences(prev => prev.map(exp => ({ ...exp, selected: true })));
  };

  const deselectAllImports = () => {
    setImportedExperiences(prev => prev.map(exp => ({ ...exp, selected: false })));
  };

  const saveImportedExperiences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedExperiences = importedExperiences.filter(exp => exp.selected);

    if (selectedExperiences.length === 0) {
      toast.error("Please select at least one experience to import");
      return;
    }

    const experiencesToInsert = selectedExperiences.map(exp => ({
      user_id: user.id,
      company_name: exp.company_name,
      company_website: exp.company_website,
      job_title: exp.job_title,
      start_date: `${exp.start_date}-01`, // Convert YYYY-MM to YYYY-MM-DD
      end_date: exp.is_current ? null : (exp.end_date ? `${exp.end_date}-01` : null),
      is_current: exp.is_current,
      description: exp.description,
      skills: [],
    }));

    const { error } = await supabase.from("career_experiences").insert(experiencesToInsert);

    if (error) {
      toast.error("Failed to save experiences");
      return;
    }

    toast.success(`Imported ${selectedExperiences.length} experience(s)!`);
    setIsImportOpen(false);
    setImportStep("upload");
    setImportedExperiences([]);
    fetchExperiences();
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportedExperiences([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Career Journey</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Track your professional experiences over time</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 mr-2">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "chart"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChartIcon className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setIsImportOpen(true)}>
            <Linkedin className="h-4 w-4" />
            Import
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                Add Experience
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingExperience ? "Edit Experience" : "Add Experience"}
              </DialogTitle>
              <DialogDescription>
                Add a new position to your career timeline
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_website">Company Website (for logo)</Label>
                <div className="flex gap-2">
                  <Input
                    id="company_website"
                    value={formData.company_website}
                    onChange={(e) =>
                      setFormData({ ...formData, company_website: e.target.value })
                    }
                    placeholder="microsoft.com"
                    className="flex-1"
                  />
                  {formData.company_website && getCompanyLogoUrl(formData.company_website) && (
                    <div className="h-10 w-10 rounded border flex items-center justify-center bg-white">
                      <img
                        src={getCompanyLogoUrl(formData.company_website)!}
                        alt="Logo preview"
                        className="h-6 w-6 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Enter the company domain to display their logo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="flex gap-2">
                    <Select
                      value={parseYearMonth(formData.start_date).month}
                      onValueChange={(month) =>
                        setFormData({ ...formData, start_date: formatYearMonth(month, parseYearMonth(formData.start_date).year) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={parseYearMonth(formData.start_date).year}
                      onValueChange={(year) =>
                        setFormData({ ...formData, start_date: formatYearMonth(parseYearMonth(formData.start_date).month, year) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <div className="flex gap-2">
                    <Select
                      value={parseYearMonth(formData.end_date).month}
                      onValueChange={(month) =>
                        setFormData({ ...formData, end_date: formatYearMonth(month, parseYearMonth(formData.end_date).year) })
                      }
                      disabled={formData.is_current}
                    >
                      <SelectTrigger className={formData.is_current ? "opacity-50" : ""}>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={parseYearMonth(formData.end_date).year}
                      onValueChange={(year) =>
                        setFormData({ ...formData, end_date: formatYearMonth(parseYearMonth(formData.end_date).month, year) })
                      }
                      disabled={formData.is_current}
                    >
                      <SelectTrigger className={formData.is_current ? "opacity-50" : ""}>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={formData.is_current}
                  onChange={(e) =>
                    setFormData({ ...formData, is_current: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_current" className="font-normal">
                  I currently work here
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Annual Compensation (OTE)</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={formData.ote}
                    onChange={(e) => setFormData({ ...formData, ote: e.target.value })}
                    placeholder="150000"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Used for salary progression chart (optional)
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingExperience ? "Update" : "Add"} Experience
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Quick start card */}
      {experiences.length === 0 && !isLoading && (
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Linkedin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-slate-900">Import from LinkedIn</h3>
                <p className="text-sm text-slate-600">
                  Export your LinkedIn profile as PDF and import your work history instantly
                </p>
              </div>
              <Button onClick={() => setIsImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => {
        setIsImportOpen(open);
        if (!open) resetImport();
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              Import from LinkedIn
            </DialogTitle>
            <DialogDescription>
              {importStep === "upload"
                ? "Upload your LinkedIn profile PDF to automatically extract your work history."
                : "Review and select which experiences to import."}
            </DialogDescription>
          </DialogHeader>

          {importStep === "upload" ? (
            <div className="space-y-4 mt-4">
              {/* Instructions */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-slate-900">How to export your LinkedIn profile:</h4>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Go to your LinkedIn profile page</li>
                  <li>Click the <strong>More</strong> button below your profile photo</li>
                  <li>Select <strong>Save to PDF</strong></li>
                  <li>Upload the downloaded PDF file below</li>
                </ol>
              </div>

              {/* Upload area */}
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-blue-400 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isImporting ? (
                    <>
                      <Loader2 className="w-10 h-10 mb-3 text-blue-600 animate-spin" />
                      <p className="text-sm text-slate-600">Analyzing your profile...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-600">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PDF file from LinkedIn</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Selection controls */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {importedExperiences.filter(e => e.selected).length} of {importedExperiences.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllImports}>
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllImports}>
                    Deselect all
                  </Button>
                </div>
              </div>

              {/* Experience list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {importedExperiences.map((exp, index) => {
                  const logoUrl = exp.company_website ? getCompanyLogoUrl(exp.company_website) : null;
                  return (
                    <div
                      key={index}
                      onClick={() => toggleImportSelection(index)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        exp.selected
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          exp.selected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                        }`}>
                          {exp.selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-8 h-8 rounded flex-shrink-0"
                            onError={(e) => e.currentTarget.style.display = "none"}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{exp.job_title}</p>
                          <p className="text-sm text-slate-600 truncate">{exp.company_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {exp.start_date} - {exp.is_current ? "Present" : exp.end_date || "N/A"}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button variant="outline" onClick={resetImport}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveImportedExperiences}
                    disabled={importedExperiences.filter(e => e.selected).length === 0}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Import {importedExperiences.filter(e => e.selected).length} Experience(s)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Quick Add Experiences
            </DialogTitle>
            <DialogDescription>
              Rapidly add multiple work experiences. You can add details later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {quickAddExperiences.map((exp, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Experience {index + 1}</span>
                  {quickAddExperiences.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuickExperience(index)}
                      className="text-red-600 hover:text-red-700 h-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Company</Label>
                    <Input
                      placeholder="e.g. Google"
                      value={exp.company_name}
                      onChange={(e) => updateQuickExperience(index, "company_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Job Title</Label>
                    <Input
                      placeholder="e.g. Software Engineer"
                      value={exp.job_title}
                      onChange={(e) => updateQuickExperience(index, "job_title", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Start</Label>
                    <Select
                      value={parseYearMonth(exp.start_date).month}
                      onValueChange={(month) => updateQuickExperience(index, "start_date", formatYearMonth(month, parseYearMonth(exp.start_date).year))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">&nbsp;</Label>
                    <Select
                      value={parseYearMonth(exp.start_date).year}
                      onValueChange={(year) => updateQuickExperience(index, "start_date", formatYearMonth(parseYearMonth(exp.start_date).month, year))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">End</Label>
                    <Select
                      value={parseYearMonth(exp.end_date).month}
                      onValueChange={(month) => updateQuickExperience(index, "end_date", formatYearMonth(month, parseYearMonth(exp.end_date).year))}
                      disabled={exp.is_current}
                    >
                      <SelectTrigger className={`h-9 ${exp.is_current ? "opacity-50" : ""}`}>
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">&nbsp;</Label>
                    <Select
                      value={parseYearMonth(exp.end_date).year}
                      onValueChange={(year) => updateQuickExperience(index, "end_date", formatYearMonth(parseYearMonth(exp.end_date).month, year))}
                      disabled={exp.is_current}
                    >
                      <SelectTrigger className={`h-9 ${exp.is_current ? "opacity-50" : ""}`}>
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pb-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={exp.is_current}
                        onChange={(e) => updateQuickExperience(index, "is_current", e.target.checked)}
                        className="rounded"
                      />
                      Current
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addQuickExperience}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Experience
            </Button>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuickExperiences} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Save All Experiences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : experiences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No experiences yet</h3>
            <p className="text-slate-500 mt-1 mb-4 text-center max-w-md">
              Import your work history from LinkedIn or add experiences manually
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsQuickAddOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Add Manually
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Experience
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="grid gap-4">
          {experiences.map((experience) => {
            const logoUrl = getCompanyLogoUrl(experience.company_website);
            const showLogo = logoUrl && !failedLogos.has(experience.id);
            return (
              <Card key={experience.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`h-10 w-10 shrink-0 rounded-lg border shadow-sm flex items-center justify-center overflow-hidden ${
                        showLogo ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200"
                      }`}>
                        {showLogo ? (
                          <img
                            src={logoUrl}
                            alt={`${experience.company_name} logo`}
                            className="h-6 w-6 object-contain"
                            onError={() => {
                              setFailedLogos(prev => new Set(prev).add(experience.id));
                            }}
                          />
                        ) : (
                          <Briefcase className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {experience.company_name}
                          </h3>
                          {experience.is_current && (
                            <Badge className="bg-green-100 text-green-700">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{experience.job_title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(experience.start_date)} - {experience.is_current ? "Present" : experience.end_date ? formatDate(experience.end_date) : "N/A"}
                          </span>
                          {experience.ote && (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(experience.ote, experience.currency || "USD")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(experience)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(experience.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Chart View
        (() => {
          const experiencesWithOte = experiences
            .filter(exp => exp.ote)
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

          if (experiencesWithOte.length === 0) {
            return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No salary data yet</h3>
                  <p className="text-slate-500 mt-1 mb-4 text-center max-w-md">
                    Add OTE/salary to your experiences to see your compensation progression
                  </p>
                  <Button variant="outline" onClick={() => setViewMode("list")}>
                    Switch to List View
                  </Button>
                </CardContent>
              </Card>
            );
          }

          const chartData = experiencesWithOte.map((exp, index) => {
            const prevOte = index > 0 ? experiencesWithOte[index - 1].ote : null;
            const percentChange = prevOte && exp.ote ? ((exp.ote - prevOte) / prevOte) * 100 : null;
            return {
              date: new Date(exp.start_date).getTime(),
              year: new Date(exp.start_date).getFullYear(),
              ote: exp.ote,
              currency: exp.currency || "USD",
              company: exp.company_name,
              title: exp.job_title,
              logo: getCompanyLogoUrl(exp.company_website),
              isCurrent: exp.is_current,
              percentChange,
            };
          });

          const formatOteShort = (ote: number) => {
            if (ote >= 1000000) return `${(ote / 1000000).toFixed(1)}M`;
            if (ote >= 1000) return `${Math.round(ote / 1000)}k`;
            return ote.toString();
          };

          // Consistent green color for all price tags (money theme)
          const tagColor = { bg: "#dcfce7", border: "#22c55e", text: "#15803d" };

          const CustomDot = (props: { cx?: number; cy?: number; payload?: typeof chartData[0]; index?: number }) => {
            const { cx, cy, payload } = props;
            if (!cx || !cy || !payload) return null;

            const currencySymbol = CURRENCIES.find(c => c.value === payload.currency)?.symbol || "$";
            const oteLabel = payload.ote ? `${currencySymbol}${formatOteShort(payload.ote)}` : "";

            const tagWidth = oteLabel.length * 8 + 16;
            const tagHeight = 24;

            return (
              <g>
                <circle cx={cx} cy={cy} r={20} fill="white" stroke="#e2e8f0" strokeWidth={2} />
                {payload.logo && (
                  <image
                    x={cx - 12}
                    y={cy - 12}
                    width={24}
                    height={24}
                    href={payload.logo}
                    clipPath="inset(0% round 4px)"
                  />
                )}
                {/* Price tag style OTE label */}
                {payload.ote && (
                  <g>
                    {/* Tag connector line */}
                    <line
                      x1={cx}
                      y1={cy + 20}
                      x2={cx}
                      y2={cy + 30}
                      stroke={tagColor.border}
                      strokeWidth={2}
                    />
                    {/* Tag body */}
                    <rect
                      x={cx - tagWidth / 2}
                      y={cy + 30}
                      width={tagWidth}
                      height={tagHeight}
                      rx={4}
                      fill={tagColor.bg}
                      stroke={tagColor.border}
                      strokeWidth={1.5}
                    />
                    {/* Price text */}
                    <text
                      x={cx}
                      y={cy + 46}
                      textAnchor="middle"
                      fill={tagColor.text}
                      fontSize={12}
                      fontWeight={700}
                    >
                      {oteLabel}
                    </text>
                  </g>
                )}
              </g>
            );
          };

          // Render percentage badges at true midpoints between experiences
          const PercentageBadges = (props: { xAxisMap?: Record<string, { scale: (v: number) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }> }) => {
            const { xAxisMap, yAxisMap } = props;
            if (!xAxisMap || !yAxisMap) return null;

            const xScale = Object.values(xAxisMap)[0]?.scale;
            const yScale = Object.values(yAxisMap)[0]?.scale;
            if (!xScale || !yScale) return null;

            return (
              <g>
                {chartData.map((data, index) => {
                  if (index === 0 || !data.percentChange) return null;
                  const prevData = chartData[index - 1];

                  // Get exact pixel positions for both points
                  const x1 = xScale(prevData.year);
                  const y1 = yScale(prevData.ote || 0);
                  const x2 = xScale(data.year);
                  const y2 = yScale(data.ote || 0);

                  // True midpoint of the line segment
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  const isPositive = data.percentChange >= 0;
                  const label = `${isPositive ? "+" : ""}${Math.round(data.percentChange)}%`;

                  return (
                    <g key={`pct-${index}`}>
                      {/* Badge positioned at the midpoint of the line */}
                      <rect
                        x={midX - 28}
                        y={midY - 12}
                        width={56}
                        height={24}
                        rx={12}
                        fill={isPositive ? "#dcfce7" : "#fee2e2"}
                        stroke={isPositive ? "#22c55e" : "#ef4444"}
                        strokeWidth={1.5}
                      />
                      <text
                        x={midX}
                        y={midY + 5}
                        textAnchor="middle"
                        fill={isPositive ? "#16a34a" : "#dc2626"}
                        fontSize={13}
                        fontWeight={700}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          };

          const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
            if (!active || !payload || !payload.length) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
                <p className="font-medium text-slate-900">{data.title}</p>
                <p className="text-sm text-slate-600">{data.company}</p>
                <p className="text-sm font-medium text-green-600 mt-1">
                  {formatCurrency(data.ote!, data.currency)}
                </p>
                <p className="text-xs text-slate-500 mt-1">{data.year}</p>
              </div>
            );
          };

          const maxOte = Math.max(...chartData.map(d => d.ote!));
          const padding = maxOte * 0.15;

          // Calculate stats
          const firstOte = chartData[0]?.ote || 0;
          const lastOte = chartData[chartData.length - 1]?.ote || 0;
          const totalGrowth = firstOte > 0 ? ((lastOte - firstOte) / firstOte) * 100 : 0;
          const firstYear = chartData[0]?.year || 0;
          const lastYear = chartData[chartData.length - 1]?.year || 0;
          const yearsTracked = lastYear - firstYear;
          const avgAnnualGrowth = yearsTracked > 0 ? totalGrowth / yearsTracked : 0;
          const totalRoles = chartData.length;

          return (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Compensation Progression
                </CardTitle>
                <CardDescription>
                  Your salary growth over time
                </CardDescription>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {totalGrowth >= 0 ? "+" : ""}{Math.round(totalGrowth)}%
                    </p>
                    <p className="text-xs text-slate-500">Total Growth</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {avgAnnualGrowth >= 0 ? "+" : ""}{avgAnnualGrowth.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Avg. per Year</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{yearsTracked}</p>
                    <p className="text-xs text-slate-500">Years Tracked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{totalRoles}</p>
                    <p className="text-xs text-slate-500">Roles</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, maxOte + padding]}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="ote"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={<CustomDot />}
                        activeDot={{ r: 24, fill: "#3b82f6", stroke: "white", strokeWidth: 3 }}
                      />
                      <Customized component={PercentageBadges} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}
    </div>
  );
}

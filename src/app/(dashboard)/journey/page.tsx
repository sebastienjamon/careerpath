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
import { Plus, Briefcase, Calendar, MapPin, Edit2, Trash2, Linkedin, Sparkles, ChevronRight } from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";

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
  created_at: string;
  updated_at: string;
}

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
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddStep, setQuickAddStep] = useState(0);
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
  });
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExperiences();
    fetchLinkedinUrl();
  }, []);

  const fetchLinkedinUrl = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("linkedin_profile_url")
      .eq("id", user.id)
      .single();

    if (data?.linkedin_profile_url) {
      setLinkedinUrl(data.linkedin_profile_url);
    }
  };

  const saveLinkedinUrl = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({ linkedin_profile_url: linkedinUrl })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save LinkedIn URL");
      return;
    }

    toast.success("LinkedIn profile saved!");
    setIsQuickAddOpen(true);
  };

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
    });
    setEditingExperience(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Career Journey</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Track your professional experiences over time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setIsQuickAddOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Quick Add
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

      {/* LinkedIn Import Card */}
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
                  Add your LinkedIn profile URL and quickly add your work history
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Input
                  placeholder="linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Button onClick={saveLinkedinUrl} disabled={!linkedinUrl} className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Start
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {linkedinUrl && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <Linkedin className="h-4 w-4 text-blue-600" />
                <span>Reference your profile:</span>
                <a
                  href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate max-w-xs"
                >
                  {linkedinUrl}
                </a>
              </div>
            )}

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
            <p className="text-slate-500 mt-1 mb-4">
              Start building your career timeline by adding your first experience
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Experience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-4 sm:space-y-6">
            {experiences.map((experience, index) => (
              <div key={experience.id} className="relative flex gap-3 sm:gap-6">
                {/* Timeline dot with company logo */}
                {(() => {
                  const logoUrl = getCompanyLogoUrl(experience.company_website);
                  const showLogo = logoUrl && !failedLogos.has(experience.id);
                  return (
                    <div
                      className={`relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border shadow-sm overflow-hidden flex-shrink-0 ${
                        showLogo
                          ? "bg-white border-slate-200"
                          : experience.is_current
                          ? "bg-green-100 text-green-600 border-green-200"
                          : "bg-blue-100 text-blue-600 border-blue-200"
                      }`}
                    >
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
                        <Briefcase className="h-4 w-4" />
                      )}
                    </div>
                  );
                })()}

                {/* Content card */}
                <Card className="flex-1 min-w-0">
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{experience.job_title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{experience.company_name}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {experience.is_current && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Current</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(experience)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(experience.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                      <Calendar className="h-3 w-3" />
                      {formatDate(experience.start_date)} -{" "}
                      {experience.is_current
                        ? "Present"
                        : experience.end_date
                        ? formatDate(experience.end_date)
                        : "N/A"}
                    </div>

                    {experience.description && (
                      <p className="text-sm text-slate-600 mb-3">{experience.description}</p>
                    )}

                    {experience.skills && experience.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {experience.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

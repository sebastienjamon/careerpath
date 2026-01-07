"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import Link from "next/link";
import {
  Award,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Calendar,
  ArrowRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

interface CareerExperience {
  id: string;
  company_name: string;
  company_website: string | null;
  job_title: string;
}

interface CareerHighlight {
  id: string;
  user_id: string;
  career_experience_id: string | null;
  company_name: string;
  company_website: string | null;
  title: string;
  achievement_date: string | null;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  reflection: string | null;
  reflection_tags: string[];
  created_at: string;
  updated_at: string;
}

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

export default function HighlightsPage() {
  const supabase = createClient();
  const [highlights, setHighlights] = useState<CareerHighlight[]>([]);
  const [experiences, setExperiences] = useState<CareerExperience[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<CareerHighlight | null>(null);
  const [isTagging, setIsTagging] = useState(false);
  const [isReflectionTagging, setIsReflectionTagging] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    company_name: "",
    company_website: "",
    career_experience_id: "",
    achievement_month: "",
    achievement_year: "",
    situation: "",
    task: "",
    action: "",
    result: "",
    tags: [] as string[],
    reflection: "",
    reflection_tags: [] as string[],
  });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoading(true);

    const [highlightsResult, experiencesResult, categoriesResult] = await Promise.all([
      supabase
        .from("career_highlights")
        .select("*")
        .eq("user_id", user.id)
        .order("achievement_date", { ascending: false, nullsFirst: false }),
      supabase
        .from("career_experiences")
        .select("id, company_name, company_website, job_title")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("user_highlight_categories")
        .select("name")
        .eq("user_id", user.id),
    ]);

    if (highlightsResult.data) {
      setHighlights(highlightsResult.data);
    }
    if (experiencesResult.data) {
      setExperiences(experiencesResult.data);
    }
    if (categoriesResult.data) {
      setCategories(categoriesResult.data.map(c => c.name));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseDate = (date: string | null) => {
    if (!date) return { month: "", year: "" };
    const parts = date.split("-");
    return { year: parts[0] || "", month: parts[1] || "" };
  };

  const resetForm = () => {
    setFormData({
      title: "",
      company_name: "",
      company_website: "",
      career_experience_id: "",
      achievement_month: "",
      achievement_year: "",
      situation: "",
      task: "",
      action: "",
      result: "",
      tags: [],
      reflection: "",
      reflection_tags: [],
    });
    setEditingHighlight(null);
  };

  const handleExperienceSelect = (experienceId: string) => {
    if (experienceId === "none") {
      setFormData({
        ...formData,
        career_experience_id: "",
        company_name: "",
        company_website: "",
      });
      return;
    }

    const experience = experiences.find(e => e.id === experienceId);
    if (experience) {
      setFormData({
        ...formData,
        career_experience_id: experienceId,
        company_name: experience.company_name,
        company_website: experience.company_website || "",
      });
    }
  };

  const handleEdit = (highlight: CareerHighlight) => {
    const { month, year } = parseDate(highlight.achievement_date);
    setEditingHighlight(highlight);
    setFormData({
      title: highlight.title,
      company_name: highlight.company_name,
      company_website: highlight.company_website || "",
      career_experience_id: highlight.career_experience_id || "",
      achievement_month: month,
      achievement_year: year,
      situation: highlight.situation,
      task: highlight.task,
      action: highlight.action,
      result: highlight.result,
      tags: highlight.tags || [],
      reflection: highlight.reflection || "",
      reflection_tags: highlight.reflection_tags || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this highlight?")) return;

    const { error } = await supabase
      .from("career_highlights")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete highlight");
      return;
    }

    toast.success("Highlight deleted");
    fetchData();
  };

  const generateTags = async () => {
    if (!formData.situation || !formData.task || !formData.action || !formData.result) {
      toast.error("Please fill in all STAR fields first");
      return;
    }

    setIsTagging(true);

    try {
      const response = await fetch("/api/highlights/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: formData.situation,
          task: formData.task,
          action: formData.action,
          result: formData.result,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tags");
      }

      const data = await response.json();
      setFormData({ ...formData, tags: data.tags });
      toast.success("Tags generated!");
    } catch {
      toast.error("Failed to generate tags");
    } finally {
      setIsTagging(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const generateReflectionTags = async () => {
    if (!formData.reflection || formData.reflection.trim().length < 10) {
      toast.error("Please write a meaningful reflection first");
      return;
    }

    setIsReflectionTagging(true);

    try {
      const response = await fetch("/api/highlights/reflection-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflection: formData.reflection,
          title: formData.title,
          result: formData.result,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tags");
      }

      const data = await response.json();
      setFormData({ ...formData, reflection_tags: data.tags });
      toast.success("Values tags generated!");
    } catch {
      toast.error("Failed to generate tags");
    } finally {
      setIsReflectionTagging(false);
    }
  };

  const removeReflectionTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      reflection_tags: formData.reflection_tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const achievementDate = formData.achievement_month && formData.achievement_year
      ? `${formData.achievement_year}-${formData.achievement_month}-01`
      : null;

    const highlightData = {
      user_id: user.id,
      career_experience_id: formData.career_experience_id || null,
      company_name: formData.company_name,
      company_website: formData.company_website || null,
      title: formData.title,
      achievement_date: achievementDate,
      situation: formData.situation,
      task: formData.task,
      action: formData.action,
      result: formData.result,
      tags: formData.tags,
      reflection: formData.reflection || null,
      reflection_tags: formData.reflection_tags,
    };

    if (editingHighlight) {
      const { error } = await supabase
        .from("career_highlights")
        .update(highlightData)
        .eq("id", editingHighlight.id);

      if (error) {
        toast.error("Failed to update highlight");
        return;
      }
      toast.success("Highlight updated");
    } else {
      const { error } = await supabase
        .from("career_highlights")
        .insert(highlightData);

      if (error) {
        toast.error("Failed to add highlight");
        return;
      }
      toast.success("Highlight added");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchData();
  };

  const getCompanyLogo = (website: string | null) => {
    if (!website) return null;
    const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  const filteredHighlights = activeFilter === "all"
    ? highlights
    : highlights.filter(h => h.tags?.includes(activeFilter));

  // Get unique tags from all highlights
  const allTags = [...new Set(highlights.flatMap(h => h.tags || []))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Career Highlights</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Record achievements using STAR method for interview preparation
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Highlight
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHighlight ? "Edit Highlight" : "Add Highlight"}
              </DialogTitle>
              <DialogDescription>
                Record a career achievement using the STAR method
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Achievement Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Increased ARR by 40% through strategic account expansion"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Link to Experience */}
              <div className="space-y-2">
                <Label>Link to Experience (Optional)</Label>
                <Select
                  value={formData.career_experience_id || "none"}
                  onValueChange={handleExperienceSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (standalone highlight)</SelectItem>
                    {experiences.map((exp) => (
                      <SelectItem key={exp.id} value={exp.id}>
                        {exp.company_name} - {exp.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company *</Label>
                  <Input
                    id="company_name"
                    placeholder="Company name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_website">Website (for logo)</Label>
                  <Input
                    id="company_website"
                    placeholder="e.g., salesforce.com"
                    value={formData.company_website}
                    onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>When did this happen?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={formData.achievement_month}
                    onValueChange={(value) => setFormData({ ...formData, achievement_month: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.achievement_year}
                    onValueChange={(value) => setFormData({ ...formData, achievement_year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* STAR Fields */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-slate-900">STAR Method</h3>

                <div className="space-y-2">
                  <Label htmlFor="situation">
                    <span className="font-semibold text-blue-600">S</span>ituation *
                  </Label>
                  <Textarea
                    id="situation"
                    placeholder="Describe the context and background..."
                    value={formData.situation}
                    onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task">
                    <span className="font-semibold text-blue-600">T</span>ask *
                  </Label>
                  <Textarea
                    id="task"
                    placeholder="What was required of you? What was the challenge?"
                    value={formData.task}
                    onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action">
                    <span className="font-semibold text-blue-600">A</span>ction *
                  </Label>
                  <Textarea
                    id="action"
                    placeholder="What specific actions did you take?"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="result">
                    <span className="font-semibold text-blue-600">R</span>esult *
                  </Label>
                  <Textarea
                    id="result"
                    placeholder="What was the outcome? Include measurable impact..."
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">
                    Skills <span className="text-slate-400 font-normal">(from STAR)</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateTags}
                    disabled={isTagging}
                    className="gap-2"
                  >
                    {isTagging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </div>
                {formData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 pr-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Fill in STAR fields and click Generate
                  </p>
                )}
              </div>

              {/* Reflection Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="font-medium text-slate-900">What This Demonstrates</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Optional: Explain why this highlight matters and what personal values it shows
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reflection">Your Reflection</Label>
                  <Textarea
                    id="reflection"
                    placeholder="What makes this achievement meaningful? What does it say about your character, values, or approach? (e.g., demonstrates integrity by..., shows collaboration through...)"
                    value={formData.reflection}
                    onChange={(e) => setFormData({ ...formData, reflection: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Values Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-700">
                      Values <span className="text-slate-400 font-normal">(from reflection)</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateReflectionTags}
                      disabled={isReflectionTagging || !formData.reflection}
                      className="gap-2"
                    >
                      {isReflectionTagging ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                  {formData.reflection_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.reflection_tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 pr-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeReflectionTag(tag)}
                            className="ml-1 hover:bg-emerald-300 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Write a reflection and click Generate to identify values
                    </p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingHighlight ? "Update" : "Add"} Highlight
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
          >
            All ({highlights.length})
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={activeFilter === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(tag)}
            >
              {tag} ({highlights.filter(h => h.tags?.includes(tag)).length})
            </Button>
          ))}
        </div>
      )}

      {/* Highlights Grid */}
      {filteredHighlights.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHighlights.map((highlight) => (
            <Card
              key={highlight.id}
              className="hover:shadow-lg transition-shadow flex flex-col"
            >
              <CardContent className="p-4 flex flex-col flex-1">
                {/* Header with Logo and Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  {/* Company Logo */}
                  {getCompanyLogo(highlight.company_website) ? (
                    <img
                      src={getCompanyLogo(highlight.company_website)!}
                      alt=""
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        handleEdit(highlight);
                      }}
                      className="h-7 w-7"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(highlight.id);
                      }}
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">
                  {highlight.title}
                </h3>

                {/* Company with Highlighter + Date */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span className="bg-yellow-200 px-1.5 py-0.5 rounded font-medium text-slate-800">
                    {highlight.company_name}
                  </span>
                  {highlight.achievement_date && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(highlight.achievement_date).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>

                {/* Result Preview with Highlighter */}
                <p className="text-xs text-slate-600 line-clamp-3 flex-1">
                  <span className="bg-emerald-200 px-1 py-0.5 rounded font-semibold text-emerald-900">Result:</span>{" "}
                  {highlight.result}
                </p>

                {/* Tags - Two Groups */}
                <div className="mt-3 space-y-2">
                  {/* Skills Tags */}
                  {highlight.tags && highlight.tags.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Skills</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {highlight.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Values Tags */}
                  {highlight.reflection_tags && highlight.reflection_tags.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Values</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {highlight.reflection_tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Full STAR Link */}
                <Link
                  href={`/highlights/${highlight.id}`}
                  className="mt-3 pt-3 border-t flex items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View Full STAR
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-1">
              {activeFilter === "all" ? "No highlights yet" : `No highlights tagged with "${activeFilter}"`}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              {activeFilter === "all"
                ? "Record your career achievements to prepare for interviews"
                : "Try selecting a different filter or add new highlights"}
            </p>
            {activeFilter === "all" ? (
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Highlight
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setActiveFilter("all")}>
                Clear Filter
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

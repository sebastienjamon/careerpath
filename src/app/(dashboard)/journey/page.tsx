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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Briefcase, Calendar, MapPin, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CareerExperience {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  skills: string[];
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export default function JourneyPage() {
  const supabase = createClient();
  const [experiences, setExperiences] = useState<CareerExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<CareerExperience | null>(null);

  const [formData, setFormData] = useState({
    company_name: "",
    job_title: "",
    start_date: "",
    end_date: "",
    description: "",
    skills: "",
    is_current: false,
  });

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    const { data, error } = await supabase
      .from("career_experiences")
      .select("*")
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

    const experienceData = {
      user_id: user.id,
      company_name: formData.company_name,
      job_title: formData.job_title,
      start_date: formData.start_date,
      end_date: formData.is_current ? null : formData.end_date || null,
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
    setFormData({
      company_name: experience.company_name,
      job_title: experience.job_title,
      start_date: experience.start_date,
      end_date: experience.end_date || "",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Career Journey</h1>
          <p className="text-slate-600 mt-1">Track your professional experiences over time</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    disabled={formData.is_current}
                  />
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe your responsibilities and achievements..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData({ ...formData, skills: e.target.value })
                  }
                  placeholder="React, TypeScript, Node.js"
                />
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
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-6">
            {experiences.map((experience, index) => (
              <div key={experience.id} className="relative flex gap-6">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-sm ${
                    experience.is_current
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Briefcase className="h-6 w-6" />
                </div>

                {/* Content card */}
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{experience.job_title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {experience.company_name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {experience.is_current && (
                          <Badge className="bg-green-100 text-green-700">Current</Badge>
                        )}
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
                  </CardHeader>
                  <CardContent>
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

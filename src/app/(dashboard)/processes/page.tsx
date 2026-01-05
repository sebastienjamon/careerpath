"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus,
  Target,
  Building2,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface RecruitmentProcess {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_url: string | null;
  status: 'upcoming' | 'in_progress' | 'completed' | 'rejected' | 'offer_received' | 'accepted';
  applied_date: string | null;
  source: 'linkedin' | 'referral' | 'direct' | 'other';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { value: "completed", label: "Completed", color: "bg-slate-100 text-slate-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "offer_received", label: "Offer Received", color: "bg-green-100 text-green-700" },
  { value: "accepted", label: "Accepted", color: "bg-green-100 text-green-700" },
];

const SOURCE_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "direct", label: "Direct Application" },
  { value: "other", label: "Other" },
];

export default function ProcessesPage() {
  const supabase = createClient();
  const [processes, setProcesses] = useState<RecruitmentProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<RecruitmentProcess | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState({
    company_name: "",
    job_title: "",
    job_url: "",
    status: "upcoming" as RecruitmentProcess["status"],
    source: "other" as RecruitmentProcess["source"],
    applied_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    const { data, error } = await supabase
      .from("recruitment_processes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load processes");
      return;
    }

    setProcesses(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const processData = {
      user_id: user.id,
      company_name: formData.company_name,
      job_title: formData.job_title,
      job_url: formData.job_url || null,
      status: formData.status,
      source: formData.source,
      applied_date: formData.applied_date || null,
      notes: formData.notes || null,
    };

    if (editingProcess) {
      const { error } = await supabase
        .from("recruitment_processes")
        .update(processData)
        .eq("id", editingProcess.id);

      if (error) {
        toast.error("Failed to update process");
        return;
      }
      toast.success("Process updated");
    } else {
      const { error } = await supabase.from("recruitment_processes").insert(processData);

      if (error) {
        toast.error("Failed to add process");
        return;
      }
      toast.success("Process added");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchProcesses();
  };

  const handleEdit = (process: RecruitmentProcess) => {
    setEditingProcess(process);
    setFormData({
      company_name: process.company_name,
      job_title: process.job_title,
      job_url: process.job_url || "",
      status: process.status,
      source: process.source,
      applied_date: process.applied_date || "",
      notes: process.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this process?")) return;

    const { error } = await supabase.from("recruitment_processes").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete process");
      return;
    }

    toast.success("Process deleted");
    fetchProcesses();
  };

  const handleStatusChange = async (id: string, status: RecruitmentProcess["status"]) => {
    const { error } = await supabase
      .from("recruitment_processes")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated");
    fetchProcesses();
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      job_title: "",
      job_url: "",
      status: "upcoming",
      source: "other",
      applied_date: "",
      notes: "",
    });
    setEditingProcess(null);
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge>{status}</Badge>
    );
  };

  const filteredProcesses = processes.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return p.status === "in_progress" || p.status === "upcoming";
    return p.status === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment Processes</h1>
          <p className="text-slate-600 mt-1">Track and manage your job applications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Process
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? "Edit Process" : "New Recruitment Process"}
              </DialogTitle>
              <DialogDescription>
                Add a new job application to track
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

              <div className="space-y-2">
                <Label htmlFor="job_url">Job URL (optional)</Label>
                <Input
                  id="job_url"
                  type="url"
                  value={formData.job_url}
                  onChange={(e) =>
                    setFormData({ ...formData, job_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as RecruitmentProcess["status"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value as RecruitmentProcess["source"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applied_date">Applied Date</Label>
                <Input
                  id="applied_date"
                  type="date"
                  value={formData.applied_date}
                  onChange={(e) =>
                    setFormData({ ...formData, applied_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProcess ? "Update" : "Add"} Process
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({processes.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({processes.filter((p) => p.status === "in_progress" || p.status === "upcoming").length})
          </TabsTrigger>
          <TabsTrigger value="offer_received">
            Offers ({processes.filter((p) => p.status === "offer_received").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({processes.filter((p) => p.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredProcesses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No processes yet</h3>
                <p className="text-slate-500 mt-1 mb-4">
                  Start tracking your job applications
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Process
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProcesses.map((process) => (
                <Card key={process.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {process.company_name}
                            </h3>
                            {process.job_url && (
                              <a
                                href={process.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{process.job_title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {process.applied_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Applied {new Date(process.applied_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="capitalize">via {process.source}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Select
                          value={process.status}
                          onValueChange={(value) =>
                            handleStatusChange(process.id, value as RecruitmentProcess["status"])
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            {getStatusBadge(process.status)}
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(process)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(process.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/processes/${process.id}`}>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

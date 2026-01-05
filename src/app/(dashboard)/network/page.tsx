"use client";

import { useEffect, useState } from "react";
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
import { Plus, Users, Linkedin, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface NetworkConnection {
  id: string;
  user_id: string;
  name: string;
  linkedin_url: string | null;
  company: string | null;
  role: string | null;
  relationship_strength: 'strong' | 'medium' | 'weak';
  can_help_with: string[];
  last_contacted: string | null;
  created_at: string;
  updated_at: string;
}

const STRENGTH_OPTIONS = [
  { value: "strong", label: "Strong", color: "bg-green-100 text-green-700" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "weak", label: "Weak", color: "bg-slate-100 text-slate-700" },
];

export default function NetworkPage() {
  const supabase = createClient();
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<NetworkConnection | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    linkedin_url: "",
    company: "",
    role: "",
    relationship_strength: "medium" as NetworkConnection["relationship_strength"],
    can_help_with: "",
    last_contacted: "",
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data, error } = await supabase
      .from("network_connections")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load connections");
      return;
    }

    setConnections(data || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const connectionData = {
      user_id: user.id,
      name: formData.name,
      linkedin_url: formData.linkedin_url || null,
      company: formData.company || null,
      role: formData.role || null,
      relationship_strength: formData.relationship_strength,
      can_help_with: formData.can_help_with ? formData.can_help_with.split(",").map((s) => s.trim()) : [],
      last_contacted: formData.last_contacted || null,
    };

    if (editingConnection) {
      const { error } = await supabase
        .from("network_connections")
        .update(connectionData)
        .eq("id", editingConnection.id);

      if (error) {
        toast.error("Failed to update connection");
        return;
      }
      toast.success("Connection updated");
    } else {
      const { error } = await supabase.from("network_connections").insert(connectionData);

      if (error) {
        toast.error("Failed to add connection");
        return;
      }
      toast.success("Connection added");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchConnections();
  };

  const handleEdit = (connection: NetworkConnection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      linkedin_url: connection.linkedin_url || "",
      company: connection.company || "",
      role: connection.role || "",
      relationship_strength: connection.relationship_strength,
      can_help_with: connection.can_help_with?.join(", ") || "",
      last_contacted: connection.last_contacted || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;

    const { error } = await supabase.from("network_connections").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete connection");
      return;
    }

    toast.success("Connection deleted");
    fetchConnections();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      linkedin_url: "",
      company: "",
      role: "",
      relationship_strength: "medium",
      can_help_with: "",
      last_contacted: "",
    });
    setEditingConnection(null);
  };

  const getStrengthBadge = (strength: string) => {
    const option = STRENGTH_OPTIONS.find((o) => o.value === strength);
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge>{strength}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network</h1>
          <p className="text-slate-600 mt-1">Manage your professional connections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConnection ? "Edit Connection" : "Add Connection"}
              </DialogTitle>
              <DialogDescription>
                Add a professional contact to your network
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship_strength">Relationship Strength</Label>
                  <Select
                    value={formData.relationship_strength}
                    onValueChange={(value) =>
                      setFormData({ ...formData, relationship_strength: value as NetworkConnection["relationship_strength"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRENGTH_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_contacted">Last Contacted</Label>
                  <Input
                    id="last_contacted"
                    type="date"
                    value={formData.last_contacted}
                    onChange={(e) => setFormData({ ...formData, last_contacted: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="can_help_with">Can Help With (comma-separated)</Label>
                <Textarea
                  id="can_help_with"
                  value={formData.can_help_with}
                  onChange={(e) => setFormData({ ...formData, can_help_with: e.target.value })}
                  placeholder="Referrals, Interview prep, Industry insights"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingConnection ? "Update" : "Add"} Connection
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
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No connections yet</h3>
            <p className="text-slate-500 mt-1 mb-4">
              Start building your professional network
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                      {connection.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{connection.name}</h3>
                        {connection.linkedin_url && (
                          <a
                            href={connection.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {(connection.role || connection.company) && (
                        <p className="text-sm text-slate-600">
                          {connection.role}{connection.role && connection.company && " at "}{connection.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(connection)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(connection.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {getStrengthBadge(connection.relationship_strength)}
                  {connection.last_contacted && (
                    <span className="text-xs text-slate-500">
                      Last contacted: {new Date(connection.last_contacted).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {connection.can_help_with && connection.can_help_with.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {connection.can_help_with.map((help, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {help}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

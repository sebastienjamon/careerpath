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
  email: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  company: string | null;
  role: string | null;
  relationship_strength: 'strong' | 'medium' | 'weak';
  can_help_with: string[];
  last_contacted: string | null;
  created_at: string;
  updated_at: string;
}

// Get avatar URL - prioritize custom URL, then unavatar.io with email, then DiceBear
const getAvatarUrl = (connection: NetworkConnection, useFallback = false): string => {
  if (!useFallback) {
    if (connection.avatar_url) return connection.avatar_url;
    if (connection.email) return `https://unavatar.io/${encodeURIComponent(connection.email)}?fallback=false`;
  }
  // DiceBear notionists-neutral - clean, consistent illustrated avatars
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(connection.name)}&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4`;
};

// Get preview avatar for form
const getPreviewAvatarUrl = (name: string, email: string, avatarUrl: string, useFallback = false): string | null => {
  if (!useFallback) {
    if (avatarUrl) return avatarUrl;
    if (email) return `https://unavatar.io/${encodeURIComponent(email)}?fallback=false`;
  }
  if (name) return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4`;
  return null;
};

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
    email: "",
    linkedin_url: "",
    avatar_url: "",
    company: "",
    role: "",
    relationship_strength: "medium" as NetworkConnection["relationship_strength"],
    can_help_with: "",
    last_contacted: "",
  });
  const [avatarError, setAvatarError] = useState<Record<string, boolean>>({});
  const [formAvatarError, setFormAvatarError] = useState(false);

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
      email: formData.email || null,
      linkedin_url: formData.linkedin_url || null,
      avatar_url: formData.avatar_url || null,
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
      email: connection.email || "",
      linkedin_url: connection.linkedin_url || "",
      avatar_url: connection.avatar_url || "",
      company: connection.company || "",
      role: connection.role || "",
      relationship_strength: connection.relationship_strength,
      can_help_with: connection.can_help_with?.join(", ") || "",
      last_contacted: connection.last_contacted || "",
    });
    setFormAvatarError(false);
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
      email: "",
      linkedin_url: "",
      avatar_url: "",
      company: "",
      role: "",
      relationship_strength: "medium",
      can_help_with: "",
      last_contacted: "",
    });
    setEditingConnection(null);
    setFormAvatarError(false);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Network</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage your professional connections</p>
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
              {/* Avatar Preview */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getPreviewAvatarUrl(formData.name, formData.email, formData.avatar_url, formAvatarError) ? (
                    <img
                      src={getPreviewAvatarUrl(formData.name, formData.email, formData.avatar_url, formAvatarError)!}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                      onError={() => {
                        if ((formData.avatar_url || formData.email) && !formAvatarError) {
                          setFormAvatarError(true);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-purple-600 font-semibold text-xl">?</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600">
                    Each contact gets a unique avatar. Add email for their real photo, or paste a custom URL.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (for avatar)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setFormAvatarError(false);
                    }}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="avatar_url">Custom Avatar URL (optional)</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => {
                    setFormData({ ...formData, avatar_url: e.target.value });
                    setFormAvatarError(false);
                  }}
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-slate-500">
                  Paste a direct link to their photo if email lookup doesn&apos;t work
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => {
            const hasCustomAvatar = connection.avatar_url || connection.email;
            const avatarUrl = avatarError[connection.id]
              ? getAvatarUrl(connection, true)  // Use DiceBear fallback
              : getAvatarUrl(connection);
            return (
              <Card key={connection.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={avatarUrl}
                          alt={connection.name}
                          className="h-full w-full object-cover"
                          onError={() => {
                            if (hasCustomAvatar && !avatarError[connection.id]) {
                              setAvatarError(prev => ({ ...prev, [connection.id]: true }));
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">{connection.name}</h3>
                          {connection.linkedin_url && (
                            <a
                              href={connection.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 flex-shrink-0"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        {(connection.role || connection.company) && (
                          <p className="text-sm text-slate-600 truncate">
                            {connection.role}{connection.role && connection.company && " at "}{connection.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(connection)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(connection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {getStrengthBadge(connection.relationship_strength)}
                    {connection.last_contacted && (
                      <span className="text-xs text-slate-500">
                        Last: {new Date(connection.last_contacted).toLocaleDateString()}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Linkedin, Edit2, Trash2, RefreshCw } from "lucide-react";
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

// DiceBear open-peeps base URL (excluding cyclops and eyesClosed faces)
const DICEBEAR_BASE = "https://api.dicebear.com/9.x/open-peeps/svg";
const DICEBEAR_OPTIONS = "face=angryWithFang,awe,blank,calm,cheeky,concerned,concernedFear,contempt,cute,driven,eatingHappy,explaining,fear,hectic,lovingGrin1,lovingGrin2,monster,old,rage,serious,smile,smileBig,smileLOL,smileTeethGap,solemn,suspicious,tired,veryAngry&backgroundColor=c0aede,d1d4f9,ffd5dc,ffdfbf,b6e3f4";

// Generate DiceBear avatar URL with seed
const getDiceBearUrl = (seed: string): string => {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}&${DICEBEAR_OPTIONS}`;
};

// Get avatar URL for a connection - use stored avatar_url or generate from name
const getAvatarUrl = (connection: NetworkConnection): string => {
  if (connection.avatar_url) return connection.avatar_url;
  return getDiceBearUrl(connection.name);
};

// Get preview avatar for form with seed variation
const getPreviewAvatarUrl = (name: string, seed: number): string | null => {
  if (!name) return null;
  // Add seed number to name for variation
  const seedString = seed === 0 ? name : `${name}-${seed}`;
  return getDiceBearUrl(seedString);
};

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
    company: "",
    role: "",
  });
  const [avatarSeed, setAvatarSeed] = useState(0); // For cycling through avatar variations

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("network_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load connections:", error);
      toast.error("Failed to load connections");
      return;
    }

    setConnections(data || []);
    setIsLoading(false);
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
          // Update URL and auto-fill name (only if not already filled)
          setFormData(prev => ({
            ...prev,
            linkedin_url: url,
            name: prev.name || data.name,
          }));
          toast.success("Name auto-filled from LinkedIn");
          return;
        }
      } catch {
        // Fall through to just update URL
      }
    }

    // Just update the URL if not valid or fetch failed
    setFormData(prev => ({ ...prev, linkedin_url: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate the avatar URL based on current seed
    const selectedAvatarUrl = getPreviewAvatarUrl(formData.name, avatarSeed);

    const connectionData = {
      user_id: user.id,
      name: formData.name,
      email: formData.email || null,
      linkedin_url: formData.linkedin_url || null,
      avatar_url: selectedAvatarUrl,
      company: formData.company || null,
      role: formData.role || null,
      relationship_strength: "medium" as const,
      can_help_with: [] as string[],
      last_contacted: null,
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
      company: connection.company || "",
      role: connection.role || "",
    });
    setAvatarSeed(0);
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
      company: "",
      role: "",
    });
    setEditingConnection(null);
    setAvatarSeed(0);
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
              {/* LinkedIn URL - First field for auto-fill */}
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">
                  LinkedIn URL <span className="text-slate-400 font-normal">(paste to auto-fill)</span>
                </Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                    placeholder="linkedin.com/in/john-smith"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Paste a LinkedIn profile URL to auto-fill name and details
                </p>
              </div>

              {/* Avatar Preview with Swap */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getPreviewAvatarUrl(formData.name, avatarSeed) ? (
                      <img
                        src={getPreviewAvatarUrl(formData.name, avatarSeed)!}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-purple-600 font-semibold text-xl">?</span>
                    )}
                  </div>
                  {formData.name && (
                    <button
                      type="button"
                      onClick={() => setAvatarSeed(prev => prev + 1)}
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
                      title="Try another avatar"
                    >
                      <RefreshCw className="h-3 w-3 text-slate-500" />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600">
                    {formData.name ? "Click the swap button to try different avatars" : "Enter a name to see the avatar"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setAvatarSeed(0); // Reset seed when name changes
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
          {connections.map((connection) => (
              <Card key={connection.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={getAvatarUrl(connection)}
                          alt={connection.name}
                          className="h-full w-full object-cover"
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

                  {connection.linkedin_url && (
                    <div className="mt-3">
                      <a
                        href={connection.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </a>
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

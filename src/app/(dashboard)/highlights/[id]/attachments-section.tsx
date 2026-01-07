"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Link2,
  X,
  Plus,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  link_url: string | null;
  link_type: string | null;
  created_at: string;
}

interface AttachmentsSectionProps {
  highlightId: string;
  initialAttachments: Attachment[];
}

const detectLinkType = (url: string): { type: string; name: string } => {
  if (url.includes("docs.google.com/document")) return { type: "google_doc", name: "Google Doc" };
  if (url.includes("docs.google.com/spreadsheets")) return { type: "google_sheet", name: "Google Sheet" };
  if (url.includes("docs.google.com/presentation")) return { type: "google_slide", name: "Google Slides" };
  if (url.includes("drive.google.com")) return { type: "google_drive", name: "Google Drive" };
  if (url.includes("dropbox.com")) return { type: "dropbox", name: "Dropbox" };
  if (url.includes("notion.so") || url.includes("notion.site")) return { type: "notion", name: "Notion" };
  if (url.includes("figma.com")) return { type: "figma", name: "Figma" };
  return { type: "other", name: "Link" };
};

const getLinkTypeColor = (linkType: string | null) => {
  switch (linkType) {
    case "google_doc":
    case "google_sheet":
    case "google_slide":
    case "google_drive":
      return "text-blue-600";
    case "dropbox":
      return "text-blue-500";
    case "notion":
      return "text-slate-800";
    case "figma":
      return "text-purple-600";
    default:
      return "text-slate-600";
  }
};

const getFileIcon = (fileType: string): string => {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("word") || fileType.includes("document")) return "DOC";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "XLS";
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "PPT";
  if (fileType.includes("image")) return "IMG";
  return "FILE";
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const isImageFile = (fileType: string) => {
  return fileType.startsWith("image/");
};

export function AttachmentsSection({ highlightId, initialAttachments }: AttachmentsSectionProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("highlight_attachments")
      .select("*")
      .eq("highlight_id", highlightId)
      .order("created_at", { ascending: false });

    if (data) {
      setAttachments(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("highlightId", highlightId);

    try {
      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      toast.success("File uploaded");
      fetchAttachments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl) {
      toast.error("Please enter a URL");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const linkInfo = detectLinkType(linkUrl);
    const fileName = linkName || linkInfo.name;

    const { error } = await supabase.from("highlight_attachments").insert({
      highlight_id: highlightId,
      user_id: user.id,
      file_name: fileName,
      file_type: "link",
      file_size: 0,
      file_url: linkUrl,
      link_url: linkUrl,
      link_type: linkInfo.type,
    });

    if (error) {
      toast.error("Failed to add link");
      return;
    }

    toast.success("Link added");
    setIsLinkDialogOpen(false);
    setLinkUrl("");
    setLinkName("");
    fetchAttachments();
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm("Delete this attachment?")) return;

    const response = await fetch(`/api/attachments/${attachment.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Attachment deleted");
    fetchAttachments();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Add Link Button */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Link2 className="h-4 w-4" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Document Link</DialogTitle>
                  <DialogDescription>
                    Add a link to Google Drive, Dropbox, Notion, or any URL
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-url">URL *</Label>
                    <Input
                      id="link-url"
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link-name">Name (optional)</Label>
                    <Input
                      id="link-name"
                      placeholder="My Document"
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsLinkDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddLink} className="flex-1">
                      Add Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Upload File Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.zip"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Attachments List */}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group"
              >
                <a
                  href={attachment.link_url || attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80"
                >
                  {/* Icon/Preview */}
                  {isImageFile(attachment.file_type) ? (
                    <div
                      className="w-12 h-12 rounded bg-slate-200 overflow-hidden cursor-pointer flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        setPreviewImage(attachment.file_url);
                      }}
                    >
                      <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                      {attachment.link_type ? (
                        <Link2 className={`h-5 w-5 ${getLinkTypeColor(attachment.link_type)}`} />
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">
                          {getFileIcon(attachment.file_type)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {attachment.link_type
                        ? detectLinkType(attachment.link_url || "").name
                        : formatFileSize(attachment.file_size)}
                    </p>
                  </div>

                  <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </a>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(attachment)}
                  className="ml-2 p-1.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attachments yet</p>
            <p className="text-xs mt-1">Upload files or add document links</p>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Calendar } from "lucide-react";
import { AttachmentsSection } from "./attachments-section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HighlightDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const [highlightResult, attachmentsResult] = await Promise.all([
    supabase
      .from("career_highlights")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("highlight_attachments")
      .select("*")
      .eq("highlight_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: highlight, error } = highlightResult;
  const attachments = attachmentsResult.data || [];

  if (error || !highlight) {
    notFound();
  }

  const getCompanyLogo = (website: string | null) => {
    if (!website) return null;
    const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/highlights">
        <Button variant="ghost" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Highlights
        </Button>
      </Link>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            {getCompanyLogo(highlight.company_website) ? (
              <img
                src={getCompanyLogo(highlight.company_website)!}
                alt=""
                className="w-16 h-16 rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-slate-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                {highlight.title}
              </h1>

              {/* Company with Highlighter + Date */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="bg-yellow-200 px-2 py-1 rounded font-semibold text-slate-800">
                  {highlight.company_name}
                </span>
                {highlight.achievement_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(highlight.achievement_date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Tags - Two Groups */}
              <div className="mt-4 space-y-3">
                {/* Skills Tags */}
                {highlight.tags && highlight.tags.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Skills</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {highlight.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Values Tags */}
                {highlight.reflection_tags && highlight.reflection_tags.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Values</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {highlight.reflection_tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-emerald-100 text-emerald-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STAR Content */}
      <div className="space-y-6">
        {/* Situation */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                S
              </span>
              Situation
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {highlight.situation}
            </p>
          </CardContent>
        </Card>

        {/* Task */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                T
              </span>
              Task
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {highlight.task}
            </p>
          </CardContent>
        </Card>

        {/* Action */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                A
              </span>
              Action
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {highlight.action}
            </p>
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                R
              </span>
              <span className="bg-emerald-200 px-2 py-0.5 rounded text-emerald-800">Result</span>
            </h2>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {highlight.result}
            </p>
          </CardContent>
        </Card>

        {/* Reflection Section */}
        {highlight.reflection && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                  ?
                </span>
                <span className="text-emerald-800">What This Demonstrates</span>
              </h2>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {highlight.reflection}
              </p>
              {highlight.reflection_tags && highlight.reflection_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-emerald-200">
                  {highlight.reflection_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-emerald-100 text-emerald-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attachments */}
      <AttachmentsSection highlightId={id} initialAttachments={attachments} />

      {/* Footer */}
      <div className="flex justify-center pt-4">
        <Link href="/highlights">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Highlights
          </Button>
        </Link>
      </div>
    </div>
  );
}

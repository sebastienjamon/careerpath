"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Award,
  TrendingUp,
  Briefcase,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { remarkMark } from "remark-mark-highlight";

const SUGGESTED_QUESTIONS = [
  {
    short: "Main achievements?",
    full: "What are my main achievements in my previous roles?",
    icon: Award,
  },
  {
    short: "Top skills?",
    full: "What skills do I demonstrate most across my career?",
    icon: TrendingUp,
  },
  {
    short: "Career progression?",
    full: "How would you describe my career progression?",
    icon: Briefcase,
  },
  {
    short: "Team values?",
    full: "What values do I bring to a team based on my experiences?",
    icon: Users,
  },
];

export function CareerAssistant() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsGenerating(true);
    setResponse(null);

    try {
      const res = await fetch("/api/career-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get response");
      }

      const data = await res.json();
      setResponse(data.answer);
      setQuestion("");
    } catch (error) {
      console.error("Career assistant error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestedClick = (fullQuestion: string) => {
    setQuestion(fullQuestion);
    handleAsk(fullQuestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200 ease-in-out overflow-hidden
        ${isExpanded
          ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
          : "bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-100 hover:border-blue-200"
        }
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">
            {isExpanded ? "AI Career Assistant" : "Ask about your career..."}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Collapsed state: show 2 quick action chips */}
          {!isExpanded && !isGenerating && (
            <div className="hidden sm:flex items-center gap-1.5">
              {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
                <button
                  key={q.short}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                    handleSuggestedClick(q.full);
                  }}
                  className="px-2 py-1 text-xs bg-white/80 hover:bg-white text-blue-700 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  {q.short}
                </button>
              ))}
            </div>
          )}

          {isGenerating && (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          )}

          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={`
          transition-all duration-200 ease-in-out
          ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}
          overflow-hidden
        `}
      >
        <div className="px-3 pb-3 space-y-3">
          {/* Subtitle */}
          <p className="text-xs text-slate-500">
            Ask questions about your skills, achievements, and career journey
          </p>

          {/* Suggested questions */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.short}
                  onClick={() => handleSuggestedClick(q.full)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon className="h-3 w-3" />
                  {q.short}
                </button>
              );
            })}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your career..."
              disabled={isGenerating}
              className="flex-1 bg-white text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!question.trim() || isGenerating}
              className="px-3"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Response area */}
          {(isGenerating || response) && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {isGenerating && !response ? (
                <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your career data...
                </div>
              ) : response ? (
                <ScrollArea className="max-h-[300px]">
                  <div className="p-4 prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMark]}
                      components={{
                        mark: ({ children }) => (
                          <mark className="bg-yellow-200 px-0.5 rounded">{children}</mark>
                        ),
                      }}
                    >
                      {response}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Newspaper,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";

interface Disclosure {
  id: string;
  atip_number: string;
  institution: string;
  summary: string;
  url: string;
  pages: number;
  released_date: string;
  ai_headline: string | null;
}

interface GeneratedStory {
  story: string;
  questions: string;
  id: string;
}

export function DisclosureCard({ disclosure }: { disclosure: Disclosure }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  async function generateStory() {
    if (story) {
      setStoryOpen(!storyOpen);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disclosureId: disclosure.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate story");
      }
      const data = await res.json();
      setStory(data);
      setStoryOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  }

  async function copyStory() {
    if (!story) return;
    const text = `${disclosure.ai_headline || "ATIP Disclosure"}\n\n${story.story}\n\n---\n\n${story.questions}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-2 text-[var(--foreground)]">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1 text-[var(--foreground)]">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\. (.+)$/gm, '<div class="ml-4 mb-1">$1. $2</div>')
      .replace(/^• (.+)$/gm, '<div class="ml-4 mb-1 flex gap-2"><span>•</span><span>$1</span></div>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^/, '<p class="mb-3">')
      .replace(/$/, '</p>');
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:border-[var(--muted)]/40 transition-all">
      {/* Top bar */}
      <div className="h-0.5 bg-gradient-to-r from-[var(--accent)] to-orange-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* AI Headline */}
            <h3 className="font-bold text-base text-[var(--foreground)] mb-1.5 leading-snug">
              {disclosure.ai_headline || "ATIP Disclosure"}
            </h3>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <Building2 size={11} />
                {disclosure.institution}
              </span>
              {disclosure.released_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {format(new Date(disclosure.released_date), "MMM d, yyyy")}
                </span>
              )}
              {disclosure.atip_number && (
                <span className="font-mono bg-[var(--background)] px-1.5 py-0.5 rounded text-[10px]">
                  {disclosure.atip_number}
                </span>
              )}
              {disclosure.pages > 0 && (
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {disclosure.pages} pages
                </span>
              )}
            </div>
          </div>

          {disclosure.url && (
            <a
              href={disclosure.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--background)] rounded-lg transition-colors"
              title="View original ATIP"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Summary */}
        <div className="mb-4">
          <p className={`text-sm text-[var(--muted)] leading-relaxed ${!summaryExpanded ? "line-clamp-2" : ""}`}>
            {disclosure.summary}
          </p>
          {disclosure.summary.length > 150 && (
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] mt-1 transition-colors"
            >
              {summaryExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {summaryExpanded ? "Collapse" : "Read more"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Generate story button */}
        <button
          onClick={generateStory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Newspaper size={12} />
          )}
          {loading ? "Generating story…" : story ? (storyOpen ? "Hide story" : "Show story") : "Generate news story"}
        </button>

        {/* Generated story */}
        {storyOpen && story && (
          <div className="mt-4 border-t border-[var(--card-border)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Newspaper size={13} />
                Draft News Story
              </h4>
              <button
                onClick={copyStory}
                className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded-md transition-colors"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>

            {/* Story text */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-[var(--foreground)] mb-4 bg-[var(--background)] rounded-lg p-4 border border-[var(--card-border)]">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(story.story) }} />
            </div>

            {/* Questions */}
            {story.questions && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                  <HelpCircle size={13} />
                  Questions for Government
                </h4>
                <div
                  className="text-xs text-yellow-900 dark:text-yellow-300 leading-relaxed space-y-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(story.questions) }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Building2,
  Calendar,
  FileText,
  Lightbulb,
  CheckCircle,
  XCircle,
  Archive,
  Edit3,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Request {
  id: string;
  institution: string;
  institution_code: string;
  description: string;
  date_range: string;
  ai_reasoning: string;
  source_type: string;
  status: string;
  created_at: string;
  batch_date: string;
  edited_description?: string;
}

interface RequestCardProps {
  request: Request;
  onUpdate: (id: string, updates: Partial<Request>) => void;
}

export function RequestCard({ request, onUpdate }: RequestCardProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Edit the ATIP request description…" }),
    ],
    content: request.edited_description || request.description,
    editorProps: {
      attributes: {
        class: "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] text-sm text-[var(--foreground)]",
      },
    },
  });

  async function handleAction(action: "approve" | "reject" | "archive") {
    setLoading(action);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "archived",
          edited_description: editing ? editor?.getHTML() : undefined,
        }),
      });
      if (res.ok) {
        onUpdate(request.id, {
          status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "archived",
          edited_description: editing ? editor?.getHTML() : undefined,
        });
        setEditing(false);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleSaveEdit() {
    setLoading("save");
    try {
      const text = editor?.getText() || "";
      const res = await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_description: editor?.getHTML() }),
      });
      if (res.ok) {
        onUpdate(request.id, { edited_description: editor?.getHTML() });
        setEditing(false);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleDownloadPDF() {
    if (request.status !== "approved") return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-form?id=${request.id}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ATIP-${request.institution_code || "FORM"}-${request.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const statusConfig = {
    pending: { label: "Pending Review", className: "badge-pending" },
    approved: { label: "Approved", className: "badge-approved" },
    rejected: { label: "Rejected", className: "badge-rejected" },
    archived: { label: "Archived", className: "badge-archived" },
  };

  const { label, className } = statusConfig[request.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const displayDescription = request.edited_description
    ? request.edited_description.replace(/<[^>]*>/g, "")
    : request.description;

  return (
    <div className={`bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden transition-all hover:border-[var(--muted)]/40 ${
      request.status === "archived" || request.status === "rejected" ? "opacity-60" : ""
    }`}>
      {/* Top accent bar */}
      <div className={`h-0.5 ${
        request.status === "approved" ? "bg-green-500" :
        request.status === "rejected" ? "bg-red-500" :
        request.status === "archived" ? "bg-gray-400" :
        "bg-yellow-400"
      }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-[var(--accent)] flex-shrink-0" />
              <h3 className="font-semibold text-sm text-[var(--foreground)] truncate">
                {request.institution}
              </h3>
              {request.institution_code && (
                <span className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] px-1.5 py-0.5 rounded">
                  {request.institution_code}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {request.date_range}
              </span>
              <span className="flex items-center gap-1">
                <Tag size={11} />
                {request.source_type === "press_release" ? "Press Release" : "CSV Analysis"}
              </span>
              <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${className}`}>
            {label}
          </span>
        </div>

        {/* Description */}
        {editing ? (
          <div className="border border-[var(--card-border)] rounded-lg p-3 bg-[var(--background)] mb-3">
            <EditorContent editor={editor} />
            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[var(--card-border)]">
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading === "save"}
                className="text-xs bg-[var(--foreground)] text-[var(--background)] px-3 py-1 rounded-md font-medium hover:opacity-90 transition flex items-center gap-1"
              >
                {loading === "save" && <Loader2 size={10} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className={`text-sm text-[var(--foreground)] leading-relaxed ${!expanded && "line-clamp-3"}`}>
              {displayDescription}
            </div>
            {displayDescription.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] mt-1 transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {/* AI Reasoning (collapsible) */}
        {request.ai_reasoning && (
          <details className="mb-4 group">
            <summary className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer list-none transition-colors">
              <Lightbulb size={12} />
              AI reasoning
              <ChevronDown size={12} className="ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed pl-4 border-l-2 border-[var(--card-border)] italic">
              {request.ai_reasoning}
            </p>
          </details>
        )}

        {/* Actions */}
        {request.status === "pending" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAction("approve")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--background)] border border-[var(--card-border)] hover:border-[var(--foreground)] text-[var(--foreground)] text-xs font-medium rounded-lg transition-colors"
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading === "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Reject
            </button>
            <button
              onClick={() => handleAction("archive")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-medium rounded-lg transition-colors disabled:opacity-60 ml-auto"
            >
              {loading === "archive" ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
              Archive
            </button>
          </div>
        )}

        {request.status === "approved" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Download PDF Form
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--background)] border border-[var(--card-border)] hover:border-[var(--foreground)] text-[var(--foreground)] text-xs font-medium rounded-lg transition-colors"
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              onClick={() => handleAction("archive")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-medium rounded-lg transition-colors ml-auto"
            >
              <Archive size={12} />
              Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

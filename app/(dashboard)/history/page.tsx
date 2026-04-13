"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Download,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface SubmittedRequest {
  id: string;
  created_at: string;
  institution: string;
  description: string;
  tracking_number: string | null;
  submitted_at: string | null;
  status: string;
  notes: string | null;
  proposed_request_id: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: { label: "Approved – Ready to Mail", className: "badge-pending", icon: <Clock size={11} /> },
  submitted: { label: "Submitted", className: "badge-approved", icon: <CheckCircle size={11} /> },
  received: { label: "Received by Dept.", className: "badge-approved", icon: <CheckCircle size={11} /> },
  completed: { label: "Response Received", className: "badge-approved", icon: <CheckCircle size={11} /> },
};

export default function HistoryPage() {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("submitted_requests")
        .select("*")
        .order("created_at", { ascending: false });
      setRequests(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDownload(requestId: string) {
    setDownloading(requestId);
    try {
      const res = await fetch(`/api/generate-form?id=${requestId}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ATIP-${requestId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("submitted_requests").update({ status }).eq("id", id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const filtered = searchQuery
    ? requests.filter(
        (r) =>
          r.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.tracking_number ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Request History</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Your approved and submitted ATIP requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: requests.length },
          { label: "Ready to Mail", value: requests.filter((r) => r.status === "approved").length },
          { label: "Submitted", value: requests.filter((r) => r.status === "submitted").length },
          { label: "Completed", value: requests.filter((r) => r.status === "completed").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          placeholder="Search history…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading history…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--foreground)] font-medium mb-1">No submitted requests yet</p>
          <p className="text-sm text-[var(--muted)]">
            Approved requests will appear here once you approve them from the dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const sc = statusConfig[req.status] ?? statusConfig.approved;
            return (
              <div
                key={req.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--muted)]/40 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={13} className="text-[var(--accent)] flex-shrink-0" />
                      <h3 className="font-semibold text-sm text-[var(--foreground)] truncate">
                        {req.institution}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sc.className}`}>
                        {sc.icon}
                        {sc.label}
                      </span>
                    </div>

                    <p className="text-sm text-[var(--muted)] line-clamp-2 mb-2">
                      {req.description.replace(/<[^>]*>/g, "")}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Added {format(new Date(req.created_at), "MMM d, yyyy")}
                      </span>
                      {req.tracking_number && (
                        <span className="font-mono bg-[var(--background)] px-1.5 py-0.5 rounded">
                          #{req.tracking_number}
                        </span>
                      )}
                      {req.submitted_at && (
                        <span>
                          Submitted {format(new Date(req.submitted_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(req.proposed_request_id)}
                      disabled={downloading === req.proposed_request_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                      title="Download PDF"
                    >
                      {downloading === req.proposed_request_id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Download size={11} />
                      )}
                      PDF
                    </button>
                  </div>
                </div>

                {/* Status progression */}
                {req.status !== "completed" && (
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">Mark as:</span>
                    {req.status === "approved" && (
                      <button
                        onClick={() => updateStatus(req.id, "submitted")}
                        className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium hover:opacity-80 transition"
                      >
                        Submitted
                      </button>
                    )}
                    {req.status === "submitted" && (
                      <button
                        onClick={() => updateStatus(req.id, "received")}
                        className="text-xs px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-medium hover:opacity-80 transition"
                      >
                        Received by dept.
                      </button>
                    )}
                    {(req.status === "submitted" || req.status === "received") && (
                      <button
                        onClick={() => updateStatus(req.id, "completed")}
                        className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium hover:opacity-80 transition"
                      >
                        Response received
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestCard } from "@/components/RequestCard";
import {
  RefreshCw,
  Loader2,
  FileText,
  CheckSquare,
  Clock,
  XSquare,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

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

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "archived";

const stats = (requests: Request[]) => ({
  total: requests.length,
  pending: requests.filter((r) => r.status === "pending").length,
  approved: requests.filter((r) => r.status === "approved").length,
  rejected: requests.filter((r) => r.status === "rejected").length,
});

export default function DashboardPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposed_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRequests(data ?? []);
    setLoading(false);
  }

  async function triggerGeneration() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/cron/generate-requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || "manual"}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Generation failed");
      } else {
        await loadRequests();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setGenerating(false);
  }

  function handleUpdate(id: string, updates: Partial<Request>) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }

  const batchDates = Array.from(new Set(requests.map((r) => r.batch_date))).sort().reverse();

  const filtered = requests.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (selectedDate !== "all" && r.batch_date !== selectedDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.institution.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.ai_reasoning ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const s = stats(requests);

  const filterButtons: { key: FilterStatus; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "all", label: "All", icon: <FileText size={13} />, count: s.total },
    { key: "pending", label: "Pending", icon: <Clock size={13} />, count: s.pending },
    { key: "approved", label: "Approved", icon: <CheckSquare size={13} />, count: s.approved },
    { key: "rejected", label: "Rejected", icon: <XSquare size={13} />, count: s.rejected },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">ATIP Proposals</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            AI-generated Access to Information requests for review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--foreground)] text-sm rounded-lg transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:block">Refresh</span>
          </button>
          <button
            onClick={triggerGeneration}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {generating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Zap size={13} />
            )}
            Generate New Batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Proposals", value: s.total, color: "text-[var(--foreground)]" },
          { label: "Pending Review", value: s.pending, color: "text-yellow-500" },
          { label: "Approved", value: s.approved, color: "text-green-500" },
          { label: "Rejected", value: s.rejected, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-1">
          {filterButtons.map(({ key, label, icon, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === key
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {icon}
              {label}
              <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === key ? "bg-[var(--card)] text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search proposals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
        />

        {batchDates.length > 1 && (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
          >
            <option value="all">All batches</option>
            {batchDates.map((d) => (
              <option key={d} value={d}>
                {d ? format(new Date(d), "MMM d, yyyy") : "Unknown"}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading proposals...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--foreground)] font-medium mb-1">No proposals yet</p>
          <p className="text-sm text-[var(--muted)]">
            Click "Generate New Batch" to have the AI analyze the latest ATIP data.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

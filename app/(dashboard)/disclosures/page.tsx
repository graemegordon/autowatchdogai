"use client";

import { useEffect, useState, useCallback } from "react";
import { DisclosureCard } from "@/components/DisclosureCard";
import {
  RefreshCw,
  Loader2,
  Search,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

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

export default function DisclosuresPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [cached, setCached] = useState(true);

  const LIMIT = 20;

  const loadDisclosures = useCallback(async (p = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/disclosures?page=${p}${refresh ? "&refresh=true" : ""}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load disclosures");
      }
      const data = await res.json();
      setDisclosures(data.data ?? []);
      setTotal(data.total ?? 0);
      setCached(data.cached);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDisclosures(page);
  }, [page]);

  const filtered = searchQuery
    ? disclosures.filter(
        (d) =>
          d.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.ai_headline ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.atip_number.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : disclosures;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            ATIP Disclosures
          </h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Latest voluntary ATIP releases from the Government of Canada
            {cached && (
              <span className="ml-2 text-xs bg-[var(--card)] border border-[var(--card-border)] px-1.5 py-0.5 rounded">
                Cached
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadDisclosures(1, true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--foreground)] text-sm rounded-lg transition-colors"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:block">{refreshing ? "Fetching…" : "Refresh"}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          placeholder="Search by institution, summary, or ATIP number…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading disclosures…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper size={40} className="mx-auto text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-[var(--foreground)] font-medium mb-1">No disclosures found</p>
          <p className="text-sm text-[var(--muted)]">
            {searchQuery ? "Try a different search term." : "Click Refresh to fetch the latest from open.canada.ca."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {filtered.map((disclosure) => (
              <DisclosureCard key={disclosure.id} disclosure={disclosure} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !searchQuery && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] disabled:opacity-40 hover:border-[var(--muted)] transition-colors"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span className="text-sm text-[var(--muted)]">
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] disabled:opacity-40 hover:border-[var(--muted)] transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

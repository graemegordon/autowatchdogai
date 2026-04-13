"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";
import { FileText, Home, Clock, Newspaper, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Proposals", icon: Home },
  { href: "/disclosures", label: "Disclosures", icon: Newspaper },
  { href: "/history", label: "History", icon: Clock },
];

export function Navbar({ email }: { email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--background)]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
            <div className="w-7 h-7 rounded bg-[var(--accent)] flex items-center justify-center">
              <FileText size={14} className="text-white" />
            </div>
            <span className="hidden sm:block text-[var(--foreground)]">ATIP Generator</span>
            <span className="text-[var(--muted)] text-xs hidden sm:block font-normal border-l border-[var(--card-border)] pl-2 ml-1">
              Canada
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-[var(--card)] text-[var(--foreground)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:block">{label}</span>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {email && (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--card-border)]">
                <span className="text-xs text-[var(--muted)] hidden md:block">{email}</span>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="p-2 rounded-md text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

import { Link, useLocation } from "wouter";
import { Compass, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export function Navigation() {
  const [location] = useLocation();
  const onResults = location.startsWith("/results");
  const [theme, toggleTheme] = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-border/40">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 rounded-xl bg-primary/30 blur-md transition-opacity group-hover:opacity-100 opacity-60"
            />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl btn-gradient">
              <Compass className="h-5 w-5" strokeWidth={2.25} />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-tight">
              Career Compass
            </span>
            <span className="eyebrow text-[10px] tracking-[0.18em] text-muted-foreground">
              CV → Roles
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/" active={location === "/"}>
              Upload
            </NavLink>
            <NavLink href="/results" active={onResults} disabled>
              Results
            </NavLink>
            <a
              href="https://github.com/mwendwa-will/Career_Compass"
              target="_blank"
              rel="noreferrer"
              className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-mid hover:text-foreground"
            >
              GitHub
            </a>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="ml-1 rounded-lg p-2 text-muted-foreground hover:bg-surface-mid hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  disabled,
  children,
}: {
  href: string;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary-tint text-primary"
      : "text-muted-foreground hover:bg-surface-mid hover:text-foreground",
    disabled && "pointer-events-none text-foreground/70"
  );
  if (disabled) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("offbook-theme", next ? "dark" : "light");
    } catch {
      /* private mode — theme just won't persist */
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="ml-1 h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function StudioMark({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="filament-pulse absolute inline-flex h-full w-full rounded-full bg-primary" />
      </span>
      <span className="flex flex-col font-display text-lg font-semibold leading-tight sm:inline sm:leading-normal">
        Off Book
        <span className="text-muted-foreground font-sans text-[9px] font-normal uppercase tracking-[0.12em] sm:ml-2 sm:text-[11px] sm:tracking-[0.18em]">
          Self-Tape Studio
        </span>
      </span>
    </Link>
  );
}

export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <StudioMark />
          <nav className="flex items-center gap-0 text-xs sm:gap-1 sm:text-sm">
            <Link
              to="/inbound"
              className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
            >
              Inbound
            </Link>
            <Link
              to="/studio"
              className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
            >
              Studio
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-5xl px-5 py-12 text-sm text-muted-foreground">
        <div className="border-t border-border pt-6">
          <p className="font-display text-base text-foreground">Off Book Self-Tape Studio</p>
          <p className="mt-1">North Hollywood, CA · One booth, one owner, no waiting room.</p>
          <p className="mt-1">All times shown in Los Angeles time.</p>
        </div>
      </footer>
    </div>
  );
}

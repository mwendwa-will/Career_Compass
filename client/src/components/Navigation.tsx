import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground group-hover:bg-primary/90 transition-colors">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">RoleMatch.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/" active={location === "/"}>Home</NavLink>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Upload CV
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        active ? "text-primary font-semibold" : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}

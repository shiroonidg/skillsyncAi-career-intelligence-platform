import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Compass, Map, Menu, Network, Target, User, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/skillsync/store";
import { useRoles } from "@/lib/skillsync/queries";

const NAV = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/careers", label: "Career Explorer", icon: Compass },
  { to: "/skills", label: "Skill Intelligence", icon: Network },
  { to: "/gap", label: "Skill Gap Analyzer", icon: Target },
  { to: "/roadmap", label: "My Roadmap", icon: Map },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-lift">
        <Network className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-[family-name:var(--font-display)] font-semibold">SkillSync AI</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workforce Intelligence</div>
      </div>
    </Link>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-2 before:-left-4 before:w-1 before:rounded-r-full before:bg-primary" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileBox() {
  const { targetRoleId, skills } = useProfile();
  const roles = useRoles();
  const role = roles.data?.find((r) => r.id === targetRoleId);
  return (
    <Link to="/gap" className="flex items-center gap-3 rounded-xl border bg-card/60 p-3 transition-colors hover:border-primary/40">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 text-xs">
        <div className="font-medium text-foreground">My profile</div>
        <div className="truncate text-muted-foreground">
          {role ? role.name : "No target role"} · {skills.length} skills
        </div>
      </div>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r bg-sidebar/90 p-4 backdrop-blur lg:flex">
        <div className="space-y-8">
          <Logo />
          <Nav />
        </div>
        <div className="space-y-3">
          <ProfileBox />
          <div className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">Build for Bharat 2.0 · v1.0</div>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between border-r bg-sidebar p-4 animate-in slide-in-from-left duration-200">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Logo />
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Nav onNavigate={() => setOpen(false)} />
            </div>
            <ProfileBox />
          </div>
        </div>
      )}
      <main className="lg:pl-64">
        <div key={path} className="mx-auto max-w-7xl px-4 py-8 animate-in fade-in duration-300 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}

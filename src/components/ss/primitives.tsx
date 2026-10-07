import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Database, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchLevel, Priority } from "@/lib/skillsync/analysis";

export function PageHeader({ eyebrow, title, desc, actions }: { eyebrow?: string; title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card/80 p-5 backdrop-blur", className)}>{children}</div>;
}

export function MetricCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Panel className="relative overflow-hidden">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Panel>
  );
}

export function ChartCard({ title, subtitle, children, source, className }: { title: string; subtitle?: string; children: ReactNode; source?: string; className?: string }) {
  return (
    <Panel className={className}>
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
      {source && <EvidenceBadge className="mt-4" label={source} />}
    </Panel>
  );
}

export function EvidenceBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] text-primary/90", className)}>
      <Database className="h-3 w-3" /> {label}
    </span>
  );
}

export function SkillBadge({ name, slug, tone = "default", onRemove }: { name: string; slug?: string; tone?: "default" | MatchLevel; onRemove?: () => void }) {
  const cls = {
    default: "border-border bg-secondary text-secondary-foreground",
    strong: "border-success/30 bg-success/10 text-success",
    partial: "border-warning/30 bg-warning/10 text-warning",
    missing: "border-destructive/30 bg-destructive/10 text-destructive",
  }[tone];
  const inner = (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", cls)}>
      {name}
      {onRemove && (
        <button aria-label={`Remove ${name}`} onClick={onRemove} className="ml-1 opacity-70 hover:opacity-100">
          ×
        </button>
      )}
    </span>
  );
  return slug && !onRemove ? (
    <Link to="/skills" search={{ skill: slug }} className="transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function PriorityPill({ p }: { p: Priority }) {
  const cls = { High: "bg-destructive/15 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" }[p];
  return <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", cls)}>{p}</span>;
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
      <div className="font-medium">{title}</div>
      {desc && <p className="mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading from database…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" /> {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
      <div>
        <div className="font-medium text-destructive">Couldn't load this data</div>
        <div className="text-muted-foreground">{error instanceof Error ? error.message : String(error)}</div>
      </div>
    </div>
  );
}

export function ReadinessScore({ value, size = 160 }: { value: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const tone = value >= 70 ? "var(--success)" : value >= 40 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-display)] text-4xl font-semibold">{value}%</span>
        <span className="text-xs text-muted-foreground">readiness</span>
      </div>
    </div>
  );
}

export const fmt = (n: number | null | undefined, d = 0) => (n === null || n === undefined ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: d }));

import { Link, useNavigate } from "@tanstack/react-router";
import { useProfile } from "@/lib/skillsync/store";
import { ArrowUpRight, Briefcase, Clock, Wallet } from "lucide-react";
import type { Requirement, Role } from "@/lib/skillsync/api";
import { summarizeJobs, type GapItem } from "@/lib/skillsync/analysis";
import { useRoleDemand, useRoleJobs } from "@/lib/skillsync/queries";
import { EvidenceBadge, Panel, PriorityPill, SkillBadge, fmt } from "./primitives";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function RoleCard({ role, reqs }: { role: Role; reqs: Requirement[] }) {
  const demand = useRoleDemand(role);
  const { setTargetRole } = useProfile();
  const navigate = useNavigate();
  const jobs = useRoleJobs(role);
  const s = jobs.data ? summarizeJobs(jobs.data) : null;
  const top = reqs.filter((r) => r.role_id === role.id && r.skill).sort((a, b) => b.importance_weight - a.importance_weight).slice(0, 5);
  return (
    <div className="group">
      <Panel className="flex h-full flex-col transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lift">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{role.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{role.description}</p>
          </div>

        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Stat icon={<Briefcase className="h-3.5 w-3.5" />} label="Relevant jobs" value={demand.isLoading ? "…" : fmt(demand.data)} />
          <Stat icon={<Wallet className="h-3.5 w-3.5" />} label="Median band" value={jobs.isLoading ? "…" : s?.medianSalary != null ? fmt(s.medianSalary, 1) : "n/a"} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Typical exp." value={jobs.isLoading ? "…" : s?.medianMinExp != null ? `${fmt(s.medianMinExp)}–${fmt(s.medianMaxExp)} yrs` : "n/a"} />
        </div>
        <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
          {top.length ? top.map((r) => <SkillBadge key={r.skill_id} name={r.skill.name} />) : <span className="text-xs text-muted-foreground">No skill requirements recorded</span>}
        </div>
        <div className="mt-5 flex gap-2 border-t pt-4">
          <Link to="/careers/$slug" params={{ slug: role.slug }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Explore Role <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button onClick={() => { setTargetRole(role.id); navigate({ to: "/gap" }); }} className="inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent">
            Analyze My Gap
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-2.5">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function SkillGapCard({ item }: { item: GapItem }) {
  const bar = { strong: "bg-success", partial: "bg-warning", missing: "bg-destructive" }[item.match];
  return (
    <Panel className="relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className={cn("absolute inset-y-0 left-0 w-1", bar)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{item.skill.name}</span>
          <SkillBadge name={item.match} tone={item.match} />
        </div>
        <PriorityPill p={item.priority} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Role importance</div>
          <div className="font-semibold tabular-nums">#{item.importanceRank} · {fmt(item.importance, 2)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Market evidence</div>
          <div className="font-semibold tabular-nums">{fmt(item.evidenceFrequency)} postings</div>
        </div>
        <div>
          <div className="text-muted-foreground">Overall market</div>
          <div className="font-semibold tabular-nums">{fmt(item.skill.market_frequency)}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>
    </Panel>
  );
}

export function RoadmapStep({ index, item, why, last }: { index: number; item: GapItem; why: string; last?: boolean }) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-lift">{index}</div>
        {!last && <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/50 to-border" />}
      </div>
      <Panel className="mb-4 flex-1 p-5 transition-all duration-200 hover:border-primary/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">{item.skill.name}</span>
          <div className="flex gap-2">
            <SkillBadge name={item.match} tone={item.match} />
            <PriorityPill p={item.priority} />
          </div>
        </div>
        <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-primary">Why this skill?</div>
        <p className="mt-1 text-sm text-muted-foreground">{why}</p>
        {item.prerequisites.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Builds on: {item.prerequisites.map((p) => <SkillBadge key={p.id} name={p.name} />)}
          </div>
        )}
        <EvidenceBadge className="mt-3" label={item.evidenceFrequency > 0 ? `${item.evidenceFrequency} postings · ${item.evidenceSource ?? "source"}` : "role requirement · no posting count"} />
      </Panel>
    </div>
  );
}

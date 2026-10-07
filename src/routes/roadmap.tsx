import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, Flag } from "lucide-react";
import { useGapAnalysis } from "@/lib/skillsync/useGap";
import type { GapItem } from "@/lib/skillsync/analysis";
import { RoadmapStep } from "@/components/ss/cards";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, ReadinessScore, SkillBadge } from "@/components/ss/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "My Roadmap — SkillSync AI" },
      { name: "description", content: "A personalized learning roadmap ordered by prerequisites, role importance and market evidence." },
      { property: "og:title", content: "My Roadmap — SkillSync AI" },
      { property: "og:description", content: "Your step-by-step path to role readiness." },
    ],
  }),
  component: RoadmapPage,
});

function why(i: GapItem, role: string, unlocks: string[]) {
  const parts: string[] = [`required by ${role} (ranked #${i.importanceRank} by importance)`];
  parts.push(i.match === "partial" ? `partially covered through ${i.partialVia.map((s) => s.name).join(", ")}` : "missing from your current profile");
  if (i.evidenceFrequency > 0) parts.push(`seen in ${i.evidenceFrequency} ${i.evidenceSource ?? ""} postings for this role`);
  if (unlocks.length) parts.push(`a prerequisite for ${unlocks.join(", ")} in the skill graph`);
  if (i.skill.is_core) parts.push("marked as a core skill in the taxonomy");
  return `Prioritized because it is ${parts.join("; ")}.`;
}

function Stage({ title, desc, items, role, unlockMap, offset }: { title: string; desc: string; items: GapItem[]; role: string; unlockMap: Map<string, string[]>; offset: number }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {items.length === 0 ? <p className="mb-4 text-sm text-muted-foreground">Nothing in this stage.</p> : items.map((i, k) => <RoadmapStep key={i.skill.id} index={offset + k + 1} item={i} why={why(i, role, unlockMap.get(i.skill.id) ?? [])} last={k === items.length - 1} />)}
    </section>
  );
}

const Arrow = () => <div className="my-2 flex justify-center text-muted-foreground"><ArrowDown className="h-5 w-5" /></div>;

function RoadmapPage() {
  const { role, result, loading, error, profile } = useGapAnalysis();
  if (error) return <ErrorState error={error} />;
  if (loading) return <LoadingState />;
  if (!role || !result) {
    return (
      <>
        <PageHeader eyebrow="My Roadmap" title="Your path to readiness" />
        <EmptyState title="No target role selected" desc="Pick a role and add your skills in the Skill Gap Analyzer to build a roadmap from real requirements." action={<Button asChild><Link to="/gap">Open Skill Gap Analyzer</Link></Button>} />
      </>
    );
  }

  const gaps = result.items.filter((i) => i.match !== "strong");
  const gapIds = new Set(gaps.map((g) => g.skill.id));
  const unlockMap = new Map<string, string[]>();
  gaps.forEach((g) => g.prerequisites.forEach((p) => gapIds.has(p.id) && unlockMap.set(p.id, [...(unlockMap.get(p.id) ?? []), g.skill.name])));
  const foundation = gaps.filter((g) => unlockMap.has(g.skill.id) || (g.skill.is_core && g.priority !== "Low")).slice(0, 8);
  const fIds = new Set(foundation.map((f) => f.skill.id));
  const high = gaps.filter((g) => !fIds.has(g.skill.id) && g.priority === "High").slice(0, 10);
  const hIds = new Set(high.map((f) => f.skill.id));
  const advanced = gaps.filter((g) => !fIds.has(g.skill.id) && !hIds.has(g.skill.id) && g.priority === "Medium").slice(0, 8);
  const strong = result.items.filter((i) => i.match === "strong");
  const covered = foundation.length + high.length + advanced.length;
  const projected = Math.round(
    (result.items.reduce((s, i) => s + (i.match === "strong" || fIds.has(i.skill.id) || hIds.has(i.skill.id) || advanced.some((a) => a.skill.id === i.skill.id) ? i.importance : i.match === "partial" ? i.importance / 2 : 0), 0) /
      Math.max(1, result.items.reduce((s, i) => s + i.importance, 0))) * 100,
  );

  return (
    <>
      <PageHeader eyebrow="My Roadmap" title={`Roadmap to ${role.name}`} desc="Ordered by prerequisite relationships, role importance and posting evidence. Every reason below is traceable to the database." actions={<Button variant="outline" asChild><Link to="/gap">Edit profile</Link></Button>} />
      <div className="mx-auto max-w-3xl">
        <Panel className="mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Current skills</h2>
          <p className="mb-3 text-sm text-muted-foreground">{strong.length} of the role's {result.items.length} required skills are in your profile ({profile.skills.length} total listed).</p>
          <div className="flex flex-wrap gap-1.5">{strong.length ? strong.map((s) => <SkillBadge key={s.skill.id} name={s.skill.name} tone="strong" />) : <span className="text-sm text-muted-foreground">None of the required skills yet — that's a starting point, not a verdict.</span>}</div>
        </Panel>
        <Arrow />
        <Stage title="Foundation skills" desc="Prerequisites for other gaps, or core skills the role ranks highly." items={foundation} role={role.name} unlockMap={unlockMap} offset={0} />
        <Arrow />
        <Stage title="High-priority gaps" desc="Top-ranked role requirements you don't have yet." items={high} role={role.name} unlockMap={unlockMap} offset={foundation.length} />
        <Arrow />
        <Stage title="Advanced skills" desc="Mid-ranked requirements to round out your profile." items={advanced} role={role.name} unlockMap={unlockMap} offset={foundation.length + high.length} />
        <Arrow />
        <Panel className="flex flex-col items-center gap-6 border-primary/30 md:flex-row">
          <ReadinessScore value={projected} size={130} />
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Flag className="h-4 w-4" /> Project / role readiness</h2>
            <p className="mt-2 text-sm text-muted-foreground">Completing these {covered} steps would raise your weighted coverage of {role.name} requirements from {result.readiness}% to {projected}%. Build a project that uses your new skills together to show evidence of them.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

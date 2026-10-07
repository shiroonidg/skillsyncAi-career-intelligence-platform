import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReqs, useRelSkills, useRoleDemand, useRoleJobs, useRoles } from "@/lib/skillsync/queries";
import { summarizeJobs } from "@/lib/skillsync/analysis";
import { useProfile } from "@/lib/skillsync/store";
import { ChartCard, EmptyState, ErrorState, EvidenceBadge, LoadingState, MetricCard, PageHeader, Panel, SkillBadge, fmt } from "@/components/ss/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/careers/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Role details | SkillSync AI` },
        { name: "description", content: `Market demand, salary, experience and required skills for ${name}.` },
        { property: "og:title", content: `${name} — SkillSync AI` },
        { property: "og:description", content: `Evidence-based role profile for ${name}.` },
      ],
    };
  },
  component: RoleDetail,
});

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };

function RoleDetail() {
  const { slug } = Route.useParams();
  const roles = useRoles();
  const reqs = useReqs();
  const { rels, index } = useRelSkills();
  const role = roles.data?.find((r) => r.slug === slug);
  const demand = useRoleDemand(role);
  const jobs = useRoleJobs(role);
  const { setTargetRole } = useProfile();
  const navigate = useNavigate();

  if (roles.isLoading || reqs.isLoading) return <LoadingState />;
  if (roles.error) return <ErrorState error={roles.error} />;
  if (!role) return <EmptyState title="Role not found" action={<Link to="/careers" className="text-primary">Back to roles</Link>} />;

  const mine = (reqs.data ?? []).filter((r) => r.role_id === role.id && r.skill).sort((a, b) => b.importance_weight - a.importance_weight);
  const mineIds = new Set(mine.map((r) => r.skill_id));
  const s = jobs.data ? summarizeJobs(jobs.data) : null;

  const related = new Map<string, { name: string; via: string }>();
  (rels.data ?? []).forEach((x) => {
    if (mineIds.has(x.from_skill_id) && !mineIds.has(x.to_skill_id)) related.set(x.to_skill_id, { name: index.get(x.to_skill_id)?.name ?? "", via: x.relationship_type });
    if (mineIds.has(x.to_skill_id) && !mineIds.has(x.from_skill_id)) related.set(x.from_skill_id, { name: index.get(x.from_skill_id)?.name ?? "", via: x.relationship_type });
  });

  // Related roles: overlap of required skills
  const relatedRoles = (roles.data ?? [])
    .filter((r) => r.id !== role.id)
    .map((r) => {
      const other = (reqs.data ?? []).filter((x) => x.role_id === r.id).map((x) => x.skill_id);
      const shared = other.filter((id) => mineIds.has(id)).length;
      return { r, shared, pct: mine.length ? Math.round((shared / mine.length) * 100) : 0 };
    })
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 4);

  const analyze = () => {
    setTargetRole(role.id);
    navigate({ to: "/gap" });
  };

  return (
    <>
      <Link to="/careers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All roles
      </Link>
      <PageHeader
        eyebrow="Role overview"
        title={role.name}
        desc={role.description ?? undefined}
        actions={
          <Button onClick={analyze} size="lg" className="gap-2">
            <Target className="h-4 w-4" /> Analyze my gap for this role
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Market demand" value={demand.isLoading ? "…" : fmt(demand.data)} hint="matching analytics postings" />
        <MetricCard label="Median salary band" value={jobs.isLoading ? "…" : s?.medianSalary != null ? fmt(s.medianSalary, 1) : "n/a"} hint={s ? `${fmt(s.salaryDisclosed)} disclosed · most common "${s.topBand ?? "—"}"` : undefined} />
        <MetricCard label="Typical experience" value={jobs.isLoading ? "…" : s?.medianMinExp != null ? `${fmt(s.medianMinExp)}–${fmt(s.medianMaxExp)} yrs` : "n/a"} hint="median min–max from postings" />
        <MetricCard label="Required skills" value={fmt(mine.length)} hint="role_skill_requirements" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="Skill importance" subtitle="Top 12 skills by importance weight for this role" source="role_skill_requirements.importance_weight">
          {mine.length === 0 ? <EmptyState title="No skill requirements recorded for this role" /> : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={mine.slice(0, 12).map((r) => ({ name: r.skill.name, weight: +r.importance_weight.toFixed(2), postings: r.evidence_frequency }))} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" width={130} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="weight" name="Importance" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <h3 className="mb-3 font-semibold">All required skills</h3>
            <div className="flex max-h-64 flex-wrap gap-1.5 overflow-auto">
              {mine.map((r) => <SkillBadge key={r.skill_id} name={r.skill.name} slug={r.skill.slug} />)}
            </div>
            <EvidenceBadge className="mt-4" label={`evidence source: ${mine[0]?.evidence_source ?? "—"}`} />
          </Panel>
          <Panel>
            <h3 className="mb-3 font-semibold">Related skills</h3>
            {related.size === 0 ? <p className="text-sm text-muted-foreground">No skill-graph relationships point outside this role's requirements.</p> : (
              <div className="flex flex-wrap gap-1.5">{[...related.entries()].map(([id, v]) => <SkillBadge key={id} name={`${v.name} · ${v.via.replace(/_/g, " ")}`} />)}</div>
            )}
          </Panel>
          <Panel>
            <h3 className="mb-3 font-semibold">Related roles</h3>
            {relatedRoles.length === 0 ? <p className="text-sm text-muted-foreground">No other role shares required skills.</p> : (
              <ul className="space-y-2">
                {relatedRoles.map(({ r, shared, pct }) => (
                  <li key={r.id}>
                    <Link to="/careers/$slug" params={{ slug: r.slug }} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                      {r.name}
                      <span className="text-xs text-muted-foreground">{shared} shared skills · {pct}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

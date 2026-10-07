import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, FlaskConical, Layers, Lightbulb, Users } from "lucide-react";
import { q } from "@/lib/skillsync/queries";
import { getRoleDemand } from "@/lib/skillsync/api";
import { salaryByExperience } from "@/lib/skillsync/analysis";
import { ChartCard, EmptyState, ErrorState, LoadingState, MetricCard, PageHeader, Panel, fmt } from "@/components/ss/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Intelligence Dashboard — SkillSync AI" },
      { name: "description", content: "Real job-market evidence: demand by role, top skills, salary by experience and location demand." },
      { property: "og:title", content: "Market Intelligence Dashboard — SkillSync AI" },
      { property: "og:description", content: "Evidence-driven view of roles, skills, salaries and locations from real postings." },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function Dashboard() {
  const counts = useQuery(q.counts);
  const roles = useQuery(q.roles);
  const top = useQuery(q.topSkills);
  const locs = useQuery(q.locations);
  const jobs = useQuery(q.allJobs);
  const demand = useQueries({
    queries: (roles.data ?? []).map((r) => ({ queryKey: ["demand", r.id], queryFn: () => getRoleDemand(r), staleTime: 1800000 })),
  });
  const demandData = (roles.data ?? [])
    .map((r, i) => ({ name: r.name, slug: r.slug, postings: demand[i]?.data ?? 0 }))
    .sort((a, b) => b.postings - a.postings);
  const demandReady = roles.data && demand.every((d) => d.isSuccess);
  const salary = jobs.data ? salaryByExperience(jobs.data) : [];

  const insights: string[] = [];
  if (top.data?.length) insights.push(`"${top.data[0].name}" is the most frequent skill, appearing in ${fmt(top.data[0].market_frequency)} postings; ${top.data.slice(1, 4).map((s) => s.name).join(", ")} follow.`);
  if (demandReady && demandData[0]) insights.push(`Among tracked roles, ${demandData[0].name} has the most matching postings (${fmt(demandData[0].postings)}), followed by ${demandData[1]?.name} (${fmt(demandData[1]?.postings)}).`);
  if (locs.data?.length && counts.data) insights.push(`${locs.data[0].location} leads location demand with ${fmt(locs.data[0].posting_count)} postings — about ${Math.round((locs.data[0].posting_count / counts.data.analyticsJobs) * 100)}% of all analytics jobs.`);
  const salPts = salary.filter((s) => s.median !== null);
  if (salPts.length >= 2) insights.push(`Median listed salary band rises from ${fmt(salPts[0].median, 1)} (${salPts[0].bucket}) to ${fmt(salPts[salPts.length - 1].median, 1)} (${salPts[salPts.length - 1].bucket}) across postings that disclose salary.`);
  if (counts.data && counts.data.dataScienceJobs === 0) insights.push("The data-science job dataset currently has no rows, so insights here rely on the analytics job postings only.");

  return (
    <>
      <PageHeader eyebrow="Market Intelligence" title="What the job market is asking for" desc="Every number below is calculated live from the SkillSync database — no estimates, no placeholders." />

      {counts.error ? (
        <ErrorState error={counts.error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Analytics jobs" icon={<Briefcase className="h-4 w-4" />} value={counts.data ? fmt(counts.data.analyticsJobs) : "…"} hint="raw_analytics_jobs" />
          <MetricCard label="Data science jobs" icon={<FlaskConical className="h-4 w-4" />} value={counts.data ? fmt(counts.data.dataScienceJobs) : "…"} hint={counts.data?.dataScienceJobs === 0 ? "No rows loaded yet" : "raw_data_science_jobs"} />
          <MetricCard label="Skills tracked" icon={<Layers className="h-4 w-4" />} value={counts.data ? fmt(counts.data.skills) : "…"} hint="skill taxonomy" />
          <MetricCard label="Roles" icon={<Users className="h-4 w-4" />} value={counts.data ? fmt(counts.data.roles) : "…"} hint="target career roles" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top market skills" subtitle="Skills by number of postings mentioning them" source="skills.market_frequency">
          {top.isLoading ? <LoadingState /> : top.error ? <ErrorState error={top.error} /> : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={top.data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" width={120} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="market_frequency" name="Postings" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Role demand" subtitle="Analytics postings whose title matches each role" source="raw_analytics_jobs × roles.search_patterns">
          {!demandReady ? <LoadingState /> : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={demandData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" width={140} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="postings" name="Postings" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Salary by experience" subtitle="Median listed salary-band midpoint (source units) by minimum experience" source={jobs.data ? `${fmt(salary.reduce((s, x) => s + x.postings, 0))} postings with disclosed salary` : "raw_analytics_jobs"}>
          {jobs.isLoading ? <LoadingState label="Reading 13k postings…" /> : jobs.error ? <ErrorState error={jobs.error} /> : salPts.length === 0 ? <EmptyState title="No salary data disclosed" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salary}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" {...axis} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="median" name="Median band" stroke="var(--chart-3)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Location demand" subtitle="Postings per city (multi-city postings count for each)" source="v_location_market">
          {locs.isLoading ? <LoadingState /> : locs.error ? <ErrorState error={locs.error} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={locs.data}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="location" {...axis} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="posting_count" name="Postings" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">What the market is telling us</h3>
          </div>
          {insights.length ? (
            <ul className="space-y-3">
              {insights.map((t) => (
                <li key={t} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <LoadingState label="Deriving insights from data…" />
          )}
        </Panel>
        <Panel>
          <h3 className="mb-3 font-semibold">Top roles</h3>
          {!demandReady ? <LoadingState /> : (
            <ol className="space-y-2">
              {demandData.slice(0, 6).map((r, i) => (
                <li key={r.slug}>
                  <Link to="/careers/$slug" params={{ slug: r.slug }} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                    <span><span className="mr-2 text-muted-foreground">{i + 1}.</span>{r.name}</span>
                    <span className="tabular-nums text-muted-foreground">{fmt(r.postings)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}

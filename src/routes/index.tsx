import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Briefcase, FlaskConical, Info, Layers, Lightbulb, MapPin, TrendingUp, Users } from "lucide-react";
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

  const insights: { icon: typeof Lightbulb; title: string; text: string }[] = [];
  if (top.data?.length) insights.push({ icon: Layers, title: "Top skill signal", text: `"${top.data[0].name}" appears in ${fmt(top.data[0].market_frequency)} postings; ${top.data.slice(1, 4).map((s) => s.name).join(", ")} follow.` });
  if (demandReady && demandData[0]) insights.push({ icon: Users, title: "Hiring concentration", text: `${demandData[0].name} has the most matching postings (${fmt(demandData[0].postings)}), followed by ${demandData[1]?.name} (${fmt(demandData[1]?.postings)}).` });
  if (locs.data?.length && counts.data) insights.push({ icon: MapPin, title: "Leading hub", text: `${locs.data[0].location} leads with ${fmt(locs.data[0].posting_count)} postings — about ${Math.round((locs.data[0].posting_count / counts.data.analyticsJobs) * 100)}% of analytics jobs.` });
  const salPts = salary.filter((s) => s.median !== null);
  if (salPts.length >= 2) insights.push({ icon: TrendingUp, title: "Experience premium", text: `Median salary band rises from ${fmt(salPts[0].median, 1)} (${salPts[0].bucket}) to ${fmt(salPts[salPts.length - 1].median, 1)} (${salPts[salPts.length - 1].bucket}).` });
  if (counts.data && counts.data.dataScienceJobs === 0) insights.push({ icon: Info, title: "Data coverage", text: "The data-science postings dataset has no rows yet, so insights rely on analytics postings only." });

  return (
    <>
      <PageHeader eyebrow="Market Intelligence" title="Workforce Intelligence Dashboard" desc="Understand market demand, emerging skills, roles, and career opportunities from real job-market data." />
      <Journey />

      {counts.error ? (
        <ErrorState error={counts.error} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Job postings" icon={<Briefcase className="h-4 w-4" />} value={counts.data ? fmt(counts.data.analyticsJobs) : "…"} hint="Analytics postings analyzed" />
          <MetricCard label="Data science postings" icon={<FlaskConical className="h-4 w-4" />} value={counts.data ? fmt(counts.data.dataScienceJobs) : "…"} hint={counts.data?.dataScienceJobs === 0 ? "No rows loaded yet" : "raw_data_science_jobs"} />
          <MetricCard label="Skills" icon={<Layers className="h-4 w-4" />} value={counts.data ? fmt(counts.data.skills) : "…"} hint="In the skill taxonomy" />
          <MetricCard label="Roles" icon={<Users className="h-4 w-4" />} value={counts.data ? fmt(counts.data.roles) : "…"} hint="Target career roles" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Most In-Demand Skills" subtitle="Which capabilities appear most frequently across the market." source="skills.market_frequency">
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

        <ChartCard title="Role Demand" subtitle="Where hiring demand is concentrated across analyzed roles." source="raw_analytics_jobs × roles.search_patterns">
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

        <ChartCard title="Salary vs. Experience" subtitle="Median listed salary-band midpoint (source units) by minimum years required." source={jobs.data ? `${fmt(salary.reduce((s, x) => s + x.postings, 0))} postings with disclosed salary` : "raw_analytics_jobs"}>
          {jobs.isLoading ? <LoadingState rows={7} /> : jobs.error ? <ErrorState error={jobs.error} /> : salPts.length === 0 ? <EmptyState title="No salary data disclosed" /> : (
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

        <ChartCard title="Geographic Demand" subtitle="Job postings per city. Multi-city postings count toward each city." source="v_location_market">
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
            <h3 className="font-semibold">Market Insights</h3>
            <span className="text-sm text-muted-foreground">· What the market is telling us</span>
          </div>
          {insights.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border bg-secondary/40 p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                    <span className="text-sm font-semibold">{title}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          ) : (
            <LoadingState rows={4} />
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

const STEPS = [
  { to: "/", label: "Market Demand" },
  { to: "/skills", label: "Skill Intelligence" },
  { to: "/careers", label: "Career Requirements" },
  { to: "/gap", label: "Personal Skill Gap" },
  { to: "/roadmap", label: "Prioritized Roadmap" },
] as const;

function Journey() {
  return (
    <nav aria-label="Product journey" className="mb-8 flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.to} className="flex items-center gap-2">
          <Link to={s.to} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${i === 0 ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
            <span className="mr-1.5 tabular-nums opacity-60">{i + 1}</span>{s.label}
          </Link>
          {i < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </div>
      ))}
      <Link to="/careers" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        Explore Careers <ArrowRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}

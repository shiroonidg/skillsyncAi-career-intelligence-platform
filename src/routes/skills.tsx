import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { q, useReqs, useRelSkills, useRoles } from "@/lib/skillsync/queries";
import { getCooccurringSkills, getSkillBySlug, searchSkills, type Skill } from "@/lib/skillsync/api";
import { EmptyState, ErrorState, EvidenceBadge, LoadingState, PageHeader, Panel, SkillBadge, fmt } from "@/components/ss/primitives";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/skills")({
  validateSearch: z.object({ skill: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Skill Intelligence — SkillSync AI" },
      { name: "description", content: "Explore skills by market frequency, the roles that need them, and skill-to-skill relationships." },
      { property: "og:title", content: "Skill Intelligence — SkillSync AI" },
      { property: "og:description", content: "Skill → role and skill → skill intelligence from real data." },
    ],
  }),
  component: SkillsPage,
});

function SkillsPage() {
  const { skill: selSlug } = Route.useSearch();
  const navigate = useNavigate({ from: "/skills" });
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [coreOnly, setCoreOnly] = useState(false);
  const cats = useQuery(q.categories);
  const list = useQuery({ queryKey: ["skillSearch", text, category, coreOnly], queryFn: () => searchSkills({ q: text, category: category || undefined, coreOnly }) });
  const selected = useQuery({
    queryKey: ["skillBySlug", selSlug],
    enabled: !!selSlug,
    queryFn: () => getSkillBySlug(selSlug!),
  });
  const active = selected.data ?? list.data?.[0];
  const { rels, index } = useRelSkills();

  return (
    <>
      <PageHeader eyebrow="Skill Intelligence" title="How skills connect to roles and each other" desc="Market frequency counts postings that mention a skill. Role links come from the requirement matrix; skill links from the curated skill graph and co-occurrence in postings." />

      <Panel className="mb-6">
        <h3 className="mb-3 font-semibold">Skill → Skill relationships</h3>
        {rels.isLoading ? <LoadingState /> : rels.error ? <ErrorState error={rels.error} /> : !rels.data?.length ? <EmptyState title="No relationships recorded" /> : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rels.data.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <button className="font-medium hover:text-primary" onClick={() => navigate({ search: { skill: index.get(r.from_skill_id)?.slug } })}>{index.get(r.from_skill_id)?.name ?? "…"}</button>
                <span className="text-xs text-muted-foreground">→ {r.relationship_type.replace(/_/g, " ")} →</span>
                <button className="font-medium hover:text-primary" onClick={() => navigate({ search: { skill: index.get(r.to_skill_id)?.slug } })}>{index.get(r.to_skill_id)?.name ?? "…"}</button>
                {r.strength != null && <span className="ml-auto text-xs tabular-nums text-muted-foreground">{r.strength}</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search 2,500+ skills…" className="pl-9" aria-label="Search skills" />
            </div>
            <div className="flex gap-2">
              <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 flex-1 rounded-md border bg-background px-2 text-sm">
                <option value="">All categories</option>
                {cats.data?.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={coreOnly} onChange={(e) => setCoreOnly(e.target.checked)} /> Core only
              </label>
            </div>
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{text || category || coreOnly ? "Results" : "Top skills"}</div>
          {list.isLoading ? <LoadingState /> : list.error ? <ErrorState error={list.error} /> : !list.data?.length ? <EmptyState title="No skills match" /> : (
            <ul className="mt-2 max-h-[560px] space-y-1 overflow-auto pr-1">
              {list.data.map((s) => (
                <li key={s.id}>
                  <button onClick={() => navigate({ search: { skill: s.slug } })} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent", active?.id === s.id && "bg-accent")}>
                    <span>
                      {s.name}
                      {s.category && <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>}
                    </span>
                    <span className="tabular-nums text-xs text-muted-foreground">{fmt(s.market_frequency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="lg:col-span-3">{active ? <SkillDetail skill={active} /> : <EmptyState title="Select a skill" />}</div>
      </div>
    </>
  );
}

function SkillDetail({ skill }: { skill: Skill }) {
  const reqs = useReqs();
  const roles = useRoles();
  const { rels, index } = useRelSkills();
  const co = useQuery({ queryKey: ["cooc", skill.id], queryFn: () => getCooccurringSkills(skill.id), staleTime: 1800000 });
  const roleLinks = (reqs.data ?? []).filter((r) => r.skill_id === skill.id).sort((a, b) => b.importance_weight - a.importance_weight);
  const prereqOf = (rels.data ?? []).filter((r) => r.from_skill_id === skill.id);
  const needs = (rels.data ?? []).filter((r) => r.to_skill_id === skill.id);
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{skill.name}</h2>
            <p className="text-sm text-muted-foreground">{skill.description ?? "No description in taxonomy."}</p>
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">{fmt(skill.market_frequency)}</div>
            <div className="text-xs text-muted-foreground">postings mention it</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {skill.category && <SkillBadge name={skill.category} />}
          {skill.is_core && <SkillBadge name="Core skill" tone="strong" />}
          {skill.source_type && <EvidenceBadge label={skill.source_type.replace(/_/g, " ")} />}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">Skill → Role</h3>
        {reqs.isLoading ? <LoadingState /> : roleLinks.length === 0 ? <p className="text-sm text-muted-foreground">No role in the requirement matrix lists this skill.</p> : (
          <ul className="space-y-2">
            {roleLinks.map((r) => (
              <li key={r.role_id} className="flex items-center justify-between text-sm">
                <span>{roles.data?.find((x) => x.id === r.role_id)?.name}</span>
                <span className="text-xs text-muted-foreground">importance {fmt(r.importance_weight, 2)} · {fmt(r.evidence_frequency)} postings</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel>
        <h3 className="mb-3 font-semibold">Prerequisite relationships</h3>
        {needs.length === 0 && prereqOf.length === 0 ? <p className="text-sm text-muted-foreground">No curated relationships for this skill.</p> : (
          <div className="space-y-3 text-sm">
            {needs.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-muted-foreground">Builds on:</span>{needs.map((r) => <SkillBadge key={r.id} name={`${index.get(r.from_skill_id)?.name ?? "…"} (${r.relationship_type.replace(/_/g, " ")})`} />)}</div>}
            {prereqOf.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-muted-foreground">Leads to:</span>{prereqOf.map((r) => <SkillBadge key={r.id} name={`${index.get(r.to_skill_id)?.name ?? "…"} (${r.relationship_type.replace(/_/g, " ")})`} />)}</div>}
          </div>
        )}
      </Panel>
      <Panel>
        <h3 className="mb-1 font-semibold">Related skills (co-occurrence)</h3>
        <p className="mb-3 text-xs text-muted-foreground">Skills most often listed in the same postings{co.data ? ` (sample of ${co.data.sampled} postings)` : ""}.</p>
        {co.isLoading ? <LoadingState /> : co.error ? <ErrorState error={co.error} /> : !co.data?.items.length ? <p className="text-sm text-muted-foreground">No postings are linked to this skill.</p> : (
          <div className="flex flex-wrap gap-1.5">{co.data.items.map((i) => <SkillBadge key={i.skill.id} name={`${i.skill.name} · ${i.count}`} slug={i.skill.slug} />)}</div>
        )}
      </Panel>
    </div>
  );
}

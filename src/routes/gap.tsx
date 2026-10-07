import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileText, Map as MapIcon, Plus, Search, Sparkles, Upload } from "lucide-react";
import { q } from "@/lib/skillsync/queries";
import { searchSkills } from "@/lib/skillsync/api";
import { detectSkills } from "@/lib/skillsync/analysis";
import { useGapAnalysis } from "@/lib/skillsync/useGap";
import { SkillGapCard } from "@/components/ss/cards";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, ReadinessScore, SkillBadge, fmt } from "@/components/ss/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/gap")({
  head: () => ({
    meta: [
      { title: "Skill Gap Analyzer — SkillSync AI" },
      { name: "description", content: "Compare your skills to a target role and get an evidence-based readiness score and prioritized gaps." },
      { property: "og:title", content: "Skill Gap Analyzer — SkillSync AI" },
      { property: "og:description", content: "See strong, partial and missing skills for your target role." },
    ],
  }),
  component: GapPage,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </Panel>
  );
}

function GapPage() {
  const { profile, roles, role, result, loading, error } = useGapAnalysis();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [resume, setResume] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const search = useQuery({ queryKey: ["gapSearch", term], queryFn: () => searchSkills({ q: term, limit: 12 }), enabled: term.length >= 2 });
  const aliases = useQuery({ ...q.aliases, enabled: resume.length > 0 });

  const extract = () => {
    if (!aliases.data) return;
    const found = detectSkills(resume, aliases.data);
    if (!found.size) { toast.info("No known skills were found in that text."); return; }
    const add = async () => {
      const { getSkillsByIds } = await import("@/lib/skillsync/api");
      const skills = await getSkillsByIds([...found.keys()].slice(0, 150));
      skills.forEach((s) => profile.addSkill({ id: s.id, name: s.name, source: "resume", evidence: `matched "${found.get(s.id)}" in resume text` }));
      toast.success(`Found ${skills.length} skills with text evidence in your resume.`);
    };
    add().catch((e) => toast.error(String(e)));
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name) && !f.type.startsWith("text/")) { toast.error("Please upload a .txt resume or paste the text below — PDF reading isn't supported yet."); return; }
    setResume(await f.text());
  };

  const groups = result ? { strong: result.items.filter((i) => i.match === "strong"), partial: result.items.filter((i) => i.match === "partial"), missing: result.items.filter((i) => i.match === "missing") } : null;
  const gaps = result ? result.items.filter((i) => i.match !== "strong").sort((a, b) => ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority) || a.importanceRank - b.importanceRank) : [];

  return (
    <>
      <PageHeader eyebrow="Skill Gap Analyzer" title="How ready are you for your target role?" desc="Only skills you add — or that are found word-for-word in your resume text — count as yours. Nothing is assumed." />
      {error && <ErrorState error={error} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Step n={1} title="Select target role">
          {roles.isLoading ? <LoadingState /> : (
            <div className="flex flex-wrap gap-2">
              {roles.data?.map((r) => (
                <button key={r.id} onClick={() => profile.setTargetRole(r.id)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${profile.targetRoleId === r.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"}`}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </Step>
        <Step n={2} title="Add your skills">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Type a skill, e.g. Python" className="pl-9" aria-label="Search skills to add" />
          </div>
          {term.length >= 2 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {search.isLoading ? <span className="text-xs text-muted-foreground">Searching…</span> : search.data?.length ? search.data.map((s) => (
                <button key={s.id} onClick={() => { profile.addSkill({ id: s.id, name: s.name, source: "manual" }); setTerm(""); }} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-primary/50">
                  <Plus className="h-3 w-3" /> {s.name}
                </button>
              )) : <span className="text-xs text-muted-foreground">No matching skill.</span>}
            </div>
          )}
          <div className="mt-4 rounded-xl border border-dashed p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Or use resume text</span>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1"><Upload className="h-3.5 w-3.5" /> .txt</Button>
              <input ref={fileRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
            <Textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume text here…" rows={4} />
            <Button size="sm" className="mt-2" disabled={!resume || aliases.isLoading} onClick={extract}>{aliases.isLoading ? "Loading skill dictionary…" : "Extract skills"}</Button>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Your profile · {profile.skills.length} skills</span>
              {profile.skills.length > 0 && <button onClick={profile.clearSkills} className="hover:text-foreground">Clear all</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.length ? profile.skills.map((s) => <SkillBadge key={s.id} name={s.source === "resume" ? `${s.name} ·cv` : s.name} onRemove={() => profile.removeSkill(s.id)} />) : <span className="text-sm text-muted-foreground">No skills added yet.</span>}
            </div>
          </div>
        </Step>
      </div>

      <div className="my-6 flex justify-center">
        <Button size="lg" className="gap-2" disabled={!role || loading} onClick={() => profile.setAnalyzed(true)}>
          <Sparkles className="h-4 w-4" /> {role ? `Analyze for ${role.name}` : "Pick a role to analyze"}
        </Button>
      </div>

      {profile.analyzed && role && (loading ? <LoadingState /> : result && groups && (
        result.items.length === 0 ? <EmptyState title="This role has no recorded skill requirements" /> : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Panel className="flex flex-col items-center gap-6 md:flex-row">
            <ReadinessScore value={result.readiness} />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{role.name} readiness</h2>
              <p className="mt-1 text-sm text-muted-foreground">Share of the role's importance-weighted requirements you cover ({result.items.length} skills). Partial matches count half.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-success/10 p-3"><div className="text-2xl font-semibold text-success">{groups.strong.length}</div><div className="text-xs text-muted-foreground">Strong</div></div>
                <div className="rounded-xl bg-warning/10 p-3"><div className="text-2xl font-semibold text-warning">{groups.partial.length}</div><div className="text-xs text-muted-foreground">Partial</div></div>
                <div className="rounded-xl bg-destructive/10 p-3"><div className="text-2xl font-semibold text-destructive">{groups.missing.length}</div><div className="text-xs text-muted-foreground">Missing</div></div>
              </div>
            </div>
            <Button size="lg" variant="secondary" className="gap-2" onClick={() => navigate({ to: "/roadmap" })}><MapIcon className="h-4 w-4" /> Generate roadmap</Button>
          </Panel>

          <div className="grid gap-4 md:grid-cols-3">
            {(["strong", "partial", "missing"] as const).map((k) => (
              <Panel key={k}>
                <h3 className="mb-3 font-semibold capitalize">{k} skills <span className="text-muted-foreground">({groups[k].length})</span></h3>
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-auto">
                  {groups[k].length ? groups[k].map((i) => <SkillBadge key={i.skill.id} name={i.skill.name} tone={k} />) : <span className="text-sm text-muted-foreground">None</span>}
                </div>
              </Panel>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold">Prioritized gaps</h2>
            {gaps.length === 0 ? <EmptyState title="No gaps — you cover every requirement" /> : (
              <div className="grid gap-3 md:grid-cols-2">{gaps.slice(0, 20).map((g) => <SkillGapCard key={g.skill.id} item={g} />)}</div>
            )}
            {gaps.length > 20 && <p className="mt-3 text-sm text-muted-foreground">Showing top 20 of {fmt(gaps.length)} gaps. <Link to="/roadmap" className="text-primary">See your roadmap</Link></p>}
          </div>
        </div>
      )))}
    </>
  );
}

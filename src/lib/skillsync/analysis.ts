import type { JobLite, Relationship, Requirement, Skill } from "./api";

/** "6-10 yrs" -> {min:6,max:10} */
export function parseExperience(e: string | null) {
  const m = e?.match(/(\d+)\s*-\s*(\d+)/);
  return m ? { min: +m[1], max: +m[2] } : null;
}
/** "6to10" -> midpoint 8 (in the source's own salary-band units). */
export function parseSalary(s: string | null) {
  const m = s?.match(/(\d+)\s*to\s*(\d+)/i);
  return m ? (+m[1] + +m[2]) / 2 : null;
}

export function median(nums: number[]) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export function summarizeJobs(jobs: JobLite[]) {
  const sal = jobs.map((j) => parseSalary(j.salary)).filter((x): x is number => x !== null);
  const exp = jobs.map((j) => parseExperience(j.experience)).filter(Boolean) as { min: number; max: number }[];
  const bandCounts = new Map<string, number>();
  jobs.forEach((j) => j.salary && parseSalary(j.salary) !== null && bandCounts.set(j.salary, (bandCounts.get(j.salary) ?? 0) + 1));
  const topBand = [...bandCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    sampled: jobs.length,
    salaryDisclosed: sal.length,
    medianSalary: median(sal),
    topBand,
    medianMinExp: median(exp.map((e) => e.min)),
    medianMaxExp: median(exp.map((e) => e.max)),
  };
}

const EXP_BUCKETS = [
  { label: "0–2 yrs", lo: 0, hi: 2 },
  { label: "3–5 yrs", lo: 3, hi: 5 },
  { label: "6–9 yrs", lo: 6, hi: 9 },
  { label: "10–14 yrs", lo: 10, hi: 14 },
  { label: "15+ yrs", lo: 15, hi: 99 },
];
export function salaryByExperience(jobs: JobLite[]) {
  return EXP_BUCKETS.map((b) => {
    const s = jobs
      .filter((j) => {
        const e = parseExperience(j.experience);
        return e && e.min >= b.lo && e.min <= b.hi;
      })
      .map((j) => parseSalary(j.salary))
      .filter((x): x is number => x !== null);
    return { bucket: b.label, median: median(s), postings: s.length };
  });
}

export type MatchLevel = "strong" | "partial" | "missing";
export type Priority = "High" | "Medium" | "Low";
export type GapItem = {
  skill: Skill;
  importance: number;
  importanceRank: number;
  evidenceFrequency: number;
  evidenceSource: string | null;
  match: MatchLevel;
  priority: Priority;
  partialVia: Skill[];
  prerequisites: Skill[];
  explanation: string;
};

export function analyzeGap(
  reqs: Requirement[],
  userSkillIds: Set<string>,
  rels: Relationship[],
  skillIndex: Map<string, Skill>,
) {
  const sorted = [...reqs].filter((r) => r.skill).sort((a, b) => b.importance_weight - a.importance_weight);
  const n = sorted.length;
  const items: GapItem[] = sorted.map((r, i) => {
    const related = rels.filter((x) => x.from_skill_id === r.skill_id || x.to_skill_id === r.skill_id);
    const partialVia = related
      .map((x) => (x.from_skill_id === r.skill_id ? x.to_skill_id : x.from_skill_id))
      .filter((id) => userSkillIds.has(id))
      .map((id) => skillIndex.get(id))
      .filter(Boolean) as Skill[];
    const prerequisites = rels
      .filter((x) => x.relationship_type === "prerequisite_of" && x.to_skill_id === r.skill_id)
      .map((x) => skillIndex.get(x.from_skill_id))
      .filter(Boolean) as Skill[];
    const match: MatchLevel = userSkillIds.has(r.skill_id) ? "strong" : partialVia.length ? "partial" : "missing";
    const pct = n ? i / n : 1;
    const priority: Priority = match === "strong" ? "Low" : pct < 0.2 ? "High" : pct < 0.5 ? "Medium" : "Low";
    const ef = r.evidence_frequency ?? 0;
    const evidenceTxt = ef > 0 ? `observed in ${ef} ${r.evidence_source ?? "job"} postings for this role` : "no posting-level evidence recorded";
    const explanation =
      match === "strong"
        ? `You listed this skill. It ranks #${i + 1} of ${n} for the role and is ${evidenceTxt}.`
        : match === "partial"
          ? `Not in your profile, but you have related skill${partialVia.length > 1 ? "s" : ""} (${partialVia.map((s) => s.name).join(", ")}) per the skill graph. Ranks #${i + 1} of ${n}; ${evidenceTxt}.`
          : `Not in your profile. Ranks #${i + 1} of ${n} for the role; ${evidenceTxt}.`;
    return {
      skill: r.skill,
      importance: r.importance_weight,
      importanceRank: i + 1,
      evidenceFrequency: ef,
      evidenceSource: r.evidence_source,
      match,
      priority,
      partialVia,
      prerequisites,
      explanation,
    };
  });
  const total = items.reduce((s, x) => s + x.importance, 0);
  const got = items.reduce((s, x) => s + (x.match === "strong" ? x.importance : x.match === "partial" ? x.importance * 0.5 : 0), 0);
  const readiness = total ? Math.round((got / total) * 100) : 0;
  return { items, readiness };
}

/** Detect skills in free text using the existing alias table (word-boundary match). */
export function detectSkills(text: string, aliases: { skill_id: string; alias: string }[]) {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ")} `;
  const found = new Map<string, string>();
  for (const a of aliases) {
    const al = a.alias.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
    if (al.length < 2) continue;
    if (t.includes(` ${al} `) && !found.has(a.skill_id)) found.set(a.skill_id, a.alias);
  }
  return found;
}

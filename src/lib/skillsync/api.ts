import { db } from "./client";

export type Role = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  evidence_status: string | null;
  search_patterns: string[] | null;
  sort_order: number | null;
};
export type Skill = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  source_type: string | null;
  market_frequency: number | null;
  is_core: boolean | null;
};
export type Requirement = {
  role_id: string;
  skill_id: string;
  importance_weight: number;
  evidence_frequency: number | null;
  evidence_source: string | null;
  skill: Skill;
};
export type Relationship = {
  id: number;
  from_skill_id: string;
  to_skill_id: string;
  relationship_type: string;
  strength: number | null;
  evidence: string | null;
};
export type JobLite = { experience: string | null; salary: string | null; job_desig?: string | null };

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

async function countOf(table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Fetch every row of a query in 1000-row pages. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, total?: number): Promise<T[]> {
  const page = 1000;
  if (total !== undefined) {
    const pages = Math.ceil(total / page);
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) => build(i * page, i * page + page - 1)),
    );
    return results.flatMap((r) => check(r as { data: T[] | null; error: { message: string } | null }));
  }
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const r = (await build(from, from + page - 1)) as { data: T[] | null; error: { message: string } | null };
    const rows = check(r);
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function getCounts() {
  const [analyticsJobs, dataScienceJobs, skills, roles] = await Promise.all([
    countOf("raw_analytics_jobs"),
    countOf("raw_data_science_jobs"),
    countOf("skills"),
    countOf("roles"),
  ]);
  return { analyticsJobs, dataScienceJobs, skills, roles };
}

export async function getRoles(): Promise<Role[]> {
  return check(await db.from("roles").select("*").order("sort_order"));
}

const SKILL_COLS = "id,slug,name,category,description,source_type,market_frequency,is_core";

export async function getRequirements(): Promise<Requirement[]> {
  return fetchAll<Requirement>((a, b) =>
    db
      .from("role_skill_requirements")
      .select(`role_id,skill_id,importance_weight,evidence_frequency,evidence_source,skill:skills(${SKILL_COLS})`)
      .order("id")
      .range(a, b),
  );
}

export async function getTopSkills(limit = 15): Promise<Skill[]> {
  return check(
    await db.from("skills").select(SKILL_COLS).gt("market_frequency", 0).order("market_frequency", { ascending: false }).limit(limit),
  );
}

export async function searchSkills(opts: { q?: string; category?: string; coreOnly?: boolean; limit?: number }): Promise<Skill[]> {
  let q = db.from("skills").select(SKILL_COLS);
  if (opts.q) q = q.ilike("name", `%${opts.q}%`);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.coreOnly) q = q.eq("is_core", true);
  return check(await q.order("market_frequency", { ascending: false, nullsFirst: false }).limit(opts.limit ?? 60));
}

export async function getCategories(): Promise<string[]> {
  const rows = await fetchAll<{ category: string | null }>((a, b) => db.from("skills").select("category").order("id").range(a, b));
  return Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[])).sort();
}

export async function getSkillsByIds(ids: string[]): Promise<Skill[]> {
  if (!ids.length) return [];
  return check(await db.from("skills").select(SKILL_COLS).in("id", ids));
}

export async function getRelationships(): Promise<Relationship[]> {
  return check(await db.from("skill_relationships").select("*").order("id"));
}

export async function getAliases(): Promise<{ skill_id: string; alias: string }[]> {
  return fetchAll((a, b) => db.from("skill_aliases").select("skill_id,alias").order("id").range(a, b));
}

export async function getLocations(limit = 12): Promise<{ location: string; posting_count: number }[]> {
  return check(await db.from("v_location_market").select("location,posting_count").order("posting_count", { ascending: false }).limit(limit));
}

export function roleFilter(role: Role) {
  return (role.search_patterns ?? [`%${role.name}%`]).map((p) => `job_desig.ilike.${p}`).join(",");
}

export async function getRoleDemand(role: Role): Promise<number> {
  const { count, error } = await db.from("raw_analytics_jobs").select("id", { count: "exact", head: true }).or(roleFilter(role));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getRoleJobs(role: Role, limit = 1000): Promise<JobLite[]> {
  return check(await db.from("raw_analytics_jobs").select("job_desig,experience,salary").or(roleFilter(role)).limit(limit));
}

export async function getAllJobsLite(): Promise<JobLite[]> {
  const total = await countOf("raw_analytics_jobs");
  return fetchAll<JobLite>((a, b) => db.from("raw_analytics_jobs").select("experience,salary").order("id").range(a, b), total);
}

/** Skills co-occurring with a given skill in analytics job postings. */
export async function getCooccurringSkills(skillId: string, limit = 10) {
  const jobs = check<{ job_id: number }[]>(
    await db.from("analytics_job_skills").select("job_id").eq("skill_id", skillId).limit(300),
  );
  const ids = jobs.map((j) => j.job_id);
  if (!ids.length) return { sampled: 0, items: [] as { skill: Skill; count: number }[] };
  const rows = check<{ skill_id: string }[]>(
    await db.from("analytics_job_skills").select("skill_id").in("job_id", ids).neq("skill_id", skillId).limit(5000),
  );
  const counts = new Map<string, number>();
  rows.forEach((r) => r.skill_id && counts.set(r.skill_id, (counts.get(r.skill_id) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const skills = await getSkillsByIds(top.map((t) => t[0]));
  const byId = new Map(skills.map((s) => [s.id, s]));
  return {
    sampled: ids.length,
    items: top.filter((t) => byId.has(t[0])).map(([id, count]) => ({ skill: byId.get(id)!, count })),
  };
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  const { data, error } = await db.from("skills").select(SKILL_COLS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Skill | null;
}

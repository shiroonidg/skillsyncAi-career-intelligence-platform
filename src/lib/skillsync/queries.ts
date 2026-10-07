import { queryOptions, useQuery } from "@tanstack/react-query";
import * as api from "./api";
import type { Skill } from "./api";

const long = { staleTime: 1000 * 60 * 30 };

export const q = {
  counts: queryOptions({ queryKey: ["counts"], queryFn: api.getCounts, ...long }),
  roles: queryOptions({ queryKey: ["roles"], queryFn: api.getRoles, ...long }),
  reqs: queryOptions({ queryKey: ["reqs"], queryFn: api.getRequirements, ...long }),
  topSkills: queryOptions({ queryKey: ["topSkills"], queryFn: () => api.getTopSkills(15), ...long }),
  rels: queryOptions({ queryKey: ["rels"], queryFn: api.getRelationships, ...long }),
  locations: queryOptions({ queryKey: ["locations"], queryFn: () => api.getLocations(12), ...long }),
  allJobs: queryOptions({ queryKey: ["allJobsLite"], queryFn: api.getAllJobsLite, ...long }),
  aliases: queryOptions({ queryKey: ["aliases"], queryFn: api.getAliases, ...long }),
  categories: queryOptions({ queryKey: ["categories"], queryFn: api.getCategories, ...long }),
};

export function useRoles() {
  return useQuery(q.roles);
}
export function useReqs() {
  return useQuery(q.reqs);
}
export function useRels() {
  return useQuery(q.rels);
}

export function useRoleDemand(role?: api.Role) {
  return useQuery({ queryKey: ["demand", role?.id], queryFn: () => api.getRoleDemand(role!), enabled: !!role, ...long });
}
export function useRoleJobs(role?: api.Role) {
  return useQuery({ queryKey: ["roleJobs", role?.id], queryFn: () => api.getRoleJobs(role!), enabled: !!role, ...long });
}

/** Skills referenced by the relationship graph, indexed by id. */
export function useRelSkills() {
  const rels = useRels();
  const ids = Array.from(new Set((rels.data ?? []).flatMap((r) => [r.from_skill_id, r.to_skill_id])));
  const skills = useQuery({
    queryKey: ["relSkills", ids.join(",")],
    queryFn: () => api.getSkillsByIds(ids),
    enabled: !!rels.data,
    ...long,
  });
  const index = new Map<string, Skill>((skills.data ?? []).map((s) => [s.id, s]));
  return { rels, skills, index };
}

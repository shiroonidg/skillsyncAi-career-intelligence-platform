import { useMemo } from "react";
import { analyzeGap } from "./analysis";
import { useProfile } from "./store";
import { useReqs, useRelSkills, useRoles } from "./queries";
import type { Skill } from "./api";

export function useGapAnalysis() {
  const profile = useProfile();
  const roles = useRoles();
  const reqs = useReqs();
  const { rels, index } = useRelSkills();
  const role = roles.data?.find((r) => r.id === profile.targetRoleId);
  const loading = roles.isLoading || reqs.isLoading || rels.isLoading;
  const error = roles.error ?? reqs.error ?? rels.error;

  const result = useMemo(() => {
    if (!role || !reqs.data || !rels.data) return null;
    const roleReqs = reqs.data.filter((r) => r.role_id === role.id);
    const idx = new Map<string, Skill>(index);
    roleReqs.forEach((r) => r.skill && idx.set(r.skill_id, r.skill));
    profile.skills.forEach((s) => !idx.has(s.id) && idx.set(s.id, { id: s.id, name: s.name } as Skill));
    return analyzeGap(roleReqs, new Set(profile.skills.map((s) => s.id)), rels.data, idx);
  }, [role, reqs.data, rels.data, index, profile.skills]);

  return { profile, roles, role, result, loading, error };
}

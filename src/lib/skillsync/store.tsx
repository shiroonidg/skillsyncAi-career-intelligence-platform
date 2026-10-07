import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ProfileSkill = { id: string; name: string; source: "manual" | "resume"; evidence?: string };
type State = {
  targetRoleId: string | null;
  skills: ProfileSkill[];
  analyzed: boolean;
};
type Ctx = State & {
  setTargetRole: (id: string | null) => void;
  addSkill: (s: ProfileSkill) => void;
  removeSkill: (id: string) => void;
  clearSkills: () => void;
  setAnalyzed: (v: boolean) => void;
};

const KEY = "skillsync-profile-v1";
const C = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ targetRoleId: null, skills: [], analyzed: false });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...state, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const ctx: Ctx = {
    ...state,
    setTargetRole: (id) => setState((s) => ({ ...s, targetRoleId: id, analyzed: s.targetRoleId === id ? s.analyzed : false })),
    addSkill: (sk) => setState((s) => (s.skills.some((x) => x.id === sk.id) ? s : { ...s, skills: [...s.skills, sk] })),
    removeSkill: (id) => setState((s) => ({ ...s, skills: s.skills.filter((x) => x.id !== id) })),
    clearSkills: () => setState((s) => ({ ...s, skills: [], analyzed: false })),
    setAnalyzed: (v) => setState((s) => ({ ...s, analyzed: v })),
  };
  return <C.Provider value={ctx}>{children}</C.Provider>;
}

export function useProfile() {
  const c = useContext(C);
  if (!c) throw new Error("useProfile outside provider");
  return c;
}

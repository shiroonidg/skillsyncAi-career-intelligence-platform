import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useReqs, useRoles } from "@/lib/skillsync/queries";
import { RoleCard } from "@/components/ss/cards";
import { SkeletonCard, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ss/primitives";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/careers/")({
  head: () => ({
    meta: [
      { title: "Career Explorer — SkillSync AI" },
      { name: "description", content: "Explore career roles with real demand, salary bands, experience and required skills." },
      { property: "og:title", content: "Career Explorer — SkillSync AI" },
      { property: "og:description", content: "Browse roles backed by real job-posting evidence." },
    ],
  }),
  component: Careers,
});

function Careers() {
  const roles = useRoles();
  const reqs = useReqs();
  const [qs, setQ] = useState("");
  const list = (roles.data ?? []).filter((r) => (r.name + " " + (r.description ?? "")).toLowerCase().includes(qs.toLowerCase()));
  return (
    <>
      <PageHeader
        eyebrow="Career Explorer"
        title="Explore Careers"
        desc="Discover roles, required capabilities, demand, experience, and salary context."
        actions={
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={qs} onChange={(e) => setQ(e.target.value)} placeholder="Search roles…" className="h-11 pl-9" aria-label="Search roles" />
          </div>
        }
      />
      {roles.isLoading || reqs.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}</div> : roles.error ? <ErrorState error={roles.error} /> : reqs.error ? <ErrorState error={reqs.error} /> : list.length === 0 ? (
        <EmptyState title="No matching roles found" desc="Try another keyword, such as analyst or engineer." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => <RoleCard key={r.id} role={r} reqs={reqs.data ?? []} />)}
        </div>
      )}
    </>
  );
}

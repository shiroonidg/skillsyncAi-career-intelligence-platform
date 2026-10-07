<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All data is read-only from the external `skillsync` schema via `src/lib/skillsync/api.ts` (browser client, publishable key); never create/modify tables or use mock data — the user owns the schema.
- Profile (target role + skills) persists in localStorage via `ProfileProvider` — no auth exists yet.

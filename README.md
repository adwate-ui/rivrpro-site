# rivrpro.com

RIVR's partner and investor website. Independent of the RIVR platform: no shared code, backend or links.

- Spec: `docs/specs/2026-11-10-rivrpro-site-design.md` · Plan: `docs/plans/2026-11-10-rivrpro-site.md`
- Setup: `pnpm i && cp .env.example .env && cp .dev.vars.example .dev.vars && pnpm cf-types`
- `pnpm dev` (pages only) · `pnpm preview` (pages + Worker on :8787) · `pnpm test` · `pnpm e2e` · `pnpm lhci`
- Deploys: CI deploys `main` to Cloudflare; pull requests get a preview URL.
- Words live in `src/content/`. Photos go in `src/assets/photos/` by name (see `src/content/media.ts`).

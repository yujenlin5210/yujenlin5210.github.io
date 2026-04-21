# Project Review

Initial static review completed on 2026-04-20 against the `master` branch state at that time.

Status update on 2026-04-21:

- All Phase 0 through Phase 4 items in this document have been implemented on the current branch.
- The numbered findings below are kept as an audit log of what was wrong before the cleanup pass.

Current validation baseline:

- `npm run check` passes.
- `npm run check` now runs `astro check`, `eslint`, `astro build`, and a built-HTML validation pass.
- Generated HTML no longer ships stray content after `</html>` or literal `className=` attributes.
- `astro check` still reports TypeScript hints in older files, but no errors or warnings.

## Findings

### 1. About page ships malformed output

Severity: High

Files:

- `src/pages/about.astro:248-250`

Why it matters:

- The file ends with an extra `on>` token and a duplicate `</Layout>`.
- This does not fail the build, but it does leak stray text into the final page output.
- The built file currently ends with trailing text after the HTML document.

Evidence:

```astro
</Layout>
on>
</Layout>
```

Suggested fix:

- Remove the stray trailing lines.
- Add a validation step that catches malformed `.astro` output before it ships.

Phase:

- Phase 1

### 2. Project detail pages render invalid `className` HTML

Severity: High

Files:

- `src/pages/projects/[id].astro:38`

Why it matters:

- `.astro` HTML elements should use `class`, not `className`.
- The current code emits a literal `className="..."` attribute into built HTML, so the role line styling does not apply.

Evidence:

```astro
{project.data.role && (
  <p className="text-indigo-600 dark:text-indigo-400 font-medium text-xl mb-4">
    {project.data.role}
  </p>
)}
```

Built output currently contains:

```html
<p className="text-indigo-600 dark:text-indigo-400 font-medium text-xl mb-4">...</p>
```

Suggested fix:

- Replace `className` with `class` on native HTML elements inside `.astro` files.
- Add an Astro-aware lint rule so this is caught automatically.

Phase:

- Phase 1

### 3. Video mute toggle setup can accumulate listeners across client-router navigations

Severity: Medium

Files:

- `src/pages/lab/[id].astro:105-132`

Why it matters:

- The page registers a global `astro:page-load` listener but never removes it.
- `setupVideoMuteToggle()` also attaches a `click` listener to `#mute-toggle` without a cleanup path or idempotence guard.
- On repeated SPA navigations to lab detail pages, this can stack event handlers and produce duplicate toggles.

Evidence:

```js
document.addEventListener('astro:page-load', setupVideoMuteToggle);
```

and

```js
muteToggle.addEventListener('click', () => {
  video.muted = !video.muted;
  ...
});
```

Suggested fix:

- Move this behavior into a small client component or an idempotent setup function with teardown.
- If it stays inline, guard against duplicate listener attachment and unregister on swap/unmount.

Phase:

- Phase 2

### 4. Internal lab tags leak into the public lab index

Severity: Medium

Files:

- `src/components/LabRegistry.jsx:89-94`
- `src/utils/filterTags.ts:1-4`
- Representative content entry: `src/content/lab/2017-04-30-magic_table.md:12`

Why it matters:

- The project already has an internal tag filter utility, but `LabRegistry` bypasses it and renders raw tags.
- This leaks internal taxonomy such as `project-feature` into the public UI.
- The current built lab index does include `project-feature`.

Evidence:

```jsx
{lab.data.tags?.map(tag => (
  <span key={tag}>{tag}</span>
))}
```

Suggested fix:

- Run lab tags through `filterTags()` before rendering.
- Consider hardening content schema so `tags` is always a string array.

Phase:

- Phase 2

### 5. Content schema is too permissive and already masks malformed content

Severity: Medium

Files:

- `src/content.config.ts:8-16`
- `src/content.config.ts:29-37`
- Representative bad slug: `src/content/lab/2016-02-29-3d_printing.md` (normalized from the original impossible February 30 slug)
- Representative sort logic: `src/pages/index.astro:11-12`, `src/pages/projects/index.astro:11-14`, `src/pages/lab/index.astro:12-13`

Why it matters:

- The schema uses `z.any()` for `date`, `description`, `category`, and `tags`, which prevents content mistakes from surfacing early.
- The list pages fall back to `new Date(id.slice(0, 10))`, which silently normalizes invalid dates instead of rejecting them.
- Example: `new Date('2016-02-30')` becomes `2016-03-01T00:00:00.000Z`, which means sorting can be wrong without any warning.

Evidence:

```ts
date: z.any().optional(),
description: z.any().optional().transform(...),
category: z.any().optional(),
tags: z.any().optional(),
```

Suggested fix:

- Replace `z.any()` with explicit schema types.
- Use a single normalized content shape for dates and tags.
- Fail fast on invalid date metadata instead of deriving dates from filenames unless the filename format is guaranteed valid.

Phase:

- Phase 3

### 6. Tooling is not strong enough to catch markup and content regressions

Severity: Medium

Files:

- `package.json:8-13`

Why it matters:

- The current scripts only cover `dev`, `build`, `preview`, and `astro`.
- Build success did not catch the malformed About page tail or the invalid `className` HTML on project detail pages.
- This is the underlying process gap behind several of the issues above.

Suggested fix:

- Add `astro check`.
- Add linting for Astro, React, and content files.
- Add at least one smoke validation step in CI for generated HTML or route-level snapshots.

Phase:

- Phase 0 or Phase 4, depending on whether you want guardrails before more refactors.

### 7. There is dead or misleading code in the projects flow

Severity: Low

Files:

- `src/pages/projects/index.astro:6`
- `src/pages/projects/index.astro:11`
- `src/store/projectStore.ts:3`
- `src/components/CinematicProject.jsx:41-42`

Why it matters:

- `projects/index.astro` imports `MorphingBackground` from a file that does not exist and never uses it.
- `sortedProjects` is created but the page renders `projects`; this works only because `.sort()` mutates the original array in place, which is subtle and easy to regress later.
- `activeProjectId` is written from `CinematicProject` but is not read anywhere in the repo.

Suggested fix:

- Remove the dead import.
- Render `sortedProjects` directly instead of relying on mutation side effects.
- Delete `activeProjectId` or wire it into a real feature.

Phase:

- Phase 4

## Suggested Phases

### Phase 0: Add Guardrails

Goal:

- Stop shipping silent markup and schema regressions while cleanup is in progress.

Status:

- Completed on 2026-04-21.

Completed work:

- Added `astro:check`, `lint`, `validate:html`, and aggregate `check` scripts in [package.json](package.json).
- Added [eslint.config.js](eslint.config.js) with Astro-aware parsing and React coverage scoped to authored source files.
- Added [scripts/validate-built-html.mjs](scripts/validate-built-html.mjs) to catch malformed generated HTML and leaked `className=` output.

### Phase 1: Fix User-Facing Correctness Bugs

Goal:

- Eliminate issues that currently ship broken or visibly incorrect output.

Status:

- Completed on 2026-04-21.

Completed work:

- Removed the stray trailing `on>` and duplicate `</Layout>` from [src/pages/about.astro](src/pages/about.astro).
- Replaced native `.astro` `className` usage in [src/pages/projects/[id].astro](src/pages/projects/[id].astro).
- Added validation coverage so this class of malformed output now fails checks instead of silently shipping.

### Phase 2: Clean Up Route And UI Lifecycle Issues

Goal:

- Remove issues that can accumulate state or produce inconsistent behavior during client-side navigation.

Status:

- Completed on 2026-04-21.

Completed work:

- Refactored the cover-video mute toggle in [src/pages/lab/[id].astro](src/pages/lab/[id].astro) into an idempotent setup with explicit teardown on route swap.
- Filtered public lab tags through [src/utils/filterTags.ts](src/utils/filterTags.ts) inside [src/components/LabRegistry.jsx](src/components/LabRegistry.jsx).
- Moved the inline lab script back inside the page document after the HTML validator exposed that it was being emitted after `</html>`.

### Phase 3: Harden Content Contracts

Goal:

- Make frontmatter and sorting deterministic.

Status:

- Completed on 2026-04-21.

Completed work:

- Replaced permissive `z.any()` fields in [src/content.config.ts](src/content.config.ts) with explicit schema fields.
- Added shared date normalization helpers in [src/utils/content.ts](src/utils/content.ts).
- Standardized list sorting to use validated dates instead of direct `new Date(id.slice(0, 10))` fallbacks.
- Normalized the invalid slug `2016-02-30-3d_printing` to [src/content/lab/2016-02-29-3d_printing.md](src/content/lab/2016-02-29-3d_printing.md).

### Phase 4: Remove Dead Code And Improve Performance Baselines

Goal:

- Reduce maintenance overhead and unnecessary client work.

Status:

- Completed on 2026-04-21.

Completed work:

- Removed the dead `MorphingBackground` import from [src/pages/projects/index.astro](src/pages/projects/index.astro).
- Removed unused `activeProjectId` state from [src/store/projectStore.ts](src/store/projectStore.ts).
- Made project and lab sorting explicit with shared helpers instead of relying on in-place mutation side effects.
- Switched the projects listing islands from `client:load` to `client:visible` in [src/pages/projects/index.astro](src/pages/projects/index.astro).

## Additional Suggestions

These are not the strongest findings, but they are worth addressing after the phased fixes above:

- Review homepage and projects-page hydration cost. The homepage `HeroScene` and the fully hydrated `CinematicProject` list are likely your biggest avoidable client-side JS costs.
- Add a `prefers-reduced-motion` fallback for Framer Motion and WebGL-heavy surfaces.
- Replace ad hoc `console.error` paths in user-facing runtime code with quieter diagnostics unless the error is actionable.
- Consider adding a small `docs/architecture.md` describing the split between Astro pages, React islands, and content collections. The project is now large enough that this would pay off quickly.

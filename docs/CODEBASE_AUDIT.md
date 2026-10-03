# Codebase audit

Audited on 2026-10-03. Overall health: yellow. The verified cleanup passes formatting, lint, TypeScript, unit tests, coverage generation, and the production build. Large orchestration modules and limited branch coverage remain the main maintenance concerns.

## Scope and evidence

Reviewed application entrypoints, API handlers, shared libraries, hooks, components, package manifests, tooling configuration, and CI. A TypeScript import graph included static imports, re-exports, dynamic imports, and test mocks; Next.js convention files, tests, scripts, and root configuration files were treated as entrypoints. Repository searches confirmed references before removing unreachable modules. Configuration and peer dependencies were checked separately from source imports.

## Changes applied

- Deleted 15 unreachable files, totaling approximately 2,700 lines: unused Zustand stores, the premium gate, checkbox/popover/surface components, attachment/service-worker/undo hooks, the service worker, an analytics barrel, and unused API/editor types.
- Removed 33 unused direct dependencies. A frozen offline installation removed 72 installed packages while preserving existing dependency versions. TipTap core/ProseMirror peer dependencies, PostCSS, and script tooling were retained.
- Replaced more than 1,000 copied browser-global declarations with Oxlint's browser environment.
- Removed unread status counters, an unused keyboard ref, unused font/email variables, and an uncalled GDPR export helper.
- Fixed `apiRequest` to preserve every supported `HeadersInit` form and handle case-insensitive content-type/CSRF overrides. Added four regression cases and updated service assertions for the normalized headers.
- Added accessible labels to color/table controls and the email heatmap iframe.
- Avoided intermediate number arrays and duplicate byte-array allocations during attachment decoding; simplified a redundant chart emptiness check.
- Applied the configured formatter throughout the repository to resolve the baseline formatting failures.

## Remaining findings, in priority order

1. **Should fix: large orchestration modules.** `hooks/useEmailSend.ts`, `lib/services/email-service.ts`, `app/(app)/draft/page.tsx`, `app/(app)/ab-testing/page.tsx`, and `components/compose-form.tsx` combine substantial state, workflow, and presentation logic. Extract cohesive sending/recovery and draft/editing boundaries in separate behavior-tested changes. Mechanical file splitting would not resolve their coupling.
2. **Should fix: coverage gaps.** The suite reports 58.90% line coverage and 47.41% branch coverage for the modules measured by its current coverage configuration. Prioritize OAuth persistence, scheduled delivery recovery, and email-service error branches. These figures do not establish end-to-end coverage of all application routes or UI.
3. **Low priority: ten lint warnings.** Remaining warnings include control-character regular expressions used in sanitization/encoding, an autofocus, constant conditional test inputs, a region element, a progress visualization without an accessible name, and a heading whose content is forwarded through props. Review these individually; avoid disabling the rules globally.

## Validation

| Check                                              | Result                                |
| -------------------------------------------------- | ------------------------------------- |
| `vp install --frozen-lockfile --offline`           | Passed                                |
| `vp check`                                         | Passed; 0 errors, 10 warnings         |
| `vp run typecheck`                                 | Passed                                |
| `vp test run`                                      | 53 files, 681 tests passed            |
| `vp run test:coverage --maxWorkers=4`              | Passed; 58.90% lines, 47.41% branches |
| `vp run build`                                     | Passed                                |
| Targeted tests after the final unread-code cleanup | 4 files, 42 tests passed              |
| `git diff --check`                                 | Passed                                |

PR validation additionally exercised the Chromium E2E suite: 162 passed, one intentionally skipped, and 13 failures subsequently passed in a sequential focused run. Tests now use an isolated port and a non-production, loopback-only test mode. Coverage validation passed 682 tests, with four additional test-isolation regressions passing separately. Live Appwrite, Google OAuth, email delivery, and production infrastructure were not exercised. The build preceded the final removal of unread variables and the unused helper; subsequent TypeScript checks and targeted tests passed.

PR tooling follow-up: replaced stale commit-hook commands with Vite+, enabled CI for stacked PR bases, corrected the setup documentation, disabled duplicate TipTap link/underline extensions, and fixed ambiguous browser-test selectors and navigation assertions.

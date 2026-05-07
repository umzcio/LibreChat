# Merge Summary: Executive Report

**Date:** 2026-04-04
**Branch:** `feat/projects` <- `upstream/main` (11 commits)

---

## Summary Table

| # | Commit | Message | Group | Risk | Effort | Recoil? |
|---|--------|---------|-------|------|--------|---------|
| 1 | ed02fe40e | Allow Nested `addParams` in Config Schema (#12526) | C | high | 8m | no |
| 2 | fa4a43da2 | Strip `code_challenge` from Admin OAuth (#12534) | A | none | 0m | no |
| 3 | b4d97bd88 | Eliminate Unstable React Keys (#12536) | D | high | 8m | yes |
| 4 | ea28dbfa8 | Clean Up Config Fields (#12537) | C | high | 8m | no |
| 5 | 936936596 | Only show Searchbar if enabled (#12424) | D | med | 5m | yes |
| 6 | 261941c05 | Custom Role Permissions (#12528) | B+D | high | 15m | yes |
| 7 | 162ac9c25 | Properly Restore Draft Text (#12384) | D | med | 8m | yes |
| 8 | 2140729a5 | Prevent useLocalize Overwriting Language (#12515) | B | low | 2m | no* |
| 9 | b44ce264a | Bump mongodb-memory-server, mermaid (#12543) | B | low | 3m | no |
| 10 | 33ee7dea1 | Explicit Primary Key for Meilisearch (#12542) | A | none | 0m | no |
| 11 | 8ed0bcf5c | Reuse MCP OAuth Client Registrations (#11925) | B | low | 3m | no |

\* Commit 8 removes Jotai from `packages/client` -- a convergent change, not a conflict.

---

## Aggregate Risk Assessment

| Metric | Count |
|---|---|
| Clean auto-merges (Group A) | 2 |
| Review-then-merge (Group B) | 4 |
| Manual conflict resolution (Group C) | 2 |
| Semantic conflicts requiring Recoil->Jotai adaptation (Group D) | 4 |
| **Total files with git conflicts expected** | ~7 |
| **Total files needing Recoil->Jotai post-merge fix** | 8 |
| **Total estimated effort** | ~70 minutes |

### Highest-Risk Commit: #6 (261941c05) -- Custom Role Permissions

This commit spans 14 files across backend and frontend. It introduces:
- New Recoil-based logic in `AuthContext.tsx` (our most divergent file for state management)
- A new test file wrapping components in `RecoilRoot` (must be removed for Jotai)
- Changes to `roles.ts` that remove our `PROJECTS` permission entries
- Additions to `api-endpoints.ts`, `data-service.ts`, `keys.ts` that overlap with our project feature additions

It requires the most careful manual handling: Recoil-to-Jotai conversion of new code, preservation of our project additions, and verification that custom role logic works with Jotai atoms.

---

## Recommendation: YELLOW

**Merge selectively with careful handling.**

**Rationale:**
- 6 of 11 commits (2, 8, 9, 10, 11 + most of 1/4) are low-risk and bring valuable fixes (MCP OAuth reuse, Meilisearch primary key, dependency security updates, config schema improvements).
- 4 commits introduce Recoil patterns into files we have migrated to Jotai. These are well-understood mechanical translations, not architectural disagreements. The risk is in missing one.
- 2 commits create direct git conflicts on config/schema files where our branding and project additions must be preserved. These require attention but are straightforward.
- No commit is dangerous enough to skip -- all bring genuine value (security fixes, performance improvements, feature additions).

**The merge is absolutely worth doing, but cannot be done on autopilot.** Budget the full 70 minutes and follow the merge plan step-by-step.

---

## Upstream Drift Warning

### Is upstream still actively using Recoil?

**Yes.** All 11 commits maintain Recoil as the state management library. New code (Custom Roles, Draft Text fix, Searchbar guard) all use `useRecoilState`, `useRecoilValue`, `useSetRecoilState`. There is no indication upstream is planning a Jotai migration.

The one exception is `packages/client` (commit 8), where upstream actually *removed* Jotai usage -- but this was a simplification of `useLocalize`, not a directional choice.

### Are there patterns suggesting increasing divergence?

**Moderate.** The divergence is stable, not increasing:

- **State management (Recoil vs Jotai):** This is the permanent tax. Every upstream commit that touches a client file with state hooks will need mechanical translation. The pattern is predictable and the translations are 1:1. This batch has 4 such commits out of 11 (~36%).
- **Project/workspace feature:** Upstream does not have our project feature, so any commit touching shared packages (`data-provider`, `data-schemas`) may "remove" our additions. This is also stable -- git merge handles it correctly in most cases, and conflicts are resolved by keeping both sides.
- **Dead code removal:** We were slightly ahead of upstream in removing unused exports. Upstream is now using some of them again. This is a minor, one-time reconciliation.

### Should we contribute the Jotai migration upstream?

**This is the key strategic question.** Analysis:

| Factor | Assessment |
|---|---|
| Merge tax per sync | ~15-20 min of Recoil->Jotai mechanical translation |
| Sync frequency | ~weekly (based on 11 commits in ~3 days) |
| Annual cost of NOT contributing | ~15-20 hours/year of mechanical merge work |
| Upstream receptiveness | Unknown -- Danny Avila owns the project; would need to propose |
| Migration complexity | ~190 files; significant PR, but well-understood transformation |
| Risk of upstream rejection | Medium -- Jotai is a lighter library, but migration churn is substantial |

**Recommendation:** Open a discussion with upstream about the Jotai migration before investing in a PR. If upstream is interested, contribute it. If not, the merge tax is manageable (~20 min per sync) and the translations are mechanical enough to partially automate with a post-merge script that detects and replaces Recoil patterns.

A pragmatic middle ground: create a local `scripts/fix-recoil-imports.sh` that runs `sed` replacements for the common patterns after each merge, reducing the manual effort to verification-only.

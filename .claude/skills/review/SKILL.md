---
name: review
description: Review changed code for quality, correctness, and security issues in this Next.js project
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git *)
argument-hint: "[file or branch]"
---

Review the code changes below. If `$ARGUMENTS` is provided, treat it as a file path or branch name to diff against; otherwise review the current working-tree changes against HEAD.

## Diff to review

```!
if [ -n "$ARGUMENTS" ]; then
  git diff $ARGUMENTS
else
  git diff HEAD
fi
```

## Staged changes (if any)

```!
git diff --cached
```

## Changed files

```!
if [ -n "$ARGUMENTS" ]; then
  git diff --name-only $ARGUMENTS
else
  git diff --name-only HEAD && git diff --cached --name-only
fi
```

---

Perform a thorough code review. Structure your output as follows:

### Summary
One short paragraph on what the changes do.

### Issues

List every issue found using this severity scale:

- 🔴 **Critical** — security vulnerability, data loss risk, or broken functionality
- 🟡 **Warning** — bug-prone pattern, missing error handling, or bad practice
- 🔵 **Suggestion** — improvement worth considering but not urgent

For each issue include: the file + line reference, what the problem is, and a concrete fix.

If there are no issues at a given level, omit that level.

### Checklist

Go through each item relevant to the changed files:

**TypeScript**
- [ ] No `any` types introduced without justification
- [ ] Props interfaces are complete and accurate
- [ ] Return types are correct

**React / Next.js 16**
- [ ] `'use client'` is present on every component that uses state, effects, or browser APIs
- [ ] Server Components do not import client-only libraries (leaflet, etc.)
- [ ] `dynamic(() => import(...), { ssr: false })` is only used inside Client Components
- [ ] No hook rule violations (hooks not called conditionally or in loops)
- [ ] `useEffect` cleanup functions are present where needed
- [ ] Fetch calls in Server Components are not accidentally cached when they should be fresh

**API routes**
- [ ] User input from `searchParams` / request body is validated before use
- [ ] Errors from upstream APIs are handled and return meaningful status codes
- [ ] No secrets or internal URLs are leaked in client-facing responses

**Accessibility**
- [ ] Interactive elements have accessible labels (`aria-label`, `aria-expanded`, roles)
- [ ] Keyboard navigation works for any new interactive components

**Performance**
- [ ] No unnecessary re-renders (stable references, correct deps arrays)
- [ ] Large data fetches are paginated or bounded

Mark each item ✅ pass, ❌ fail (with a note), or — not applicable.

### Verdict
**Approve / Request changes / Needs discussion** — one line with the overall call.

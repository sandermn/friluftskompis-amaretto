---
name: local-code-review
description: Review changed code, prompt user to select fixes to apply, then update CLAUDE.md with any new permanent rules
disable-model-invocation: true
allowed-tools: Read Edit Write Grep Glob Bash(git *) AskUserQuestion
argument-hint: "[file or branch]"
---

Review the code changes below. If `$ARGUMENTS` is provided, treat it as a file path or branch name to diff against; otherwise review all working-tree and staged changes against HEAD.

## Diff to review

```!
if [ -n "$ARGUMENTS" ]; then
  git diff $ARGUMENTS
else
  git diff HEAD && git diff --cached
fi
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

## Step 1 — Produce the review

Analyze the diff and write a review using this structure:

### Summary
One short paragraph on what the changes do.

### Issues

Number every issue sequentially. Use this severity scale:

- 🔴 **Critical** — security vulnerability, data loss risk, or broken functionality
- 🟡 **Warning** — bug-prone pattern, missing error handling, or bad practice
- 🔵 **Suggestion** — improvement worth considering but not urgent

Format each issue as:
```
**N. [Severity icon] Title** (`file:line`)
Problem: …
Fix: …
```

### Checklist

Go through each item relevant to the changed files:

**TypeScript**
- [ ] No `any` types introduced without justification
- [ ] Props interfaces are complete and accurate

**React / Next.js 16**
- [ ] `'use client'` present on every component using state, effects, or browser APIs
- [ ] Server Components do not import client-only libraries (leaflet, etc.)
- [ ] `dynamic(() => import(...), { ssr: false })` only inside Client Components
- [ ] No hook rule violations
- [ ] `useEffect` cleanup functions present where needed
- [ ] Expensive values derived with `useMemo`, not recomputed in render

**API routes**
- [ ] User input from `searchParams` / request body is validated before use
- [ ] Upstream errors handled with meaningful status codes

**Accessibility**
- [ ] No nested interactive elements (`<button>` inside `<button>`, `<span role="button">` inside `<button>`)
- [ ] Every new interactive component has keyboard navigation (↑/↓/Enter/Escape)
- [ ] All inputs have a label or `aria-label`

Mark each item ✅ pass, ❌ fail (with the issue number), or — not applicable.

---

## Step 2 — Ask the user which fixes to apply

After writing the review, use `AskUserQuestion` with `multiSelect: true` to present every numbered issue as an option. Label each option with its number, severity icon, and title. Include an option "None — review only".

Wait for the user's answer before proceeding.

---

## Step 3 — Apply selected fixes

For each issue the user selected, make the fix directly in the source files using `Edit` or `Write`. Be surgical — only change what the issue describes. Do not refactor surrounding code.

If "None — review only" was selected (or no fixes were selected), skip this step.

---

## Step 4 — Update CLAUDE.md

After applying fixes (or if the user chose none), identify which issues represent **permanent rules** — patterns that should never recur in this codebase regardless of who wrote the code (e.g. "never nest interactive elements", "always use useMemo for derived render values").

Use `AskUserQuestion` to ask the user: "Should any of these findings become permanent rules in CLAUDE.md?" Present each candidate rule as an option with `multiSelect: true`. Include "None" as an option.

For each rule the user approves, append it to the `## Rules` section in `CLAUDE.md`. If the section does not exist yet, create it. Keep each rule to one concise bullet.

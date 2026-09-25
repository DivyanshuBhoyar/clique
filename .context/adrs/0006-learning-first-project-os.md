# ADR-0006: Learning-First Project OS

## Status
Accepted

## Context

Need:
- Hobby project used to learn Expo, multi-platform, Convex, E2EE, notifications, realtime, calls
- Agents that preserve continuity without stealing learning reps
- Clear homes for syllabus vs agent memory vs product direction
- Session discipline (modes, one slice, verify, reflect)

Alternatives considered:
- Ad-hoc chat-only process (no durable structure)
- Heavier project-management tools outside the repo
- Putting all process rules only in CLAUDE.md (easy to miss; not a shared contract)
- Expanding `.context/` into full documentation (token bloat, violates lean memory)

## Decision

Adopt a unified **Project OS**:
- Session contract: `tasks/OS.md`
- Index + arc table: `tasks/README.md`
- Capability ordering: `tasks/ladder.md`
- Active runway + session card: `tasks/todo.md`
- Lessons: `tasks/lessons.md` only
- Agent boot + non-negotiables: root `AGENTS.md` Project OS section + `CLAUDE.md`
- Continuity memory stays lean in `.context/`

Default agent mode: **Pair**, one thin slice. Developer discovery outranks feature throughput.

## Consequences

Positive:
- Shared language for Teach/Trace/Pair/Spike/Ship/Review/Maintain
- Predictable write rules (less duplication)
- Ladder prevents todo-as-infinite-backlog
- New agents can boot in minutes

Negative:
- Requires filling the session card (small ceremony)
- Must periodically compress progress/changelog
- Historical `tasks/plan.md` may drift; ladder is preferred for ordering

## Notes

Supersedes informal “just implement the gap list” behavior from dense `project.md` audits when in learning modes. Ship mode may still execute release checklists directly.

# ADR-0004: Convex Security Limits and Rate Limits

## Status
Accepted

## Context

Need:
- naive DDoS resistance
- bounded public API reads
- squad-level resource caps
- one place to tune production limits

Risks:
- every Convex public function is internet-facing
- friend squads should stay small by product design
- unbounded `.collect()` and uncapped pagination can amplify reads

## Decision

Use `convex/security.ts` as the central limits module.

Store rolling mutation counters in `rateLimits` keyed by action/user/resource.

Enforce hard caps in mutations before inserting squad-scoped resources.

Cap public query page sizes and high-cardinality enrichment reads.

## Consequences

Positive:
- limits are discoverable and tunable
- abuse checks are transactional with Convex mutations
- private data reads consistently re-check auth/membership

Negative:
- needs a future cleanup cron for old `rateLimits` rows
- quotas may need tuning after real usage
- hard caps can block legitimate large friend groups

## Notes

Default product assumption: small private squads, not public communities.
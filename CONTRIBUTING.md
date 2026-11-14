# Contributing

Use synthetic data and keep each change focused on API behavior. Run `npm ci` and `npm run verify` with Node.js 24 before proposing a change.

Keep requests, iteration data and the request/assertion plan in `scripts/report-plan.ts` in sync. Include assertions for resulting state when adding mutations. Do not commit reports, runtime tokens, exported private environments, or employer/customer material.

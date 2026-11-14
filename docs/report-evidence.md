# When a green summary is not enough

The audit found that a report claiming 26 requests and 48 assertions could pass the old predicate with an empty execution array and no passed assertions. The replacement checks the records behind the summary.

Run `npm run verify` with Node 24. The command checks types, exercises seven validator tests, starts a fresh synthetic API, runs the actual CLI and validates its JSON report. On 14 November 2026 the local run completed two iterations, 26 requests and 48 passed assertions.

The plan in `scripts/report-plan.ts` declares each request identity and expected assertion names for the editor and viewer iterations. Validation requires every planned request exactly once, an HTTP response, no execution errors and every planned assertion passed. It rejects missing, duplicate, unknown and wrong-iteration requests; missing, repeated, failed or skipped assertions; and contradictory summary totals. The plan is also checked against the collection's request identities and iteration order.

To investigate a failure, start with the validator's reason, inspect the corresponding iteration and request in the local JSON report, then compare the assertion with the collection. Keep the later state read: a successful mutation response alone does not prove persistence or authorization.

These checks establish internal consistency and completeness against the declared plan. They do not authenticate who produced a report or protect against a deliberately fabricated complete report. CI must still run the checked-in collection against the intended target. Reports contain synthetic session data and stay in ignored output or expiring CI artifacts; do not commit bearer values when adapting the project.

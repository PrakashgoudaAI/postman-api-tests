import { expectedExecutions } from "./report-plan.ts";
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Postman report structure.");
  return value as Record<string, unknown>;
}
function requireEqual(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(
      "Postman report does not match the declared execution plan.",
    );
}
/** Validate recorded evidence, not just the CLI exit code or claimed totals. */
export function validateReport(value: unknown): number {
  const run = record(record(value).run);
  const summary = record(run.summary);
  const assertionCount = expectedExecutions.reduce(
    (count, e) => count + e.tests.length,
    0,
  );
  for (const [name, count] of [
    ["iterations", 2],
    ["executedRequests", expectedExecutions.length],
    ["prerequestScripts", expectedExecutions.length],
    ["postresponseScripts", expectedExecutions.length],
  ] as const) {
    const group = record(summary[name]);
    requireEqual(group.executed, count);
    requireEqual(group.errors, 0);
  }
  const totals = record(summary.tests);
  requireEqual(totals.executed, assertionCount);
  requireEqual(totals.passed, assertionCount);
  requireEqual(totals.failed, 0);
  requireEqual(totals.skipped, 0);
  if (
    !Array.isArray(run.executions) ||
    run.executions.length !== expectedExecutions.length
  )
    throw new Error("Missing or extra Postman executions.");
  const seen = new Set<string>();
  let passed = 0;
  for (const raw of run.executions) {
    const execution = record(raw),
      request = record(execution.requestExecuted);
    const expected = expectedExecutions.find(
      (e) =>
        e.iteration === execution.iterationCount && e.name === request.name,
    );
    if (!expected)
      throw new Error("Unknown request or iteration in Postman evidence.");
    const identity = `${expected.iteration}:${expected.name}`;
    if (seen.has(identity)) throw new Error("Repeated Postman execution.");
    seen.add(identity);
    if (!Array.isArray(execution.errors) || execution.errors.length)
      throw new Error("Postman request or script error.");
    const code = record(execution.response).code;
    if (
      !Number.isInteger(code) ||
      typeof code !== "number" ||
      code < 100 ||
      code > 599
    )
      throw new Error("Missing valid HTTP response evidence.");
    if (
      !Array.isArray(execution.tests) ||
      execution.tests.length !== expected.tests.length
    )
      throw new Error("Missing or extra assertion evidence.");
    const names = new Set<string>();
    for (const rawTest of execution.tests) {
      const test = record(rawTest);
      if (
        typeof test.name !== "string" ||
        !expected.tests.includes(test.name) ||
        names.has(test.name) ||
        test.status !== "passed"
      )
        throw new Error(
          "Failed, skipped, repeated or unexpected assertion evidence.",
        );
      names.add(test.name);
      passed++;
    }
  }
  requireEqual(seen.size, expectedExecutions.length);
  requireEqual(passed, assertionCount);
  return passed;
}

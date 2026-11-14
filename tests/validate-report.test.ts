import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReport } from "../scripts/validate-report.ts";
import { expectedExecutions } from "../scripts/report-plan.ts";
function valid() {
  return {
    run: {
      summary: {
        iterations: { executed: 2, errors: 0 },
        executedRequests: { executed: 26, errors: 0 },
        prerequestScripts: { executed: 26, errors: 0 },
        postresponseScripts: { executed: 26, errors: 0 },
        tests: { executed: 48, passed: 48, failed: 0, skipped: 0 },
      },
      executions: expectedExecutions.map((e) => ({
        iterationCount: e.iteration,
        requestExecuted: { name: e.name },
        response: { code: 200 },
        tests: e.tests.map((name) => ({ name, status: "passed" })),
        errors: [] as unknown[],
      })),
    },
  };
}
await test("accepts complete declared evidence independently of execution ordering", () => {
  assert.equal(validateReport(valid()), 48);
  const r = valid();
  r.run.executions.reverse();
  assert.equal(validateReport(r), 48);
});
await test("rejects the audit reproducer with empty records and claimed successful totals", () => {
  const r = valid();
  r.run.executions = [];
  assert.throws(() => validateReport(r));
  r.run.summary.tests.passed = 0;
  assert.throws(() => validateReport(r));
});
await test("rejects malformed report and missing response/error structures", () => {
  for (const r of [null, [], {}, { run: {} }, { run: { summary: {} } }])
    assert.throws(() => validateReport(r));
  for (const field of ["response", "errors", "requestExecuted", "tests"]) {
    const r = valid() as unknown as {
      run: { executions: Record<string, unknown>[] };
    };
    delete r.run.executions[0]![field];
    assert.throws(() => validateReport(r));
  }
});
await test("rejects partial, duplicate, unknown and wrong-iteration requests", () => {
  const a = valid();
  a.run.executions.pop();
  assert.throws(() => validateReport(a));
  const b = valid();
  b.run.executions[1] = structuredClone(b.run.executions[0]!);
  assert.throws(() => validateReport(b));
  const c = valid();
  c.run.executions[0]!.requestExecuted.name = "Unplanned request";
  assert.throws(() => validateReport(c));
  const d = valid();
  d.run.executions[0]!.iterationCount = 9;
  assert.throws(() => validateReport(d));
});
await test("rejects missing, duplicated, failed and skipped assertions despite green totals", () => {
  for (const mutate of [
    (r: ReturnType<typeof valid>) => r.run.executions[2]!.tests.pop(),
    (r: ReturnType<typeof valid>) => {
      r.run.executions[2]!.tests[1] = structuredClone(
        r.run.executions[2]!.tests[0]!,
      );
    },
    (r: ReturnType<typeof valid>) => {
      r.run.executions[0]!.tests[0]!.status = "failed";
    },
    (r: ReturnType<typeof valid>) => {
      r.run.executions[0]!.tests[0]!.status = "skipped";
    },
  ]) {
    const r = valid();
    mutate(r);
    assert.throws(() => validateReport(r));
  }
});
await test("rejects contradictory totals and per-execution errors", () => {
  for (const field of ["executed", "passed", "failed", "skipped"] as const) {
    const r = valid();
    r.run.summary.tests[field]++;
    assert.throws(() => validateReport(r));
  }
  const r = valid();
  r.run.executions[0]!.errors.push({ message: "synthetic error" });
  assert.throws(() => validateReport(r));
  const s = valid();
  s.run.summary.postresponseScripts.errors = 1;
  assert.throws(() => validateReport(s));
});

await test("declared request identities match the checked-in collection and role order", async () => {
  const { readFile } = await import("node:fs/promises");
  const collection = JSON.parse(
    await readFile(
      new URL("../postman/tasks.collection.json", import.meta.url),
      "utf8",
    ),
  ) as { item: { name: string }[] };
  const roles = JSON.parse(
    await readFile(
      new URL("../postman/roles.data.json", import.meta.url),
      "utf8",
    ),
  ) as { role: string }[];
  assert.deepEqual(
    roles.map((r) => r.role),
    ["editor", "viewer"],
  );
  assert.deepEqual(
    expectedExecutions.filter((e) => e.iteration === 0).map((e) => e.name),
    collection.item.map((i) => i.name),
  );
  assert.deepEqual(
    expectedExecutions.filter((e) => e.iteration === 1).map((e) => e.name),
    collection.item.map((i) => i.name),
  );
});

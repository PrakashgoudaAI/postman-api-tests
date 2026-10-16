import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReport } from '../scripts/validate-report.ts';

function report() {
  return { run: {
    summary: { iterations: { executed: 2 }, executedRequests: { executed: 26 },
      tests: { executed: 48, passed: 48, failed: 0, skipped: 0 } },
    executions: Array.from({ length: 26 }, () => ({ errors: [] as unknown[] })),
  } };
}

test('accepts a complete successful collection report', () => {
  assert.equal(validateReport(report()), 48);
});

test('rejects missing or malformed report structures', () => {
  for (const value of [null, [], {}, { run: {} }, { run: { summary: {} } }]) {
    assert.throws(() => validateReport(value));
  }
});

test('rejects incomplete execution totals', () => {
  for (const key of ['iterations', 'executedRequests', 'tests'] as const) {
    const value = report();
    value.run.summary[key].executed -= 1;
    assert.throws(() => validateReport(value));
  }
});

test('rejects failed, skipped, or inconsistent passing assertions', () => {
  for (const key of ['failed', 'skipped', 'passed'] as const) {
    const value = report();
    value.run.summary.tests[key] += 1;
    assert.throws(() => validateReport(value));
  }
});

test('rejects request errors even when summary counts look successful', () => {
  const value = report();
  value.run.executions[0]!.errors.push({ message: 'Request timed out' });
  assert.throws(() => validateReport(value));
});

test('rejects missing executions and missing per-request error lists', () => {
  const value = report();
  value.run.executions.pop();
  assert.throws(() => validateReport(value));
  const malformed = report() as unknown as { run: { executions: unknown[] } };
  malformed.run.executions[0] = {};
  assert.throws(() => validateReport(malformed));
});

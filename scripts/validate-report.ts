function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Postman report structure.');
  }
  return value as Record<string, unknown>;
}

/** Fail closed: a successful CLI exit alone does not prove the collection completed. */
export function validateReport(value: unknown): number {
  const run = record(record(value).run);
  const summary = record(run.summary);
  const iterations = record(summary.iterations);
  const requests = record(summary.executedRequests);
  const tests = record(summary.tests);
  if (iterations.executed !== 2 || requests.executed !== 26 ||
      tests.executed !== 48 || tests.passed !== 48 ||
      tests.failed !== 0 || tests.skipped !== 0 ||
      !Array.isArray(run.executions) || run.executions.length !== 26 ||
      run.executions.some((execution: unknown) => {
        const errors = record(execution).errors;
        return !Array.isArray(errors) || errors.length !== 0;
      })) {
    throw new Error('Unexpected collection execution totals or failures.');
  }
  return 48;
}

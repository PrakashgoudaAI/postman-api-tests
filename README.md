# Postman API Tests

[![Verify API collection](https://github.com/PrakashgoudaAI/postman-api-tests/actions/workflows/verify.yml/badge.svg)](https://github.com/PrakashgoudaAI/postman-api-tests/actions/workflows/verify.yml)

A Postman collection with a current Postman CLI runner for testing API behavior, role permissions, and state changes. It includes a small TypeScript API so you can run everything locally without an account or external service.

## Runner status

The default runner is **Postman CLI 1.74.0**. The JSON collection uses **v2.1**, which also allows existing Newman workflows to reuse it. Postman now states that Newman is no longer maintained and cannot run collection v3. See [Postman's migration guidance](https://learning.postman.com/docs/reference/newman-cli/command-line-integration-with-newman/).

Both Postman CLI and Newman 6.2.3 were tested locally against this collection. Newman is not installed by default: its dependency audit reported unresolved issues, including a critical issue. The CI workflow verifies Postman CLI. Collection v3 migration is outside this version.

## Quick start

Use Node.js 24 and npm:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

The runner starts its own localhost API, waits for readiness, runs the collection, validates execution totals, writes reports, and stops the server. It refuses to reuse an occupied port. Use `DEMO_PORT=4300 npm test` if port 4183 is unavailable.

## What runs

The same 13 requests run with two data rows: an editor and a viewer. Each login receives an independent task list.

| Behavior | Editor | Viewer |
| :--- | :--- | :--- |
| Sign in and read tasks | Allowed | Allowed |
| Create a task | 201; response fields checked | 403; permission error checked |
| Complete a task | 200; a later read confirms persistence | 403; a later read confirms no change |
| Delete a task | 204; a later read returns 404 | 403; the original task remains |
| Use token after logout | 401 | 401 |

Both iterations also check unauthenticated reads, incorrect credentials, the initial dataset, and invalid input. Assertions check status codes, JSON fields, a task schema, and persisted state. There are no timing thresholds or retries that can hide a failure.

Run the complete collection in order: later requests intentionally use the task ID created earlier. Requests are sequential; this template does not claim parallel or load testing.

## Use in Postman

1. Start the API with `npm run demo`.
2. Import `postman/tasks.collection.json` and `postman/local.environment.json` into a Postman version that supports collection v2.1 import.
3. Select **Local task API** and open the collection runner.
4. Select `postman/roles.data.json` as the iteration data file and run all requests in order.

The environment contains only `baseUrl`. The collection obtains a fresh demo token during each iteration and clears runtime variables at the end. Demo credentials are intentionally public: role `editor` or `viewer`, password `demo-only-password`.

For an existing Newman environment, keep `npm run demo` running in another terminal. Review the legacy dependency risks before installing or running Newman:

```sh
npx newman@6.2.3 run postman/tasks.collection.json \
  -e postman/local.environment.json \
  -d postman/roles.data.json \
  --timeout-request 5000 \
  --timeout-script 5000
```

## Reports and CI

`npm test` writes `reports/junit.xml` and `reports/postman.json`, plus a CLI summary: 2 iterations, 26 requests, and 48 assertions. The GitHub workflow runs type checks and both role iterations, then uploads the reports for seven days, including when the collection fails. A failed assertion causes the job to fail. The runner uses local file paths and disables report events; it does not sign in or upload results to a Postman workspace.

The JSON report can contain authorization headers and response bodies. Reports are suitable for this synthetic app; review and redact them before adopting this pattern for sensitive systems. No environment or collection export containing runtime tokens is committed.

## Adapt the pattern

- Add requests and assertions in `postman/tasks.collection.json`.
- Add synthetic iteration rows in `postman/roles.data.json`.
- Update expected run totals in `scripts/run.ts` when adding requests or data rows.
- Keep a later read after a mutation: a successful status alone does not prove state changed correctly.
- Keep permission tests below the UI so hidden controls are not mistaken for authorization.

The collection guards against non-local targets. Adapting it to another API requires deliberately changing that guard, endpoints, data lifecycle, and credential handling. Do not point this demo at a real service unchanged.

## Limitations

The API is a local test target with public credentials, in-memory bearer sessions, and a 15-minute expiry. It has no production identity provider, database, TLS, or rate limiting. Do not deploy it as an authentication service. The collection tests role boundaries within individual sessions; cross-session access attacks, expiry timing, performance, OAuth, and production API security assessment are outside this version.

Newman is an optional legacy runner, excluded from the default dependency tree. Review `npm audit` and the lockfile before reuse; an npm audit does not assess vulnerabilities inside the vendor's packaged native CLI binary.

All source and data are independently created synthetic examples. See the [MIT license](LICENSE).

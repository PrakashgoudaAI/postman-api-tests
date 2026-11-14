// Expected collection evidence, reviewed alongside tasks.collection.json.
const common: [string, string[]][] = [
  ["01 Reject unauthenticated read", ["HTTP 401"]],
  ["02 Reject wrong password", ["HTTP 401", "Credential error"]],
  [
    "03 Create role session",
    ["HTTP 201", "Role matches iteration", "Issued token is a UUID"],
  ],
  [
    "04 Fresh session starts with seed only",
    ["HTTP 200", "Isolated seed data"],
  ],
  ["05 Reject invalid task data", ["Invalid input or permission is rejected"]],
  [
    "06 Create task or enforce viewer boundary",
    ["Create respects role", "Created task contract", "Task ID is present"],
  ],
  [
    "07 Read selected task",
    ["HTTP 200", "Task contract", "Title matches role workflow"],
  ],
  ["08 Update or reject viewer mutation", ["Update respects role"]],
  [
    "09 Verify persisted or unchanged state",
    ["HTTP 200", "Persisted state respects role"],
  ],
  ["10 Delete or reject viewer mutation", ["Delete respects role"]],
  ["11 Verify deletion or unchanged seed", ["Read confirms deletion boundary"]],
  ["12 Invalidate session", ["HTTP 204", "No response body"]],
  [
    "13 Reject the invalidated bearer token",
    ["HTTP 401", "Revoked token is denied"],
  ],
];
export const expectedExecutions = [0, 1].flatMap((iteration) =>
  common.map(([name, tests]) => ({
    iteration,
    name,
    tests:
      iteration === 1 && name.startsWith("06 ")
        ? ["Create respects role", "Permission error contract"]
        : iteration === 1 && name.startsWith("11 ")
          ? ["Read confirms deletion boundary", "Viewer task remains unchanged"]
          : tests,
  })),
);

import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { validateReport } from './validate-report.ts';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const port = process.env.DEMO_PORT ?? '4183';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Invalid DEMO_PORT.');
const baseURL = `http://127.0.0.1:${port}`;
// Never reuse a server on this port: the runner must own the test target.
let occupied = false;
try { await fetch(`${baseURL}/health`, { signal: AbortSignal.timeout(500) }); occupied = true; } catch {}
if (occupied) throw new Error(`Port ${port} is occupied; set DEMO_PORT to a free port.`);
await rm('reports', { recursive: true, force: true });
await mkdir('reports');
const server = spawn(process.execPath, ['demo/server.ts'], { stdio: 'inherit', env: { ...process.env, DEMO_PORT: port } });
let runner: ChildProcess | undefined;
let serverExited = false;
server.on('exit', () => { serverExited = true; });
const stop = () => { runner?.kill('SIGTERM'); server.kill('SIGTERM'); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (serverExited) throw new Error('Demo server exited before readiness.');
    try { const response = await fetch(`${baseURL}/health`, { signal: AbortSignal.timeout(500) }); ready = response.ok; } catch {}
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw new Error('Demo server did not become ready.');
  runner = spawn(process.execPath, ['node_modules/postman-cli/bin/postman.js', 'collection', 'run', 'postman/tasks.collection.json', '-e', 'postman/local.environment.json', '-d', 'postman/roles.data.json', '--env-var', `baseUrl=${baseURL}`, '--timeout-request', '5000', '--timeout-script', '5000', '--timeout', '60000', '--no-report-events', '-r', 'cli,junit,json', '--reporter-junit-export', 'reports/junit.xml', '--reporter-json-export', 'reports/postman.json'], { stdio: 'inherit' });
  const [code] = await once(runner, 'exit');
  if (code !== 0) throw new Error(`Postman CLI exited with code ${code}.`);
  const report = JSON.parse(await readFile('reports/postman.json', 'utf8'));
  const passed = validateReport(report);
  console.log(`Verified 2 role iterations, 26 requests, ${passed} passing assertions.`);
} finally {
  stop();
  if (!serverExited) await once(server, 'exit');
}

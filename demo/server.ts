import { createServer, type IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.DEMO_PORT ?? 4183);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid DEMO_PORT.');
type Task = { id: string; title: string; done: boolean };
type Session = { role: 'editor' | 'viewer'; tasks: Task[]; expires: number };
const sessions = new Map<string, Session>();
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const part of req) {
    raw += String(part);
    if (Buffer.byteLength(raw) > 8192) throw new Error('Body too large.');
  }
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object.');
  return value as Record<string, unknown>;
}
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  const send = (status: number, value?: unknown) => { res.writeHead(status); res.end(value === undefined ? undefined : JSON.stringify(value)); };
  try {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    if (req.method === 'GET' && path === '/health') { send(200, { status: 'ok' }); return; }
    if (req.method === 'POST' && path === '/api/session') {
      const data = await body(req);
      if (!['editor', 'viewer'].includes(String(data.role)) || data.password !== 'demo-only-password') { send(401, { error: 'Invalid credentials.' }); return; }
      const token = randomUUID();
      const role = data.role as Session['role'];
      sessions.set(token, { role, expires: Date.now() + 900_000, tasks: [{ id: 'seed', title: 'Review test plan', done: false }] });
      send(201, { token, role }); return;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const session = sessions.get(token);
    if (!session || session.expires < Date.now()) { sessions.delete(token); send(401, { error: 'Sign in required.' }); return; }
    if (req.method === 'DELETE' && path === '/api/session') { sessions.delete(token); send(204); return; }
    if (req.method === 'GET' && path === '/api/tasks') { send(200, { tasks: session.tasks }); return; }
    const match = /^\/api\/tasks\/([^/]+)$/.exec(path);
    const task = match ? session.tasks.find(t => t.id === match[1]) : undefined;
    if (req.method === 'GET' && match) { send(task ? 200 : 404, task ?? { error: 'Task not found.' }); return; }
    if (['POST', 'PATCH', 'DELETE'].includes(req.method ?? '') && (path === '/api/tasks' || match)) {
      if (session.role !== 'editor') { send(403, { error: 'Editor role required.' }); return; }
      if (req.method === 'POST' && path === '/api/tasks') {
        const data = await body(req);
        if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 80) { send(400, { error: 'Use a title of 1–80 characters.' }); return; }
        const created = { id: randomUUID(), title: data.title.trim(), done: false };
        session.tasks.push(created); send(201, created); return;
      }
      if (!task) { send(404, { error: 'Task not found.' }); return; }
      if (req.method === 'PATCH') {
        const data = await body(req);
        if (typeof data.done !== 'boolean') { send(400, { error: 'done must be boolean.' }); return; }
        task.done = data.done; send(200, task); return;
      }
      if (req.method === 'DELETE') { session.tasks = session.tasks.filter(t => t.id !== task.id); send(204); return; }
    }
    send(404, { error: 'Not found.' });
  } catch { send(400, { error: 'Invalid request.' }); }
});
const sweep = setInterval(() => { for (const [token, session] of sessions) if (session.expires < Date.now()) sessions.delete(token); }, 60_000).unref();
server.listen(port, '127.0.0.1', () => console.log(`Demo API at http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { clearInterval(sweep); server.close(() => process.exit(0)); });

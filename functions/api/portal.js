const encoder = new TextEncoder();
const validURL = value => typeof value === 'string' && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value);
const reply = (data, status = 200, cookie) => Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) }
});
const cookie = (value, age) => `portal_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
async function sign(secret, value) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
async function equal(secret, a, b) {
    const x = await sign(secret, String(a));
    const y = await sign(secret, String(b));
    let diff = 0;
    for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return diff === 0;
}
// Safe to run repeatedly, including on a completely empty D1 database.
async function initializeDatabase(DB) {
    await DB.batch([
        DB.prepare(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`),
        DB.prepare(`CREATE TABLE IF NOT EXISTS meeting_sessions (
            id TEXT PRIMARY KEY,
            time INTEGER NOT NULL
        )`),
        DB.prepare(`CREATE INDEX IF NOT EXISTS meeting_sessions_time
            ON meeting_sessions(time)`)
    ]);
}

export async function onRequest({ request, env }) {
    try {
        if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
        if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
        const { DB, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET, DEFAULT_MEET_URL } = env;
        if (!DB || !ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET || SESSION_SECRET.length < 32) {
            return reply({ error: 'Server configuration missing' }, 503);
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body.action !== 'string') return reply({ error: 'Invalid request' }, 400);
        await initializeDatabase(DB);
        const getURL = async () => (await DB.prepare("SELECT value FROM settings WHERE key='meeting'").first())?.value || DEFAULT_MEET_URL || '';
        const cleanup = () => DB.prepare('DELETE FROM meeting_sessions WHERE time < ?').bind(Date.now() - 7 * 86400000).run();
        if (body.action === 'register') {
            const url = await getURL();
            if (!validURL(url)) return reply({ error: 'Meeting not configured' }, 503);
            const id = 'HGB-' + crypto.randomUUID().replaceAll('-', '').toUpperCase();
            const time = Date.now();
            await cleanup();
            await DB.prepare('INSERT INTO meeting_sessions (id, time) VALUES (?, ?)').bind(id, time).run();
            return reply({ id, time, url });
        }
        if (body.action === 'login') {
            if (typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 256 || body.password.length > 1024) return reply({ error: 'Invalid credentials' }, 401);
            const userOK = await equal(SESSION_SECRET, body.username, ADMIN_USERNAME);
            const passOK = await equal(SESSION_SECRET, body.password, ADMIN_PASSWORD);
            if (!userOK || !passOK) return reply({ error: 'Invalid credentials' }, 401);
            const session = `${Date.now() + 3600000}.${crypto.randomUUID()}`;
            return reply({ ok: true }, 200, cookie(`${session}.${await sign(SESSION_SECRET, session)}`, 3600));
        }
        if (body.action === 'logout') return reply({ ok: true }, 200, cookie('', 0));
        const token = request.headers.get('cookie')?.match(/(?:^|;\s*)portal_session=([^;]+)/)?.[1] || '';
        const [expiry, nonce, sig] = token.split('.');
        if (!sig || !(Number(expiry) > Date.now()) || !await equal(SESSION_SECRET, sig, await sign(SESSION_SECRET, `${expiry}.${nonce}`))) return reply({ error: 'Sign in required' }, 401);
        if (body.action === 'update') {
            if (!validURL(body.url)) return reply({ error: 'Enter a standard Google Meet URL' }, 400);
            await DB.prepare("INSERT INTO settings (key, value) VALUES ('meeting', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(body.url).run();
            return reply({ ok: true });
        }
        if (body.action === 'clear') {
            await DB.prepare('DELETE FROM meeting_sessions').run();
            return reply({ ok: true });
        }
        if (body.action === 'dashboard') {
            await cleanup();
            const { count } = await DB.prepare('SELECT COUNT(*) AS count FROM meeting_sessions').first();
            const { results: logs } = await DB.prepare('SELECT id, time FROM meeting_sessions ORDER BY time DESC LIMIT 500').all();
            return reply({ count, logs, url: await getURL() });
        }
        return reply({ error: 'Unknown action' }, 400);
    } catch (error) {
        console.error('Portal operation failed:', error.message);
        return reply({ error: 'Service unavailable. Check D1 binding and schema.' }, 500);
    }
}

import { $, call } from './common.js';

function show(active) {
    $('login').hidden = active;
    $('dashboard').hidden = !active;
}
async function refresh() {
    const data = await call('dashboard');
    $('url').value = data.url || '';
    $('counts').textContent = `${data.count} registrations in the last seven days`;
    $('logs').replaceChildren(...data.logs.map(item => {
        const row = document.createElement('div');
        row.className = 'log';
        const title = document.createElement('strong');
        title.textContent = item.id;
        const time = document.createElement('div');
        time.textContent = new Date(item.time).toLocaleString();
        row.append(title, time);
        return row;
    }));
    show(true);
}
async function run(fn) {
    $('status').textContent = '';
    try { await fn(); } catch (error) { $('status').textContent = error.message; }
}
$('loginForm').onsubmit = event => {
    event.preventDefault();
    run(async () => {
        await call('login', { username: $('username').value, password: $('password').value });
        $('password').value = '';
        await refresh();
    });
};
$('settings').onsubmit = event => {
    event.preventDefault();
    run(async () => {
        await call('update', { url: $('url').value });
        $('status').textContent = 'Meeting link updated.';
    });
};
$('refresh').onclick = () => run(refresh);
$('clear').onclick = () => {
    if (confirm('Clear all session registrations?')) run(async () => { await call('clear'); await refresh(); });
};
$('logout').onclick = () => run(async () => {
    await call('logout');
    $('logs').replaceChildren();
    $('url').value = '';
    $('counts').textContent = '';
    show(false);
});
refresh().catch(() => show(false));

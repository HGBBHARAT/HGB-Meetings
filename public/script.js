import { $, call } from './common.js';

const ua = navigator.userAgent;
const browsers = [
    ['Opera', /OPR\/([\d.]+)/],
    ['Edge', /Edg(?:A|iOS)?\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/]
];
const match = browsers.find(([, pattern]) => pattern.test(ua));
$('browser').textContent = match ? `${match[0]} ${ua.match(match[1])[1]}` : 'Unknown';
$('os').textContent = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iOS / iPadOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Macintosh|Mac OS/i.test(ua) ? 'macOS'
    : /CrOS/i.test(ua) ? 'ChromeOS'
    : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
$('connection').textContent = location.protocol === 'https:' ? 'HTTPS' : 'HTTP';

$('join').addEventListener('click', async () => {
    $('join').disabled = true;
    $('status').textContent = 'Registering session…';
    try {
        const data = await call('register');
        const url = new URL(data.url);
        if (url.protocol !== 'https:' || url.hostname !== 'meet.google.com') {
            throw new Error('Invalid meeting URL');
        }
        $('visitor').textContent = data.id;
        $('visit').textContent = new Date(data.time).toLocaleString();
        $('open').href = url.href;
        $('open').hidden = false;
        $('join').hidden = true;
        $('status').textContent = 'Session registered. Your meeting is ready.';
    } catch (error) {
        $('status').textContent = error.message;
        $('join').disabled = false;
    }
});

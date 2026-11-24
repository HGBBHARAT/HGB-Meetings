export const $ = id => document.getElementById(id);

export async function call(action, extra = {}) {
    const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
        throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
}

const logo = document.querySelector('.brand img');
if (logo) {
    logo.addEventListener('load', () => { logo.hidden = false; });
    if (logo.complete && logo.naturalWidth) logo.hidden = false;
}

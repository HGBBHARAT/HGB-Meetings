# HGB Meetings — Cloudflare Pages

1. Create a D1 database and bind it as DB. Tables and indexes are initialized automatically on the first valid API request. No manual SQL is needed. Existing meeting settings are preserved if reusing a database.
2. Replace the repository files with the contents of this archive. Preserve public/logo.png if you already have one.
3. Pages settings: production branch main, no build command, output public, root empty. D1 binding DB in Production, pointing to the new database.
4. Keep ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET (32+ characters), DEFAULT_MEET_URL in Production variables. Redeploy.
5. Open the homepage, click Join Meeting, confirm a session ID and timestamp appear, then Open Google Meet. Open /admin.html, sign in and verify the registration.

The random ID is per registration, not per person or persistent browser. No IP, fingerprint or browser metadata is sent to the API. A registration is not proof of Meet attendance. Records expire on subsequent registration or dashboard activity after seven days. Admin displays the latest 500 records and total count. Use restricted Google Meet access for real participant verification. For public production use, add Cloudflare rate limiting and stronger admin access controls (e.g. Cloudflare Access where supported). The session cookie expires after one hour; logout clears the local cookie.

Copyright © 2026 HGB Pvt. Ltd. All rights reserved.

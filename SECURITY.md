# Security policy

## Supported versions

CV Builder is deployed continuously from the `main` branch. Only the latest version on `main` receives security
fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately through GitHub:
**Security → Report a vulnerability** on the [repository page](https://github.com/Duorly/CV_BUILDER/security).

Include what an attacker could do, the steps to reproduce, and the browser you used. You should get an answer within
a week. Once a fix is published, you will be credited in the advisory if you wish.

## Scope

CV Builder is a static web app without a server: CVs, cover letters, job applications and AI API keys are stored in
the user's browser (`localStorage`). Relevant reports include, for example:

- a way to run script in the app (XSS), for instance through an imported file or an AI answer;
- a way to read or exfiltrate a user's data or API key, or to send it anywhere other than the AI provider the user
  chose;
- a gap in the Content-Security-Policy or the other security headers (`vite.config.js`, `netlify.toml`,
  `vercel.json`).

Out of scope: someone with access to the user's unlocked computer or browser profile can read its `localStorage`.
Users can forget their API keys from the AI settings at any time.

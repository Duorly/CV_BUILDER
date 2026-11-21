# Deployment

CV Builder is a static site: `npm run build` writes it to `dist/`, and any static host can serve it. There is no
server, database or account; every user's data stays in their own browser.

The repository ships ready-made configurations for Netlify and Vercel. Both rebuild and publish the site on every
push to the main branch, and both serve the same security headers (see [Security headers](#security-headers)).

## Netlify

1. Fork or push the repository to GitHub.
2. On [app.netlify.com](https://app.netlify.com), choose **Add new project → Import an existing project**, then
   **GitHub** and the repository.
3. Settings are read from `netlify.toml` (`npm run build`, publish directory `dist`, Node 22, security headers):
   click **Deploy**.
4. A minute later the site is live at `xxx.netlify.app`. You can rename it under **Customize → Manage project name
   and cover image**; read [Changing the site address](#changing-the-site-address) first.

## Vercel

1. Fork or push the repository to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repository.
3. Vercel detects **Vite**: keep `npm run build` and the `dist` directory, then click **Deploy**. Security headers
   are read from `vercel.json`.

## Other hosts

Serve `dist/` as static files and add the headers listed in `SECURITY_HEADERS` (`vite.config.js`). The app has a
single page and no client-side routes, so no rewrite rule is needed. Long-term caching is safe for `/assets/*`:
file names change with every build.

## Changing the site address

Browsers store data per site address (origin). If the address changes (new Netlify name, custom domain…), users
see an empty app at the new address. Tell them to use **Fichier → Tout exporter** on the old address, then
**Fichier → Importer…** on the new one, before the old address goes away.

## Opening `dist/` locally

`dist/index.html` does not work when opened from the file system. Use `npm run build` followed by
`npm run preview`, which serves `dist/` as is (without rebuilding it: an old `dist/` shows an old version of the app).
Always deploy from Git (Netlify and Vercel rebuild the site), never by uploading an old `dist/` folder by hand.

## Security headers

The same headers are written in three places, and a unit test (`src/lib/__tests__/deployment.test.js`) checks that
they match:

- `SECURITY_HEADERS` in `vite.config.js`, used by `vite preview` (and therefore by the end-to-end tests);
- `netlify.toml`;
- `vercel.json`.

The Content-Security-Policy only allows the app's own files, plus the two optional AI APIs
(`api.anthropic.com`, `generativelanguage.googleapis.com`) in `connect-src`. Fonts and scripts are bundled with the
app: nothing is loaded from a CDN. If you add a feature that needs another origin, update all three files.

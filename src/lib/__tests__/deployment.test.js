import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../../../vite.config.js';

// Les en-têtes de sécurité sont écrits trois fois : Netlify, Vercel et `vite preview` (sous
// lequel tournent les tests de bout en bout). Ils doivent rester identiques.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (name) => fs.readFileSync(path.join(repo, name), 'utf8');

// Valeurs du bloc [[headers]] de netlify.toml qui s'applique à « /* ».
function netlifyHeaders() {
  const blocks = read('netlify.toml').split('[[headers]]').slice(1);
  const block = blocks.find((b) => /for\s*=\s*"\/\*"/.test(b));
  return Object.fromEntries(
    [...block.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/gm)].filter(([, key]) => key !== 'for').map(([, k, v]) => [k, v]),
  );
}

function vercelHeaders() {
  const config = JSON.parse(read('vercel.json'));
  const all = config.headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries(all.headers.map(({ key, value }) => [key, value]));
}

describe('déploiement : en-têtes de sécurité', () => {
  it('Netlify, Vercel et vite preview servent les mêmes en-têtes', () => {
    expect(netlifyHeaders()).toEqual(SECURITY_HEADERS);
    expect(vercelHeaders()).toEqual(SECURITY_HEADERS);
  });

  it('la CSP n’autorise que le site lui-même et les API d’IA', () => {
    const csp = Object.fromEntries(
      SECURITY_HEADERS['Content-Security-Policy'].split(';').map((part) => {
        const [name, ...values] = part.trim().split(/\s+/);
        return [name, values];
      }),
    );
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
    expect(csp['connect-src'].filter((v) => v.startsWith('https:'))).toEqual([
      'https://api.anthropic.com',
      'https://generativelanguage.googleapis.com',
    ]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
  });
});

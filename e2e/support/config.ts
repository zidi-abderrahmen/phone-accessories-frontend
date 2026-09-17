import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEV_CONFIG_PATH = resolve(
  __dirname,
  '../../../backend/src/main/resources/application-dev.yaml',
);

function readSuperAdminCredentials(): { email?: string; password?: string } {
  let raw: string;
  try {
    raw = readFileSync(DEV_CONFIG_PATH, 'utf8');
  } catch {
    return {};
  }

  const credentials: { email?: string; password?: string } = {};
  let insideSuperAdmin = false;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const indent = line.length - line.trimStart().length;
    const [key, ...rest] = line.trim().split(':');
    const value = rest.join(':').trim().replace(/^["']|["']$/g, '');

    if (indent === 2 && key === 'super_admin') {
      insideSuperAdmin = true;
      continue;
    }
    if (insideSuperAdmin && indent <= 2) {
      break;
    }
    if (insideSuperAdmin && indent === 4) {
      if (key === 'email') credentials.email = value;
      if (key === 'password') credentials.password = value;
    }
  }

  return credentials;
}

const devCredentials = readSuperAdminCredentials();

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4200';
export const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? devCredentials.email ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? devCredentials.password ?? '';

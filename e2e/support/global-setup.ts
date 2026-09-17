import { request } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_BASE_URL, BASE_URL } from './config';

export default async function globalSetup(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'E2E admin credentials are missing. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD, ' +
        'or make sure backend/src/main/resources/application-dev.yaml defines ' +
        'application.super_admin.email and application.super_admin.password.',
    );
  }

  const api = await request.newContext();
  try {
    const health = await api.get(`${API_BASE_URL}/actuator/health`).catch(() => null);
    if (!health || !health.ok()) {
      throw new Error(
        `Backend API is not reachable at ${API_BASE_URL}. ` +
          'Start it before running the E2E suite (e.g. run BackendApplication from your IDE).',
      );
    }

    const frontend = await api.get(BASE_URL).catch(() => null);
    if (!frontend || !frontend.ok()) {
      throw new Error(`Frontend is not reachable at ${BASE_URL}.`);
    }
  } finally {
    await api.dispose();
  }
}

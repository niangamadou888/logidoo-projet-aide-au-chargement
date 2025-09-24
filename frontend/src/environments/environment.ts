export const environment = {
  production: (globalThis as any)?.['NG_PRODUCTION'] === 'true' || false,
  apiUrl: (globalThis as any)?.['API_URL'] || 'http://localhost:3000',
  logLevel: (globalThis as any)?.['NG_LOG_LEVEL'] || 'debug',
  version: (globalThis as any)?.['NG_VERSION'] || '1.0.0',
};

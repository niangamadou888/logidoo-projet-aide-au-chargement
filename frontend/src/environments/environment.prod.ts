export const environment = {
  production: true,
  apiUrl: (globalThis as any)?.['API_URL'] || 'https://logidoo.onrender.com',
  logLevel: (globalThis as any)?.['NG_LOG_LEVEL'] || 'error',
  version: (globalThis as any)?.['NG_VERSION'] || '1.0.0',
};

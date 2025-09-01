import { RenderMode, ServerRoute } from '@angular/ssr';

// Server-side routing configuration for Angular SSR/prerender.
// Dynamic routes with parameters must not use Prerender unless
// `getPrerenderParams` is provided. We serve them via Server mode instead.
export const serverRoutes: ServerRoute[] = [
  // Do not prerender dynamic route with params
  {
    path: 'visualization/:simulationId',
    renderMode: RenderMode.Server,
  },

  // Keep the rest of the routes prerendered by default
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

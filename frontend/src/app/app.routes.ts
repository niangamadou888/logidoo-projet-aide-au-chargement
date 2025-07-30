import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './auth/auth.routes';
import { DASHBOARD_ROUTES } from './features/dashboard.routes';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: AUTH_ROUTES
  },
  {
    path: 'dashboard',
    children: DASHBOARD_ROUTES,
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];

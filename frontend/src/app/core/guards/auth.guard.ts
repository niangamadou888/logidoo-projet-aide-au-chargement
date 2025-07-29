import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Always allow during server-side rendering to avoid hydration issues
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Navigate to login page
  router.navigate(['/auth/login'], { 
    queryParams: { returnUrl: state.url }
  });
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Always allow during server-side rendering to avoid hydration issues
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  // If user is authenticated but not admin, redirect to user dashboard
  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard/user']);
    return false;
  }

  // Otherwise redirect to login
  router.navigate(['/auth/login'], { 
    queryParams: { returnUrl: state.url }
  });
  return false;
}; 
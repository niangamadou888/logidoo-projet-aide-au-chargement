import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const userRoleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Always allow during server-side rendering to avoid hydration issues
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Check if the route requires specific role
  const requiredRole = route.data['requiredRole'];

  if (requiredRole === 'admin' && !authService.isAdmin()) {
    // User is not an admin but tries to access admin route
    router.navigate(['/unauthorized']);
    return false;
  } 
  
  if (requiredRole === 'user' && authService.isAdmin()) {
    // Admin is trying to access user route
    router.navigate(['/unauthorized']);
    return false;
  }

  // Allow access if role matches or no specific role required
  return true;
};
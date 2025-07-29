import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token addition if we're on the server
    if (!isPlatformBrowser(this.platformId)) {
      return next.handle(req);
    }

    // Get the auth token from the service
    const authToken = this.authService.getToken();

    // Clone the request and replace the original headers with
    // cloned headers, updated with the authorization.
    if (authToken) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
      
      // Send the newly created request
      return next.handle(authReq);
    }
    
    // If no token, just pass the original request
    return next.handle(req);
  }
} 
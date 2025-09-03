import { ApplicationConfig,APP_INITIALIZER ,importProvidersFrom, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { GlobalErrorHandlerService } from './core/services/error-handler.service';
// Removed ngx-logger integration to avoid missing dependency issues
import {MatStepperModule} from '@angular/material/stepper';

function initializeAuth(authService: AuthService) {
  return () => {
    return new Promise((resolve) => {
      resolve(true);
    });
  };
}




export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // Combine HTTP features in a single provider
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideAnimations(),
    importProvidersFrom(
      ReactiveFormsModule,
      MatInputModule,
      MatFormFieldModule,
      MatButtonModule,
      MatCheckboxModule,
      MatCardModule,
      FormsModule,
      CommonModule,
      HttpClientModule,
      MatStepperModule
      
    ),
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: AuthInterceptor, 
      multi: true 
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: ErrorInterceptor, 
      multi: true 
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },
    DatePipe
  ]
};

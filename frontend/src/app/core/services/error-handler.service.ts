import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse): void {
    const loggerService = this.injector.get(LoggerService);
    const location = this.injector.get(Location);

    let errorMessage: string;
    let stackTrace: string;

    if (error instanceof HttpErrorResponse) {
      // Erreur HTTP
      errorMessage = this.getServerErrorMessage(error);
      stackTrace = error.message;

      // Log l'erreur
      loggerService.error(`[HTTP Error] ${errorMessage}`, {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error
      });

      // Rediriger en cas d'erreur d'autorisation
      if (error.status === 401 || error.status === 403) {
        location.go('/auth/login');
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } else {
      // Erreur JS
      errorMessage = this.getClientErrorMessage(error);
      stackTrace = error.stack || '';
      
      // Log l'erreur
      loggerService.error(`[App Error] ${errorMessage}`, {
        name: error.name,
        stack: stackTrace,
        message: error.message
      });
    }

    // On pourrait montrer une notification à l'utilisateur ici
    console.error(error);
  }

  private getClientErrorMessage(error: Error): string {
    return `Client Error: ${error.message}`;
  }

  private getServerErrorMessage(error: HttpErrorResponse): string {
    return error.error?.message || `Server Error: ${error.status} ${error.statusText}`;
  }
}

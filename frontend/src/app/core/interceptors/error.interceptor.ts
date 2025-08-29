import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private loggerService: LoggerService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas intercepter les requêtes vers l'API de logs pour éviter une boucle infinie
    if (request.url.includes('/api/logs')) {
      return next.handle(request);
    }
    
    // Mesurer le temps de la requête
    const startTime = Date.now();
    const reqInfo = {
      url: request.url,
      method: request.method,
      headers: request.headers.keys().join(', '),
      body: request.body
    };

    // Log la requête sortante
    this.loggerService.debug(`Requête HTTP: ${request.method} ${request.url}`, reqInfo);
    console.log(`[DEBUG] Requête HTTP: ${request.method} ${request.url}`, reqInfo);

    return next.handle(request).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Log les réponses réussies
          console.log(`[DEBUG] Réponse HTTP ${event.status}: ${request.method} ${request.url} (${duration}ms)`);
          
          // Log performance des requêtes lentes même si elles sont réussies
          if (duration > 1000) {
            this.loggerService.logPerformance('HTTP', `${request.method} ${request.url}`, duration);
            console.log(`[PERF] Requête lente: ${request.method} ${request.url} (${duration}ms)`);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Information de l'erreur pour le log
        const errorInfo = {
          url: request.url,
          method: request.method,
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          duration: `${duration}ms`
        };

        // Log l'erreur avec le service de log
        this.loggerService.error(`Erreur HTTP ${error.status}: ${request.method} ${request.url}`, errorInfo);
        console.error(`[ERROR] HTTP ${error.status}: ${request.method} ${request.url}`, errorInfo);

        // Si la requête a pris trop de temps, logger comme problème de performance
        if (duration > 1000) {
          this.loggerService.logPerformance('HTTP', `${request.method} ${request.url}`, duration);
        }

        // Renvoyer l'erreur pour que l'application puisse la gérer
        return throwError(() => error);
      })
    );
  }
}

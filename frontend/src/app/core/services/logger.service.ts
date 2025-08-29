import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  // Minimal log level: in prod only errors; in dev debug
  private minLevel: 'debug' | 'info' | 'warn' | 'error' = environment.production ? 'error' : 'debug';
  private endpoint = environment.apiUrl + '/api/logs';

  constructor(private http: HttpClient) {}

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const order = ['debug', 'info', 'warn', 'error'];
    return order.indexOf(level) >= order.indexOf(this.minLevel);
  }

  private post(level: string, message: string, additional: any[]): void {
    // Best-effort server logging; ignore failures
    try {
      this.http.post(this.endpoint, {
        level,
        message,
        additional,
        timestamp: new Date().toISOString()
      }).subscribe({ next: () => {}, error: () => {} });
    } catch {
      // no-op
    }
  }

  debug(message: string, ...additional: any[]): void {
    if (!this.shouldLog('debug')) return;
    console.debug(message, ...additional);
    if (!environment.production) this.post('DEBUG', message, additional);
  }

  info(message: string, ...additional: any[]): void {
    if (!this.shouldLog('info')) return;
    console.info(message, ...additional);
    if (!environment.production) this.post('INFO', message, additional);
  }

  warn(message: string, ...additional: any[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(message, ...additional);
    this.post('WARN', message, additional);
  }

  error(message: string, ...additional: any[]): void {
    if (!this.shouldLog('error')) return;
    console.error(message, ...additional);
    this.post('ERROR', message, additional);
  }

  // Performance helper
  logPerformance(component: string, action: string, duration: number): void {
    const threshold = 500;
    const payload = { component, action, duration, timestamp: new Date().toISOString() };
    if (duration > threshold) {
      this.warn(`Performance: ${component} - ${action} a pris ${duration}ms`, payload);
    } else {
      this.debug(`Performance: ${component} - ${action} a pris ${duration}ms`, payload);
    }
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NGXLogger, NgxLoggerLevel } from 'ngx-logger';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  constructor(
    private http: HttpClient,
    private logger: NGXLogger
  ) {
    this.configureLogger();
  }

  private configureLogger(): void {
    // Configurer le niveau de log en fonction de l'environnement
    const logLevel = environment.production 
      ? NgxLoggerLevel.ERROR 
      : NgxLoggerLevel.DEBUG;
      
    console.log('Configuring logger with URL:', environment.apiUrl + '/api/logs');
      
    this.logger.updateConfig({
      level: logLevel,
      serverLogLevel: NgxLoggerLevel.INFO, // Envoyer tous les logs de niveau INFO et plus élevé au serveur
      // URL de l'API pour envoyer les logs au backend
      serverLoggingUrl: environment.apiUrl + '/api/logs',
      disableConsoleLogging: false, // Toujours afficher les logs dans la console pour le débogage
      httpResponseType: 'json',
      // Inclure les détails supplémentaires
      timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      enableSourceMaps: true
    });
  }

  /**
   * Log un message de debug
   */
  debug(message: string, ...additional: any[]): void {
    this.logger.debug(message, ...additional);
  }

  /**
   * Log un message d'information
   */
  info(message: string, ...additional: any[]): void {
    this.logger.info(message, ...additional);
  }

  /**
   * Log un message d'avertissement
   */
  warn(message: string, ...additional: any[]): void {
    this.logger.warn(message, ...additional);
  }

  /**
   * Log un message d'erreur
   */
  error(message: string, ...additional: any[]): void {
    this.logger.error(message, ...additional);
  }

  /**
   * Log une erreur avec des données de performance
   * @param component Nom du composant
   * @param action Action effectuée
   * @param duration Durée en ms
   */
  logPerformance(component: string, action: string, duration: number): void {
    const threshold = 500; // seuil à partir duquel on considère que c'est lent (500ms)
    
    if (duration > threshold) {
      this.warn(`Performance: ${component} - ${action} a pris ${duration}ms`, {
        component,
        action,
        duration,
        timestamp: new Date().toISOString()
      });
    } else {
      this.debug(`Performance: ${component} - ${action} a pris ${duration}ms`, {
        component,
        action,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }
}

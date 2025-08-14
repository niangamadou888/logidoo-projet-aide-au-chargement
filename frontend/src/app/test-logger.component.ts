import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoggerService } from './core/services/logger.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-test-logger',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div style="padding: 20px; text-align: center;">
      <h2>Test du Logger</h2>
      <div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 0 auto;">
        <button mat-raised-button color="primary" (click)="testDebugLog()">Log Debug</button>
        <button mat-raised-button color="accent" (click)="testInfoLog()">Log Info</button>
        <button mat-raised-button color="warn" (click)="testWarnLog()">Log Warning</button>
        <button mat-raised-button color="warn" (click)="testErrorLog()">Log Error</button>
        <button mat-raised-button (click)="testPerformanceLog()">Test Performance Log</button>
      </div>
    </div>
  `
})
export class TestLoggerComponent implements OnInit {
  constructor(private loggerService: LoggerService) {}

  ngOnInit(): void {
    this.loggerService.info('Test Logger Component initialized');
  }

  testDebugLog(): void {
    this.loggerService.debug('Test debug log', { source: 'TestLoggerComponent', timestamp: new Date() });
    console.log('Debug log sent');
  }

  testInfoLog(): void {
    this.loggerService.info('Test info log', { source: 'TestLoggerComponent', timestamp: new Date() });
    console.log('Info log sent');
  }

  testWarnLog(): void {
    this.loggerService.warn('Test warning log', { source: 'TestLoggerComponent', timestamp: new Date() });
    console.log('Warning log sent');
  }

  testErrorLog(): void {
    this.loggerService.error('Test error log', { source: 'TestLoggerComponent', timestamp: new Date() });
    console.log('Error log sent');
  }

  testPerformanceLog(): void {
    const start = performance.now();
    // Simuler une opération qui prend du temps
    setTimeout(() => {
      const end = performance.now();
      const duration = end - start;
      this.loggerService.logPerformance('TestLoggerComponent', 'testPerformanceLog', duration);
      console.log(`Performance log sent (${duration}ms)`);
    }, 600); // 600ms pour dépasser le seuil de 500ms
  }
}

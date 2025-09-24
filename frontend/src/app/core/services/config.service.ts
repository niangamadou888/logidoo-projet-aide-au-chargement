import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  // Base API URL for all services
  get apiUrl(): string {
    return environment.apiUrl;
  }

  // Get full API endpoint URL
  getApiUrl(endpoint: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Ensure base URL doesn't end with slash, then add endpoint
    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;

    return `${baseUrl}/api/${cleanEndpoint}`;
  }

  // Get auth API URL
  getAuthUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;

    return `${baseUrl}/api/auth/${cleanEndpoint}`;
  }

  // Get other configuration values
  get isProduction(): boolean {
    return environment.production;
  }

  get logLevel(): string {
    return environment.logLevel;
  }

  get version(): string {
    return environment.version;
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TopUser {
  name: string;
  simulations: number;
}

export interface ContainerUsage {
  type: string;
  count: number;
  percentage: number;
}

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  totalSimulations: number;
  simulationsByPeriod: {
    day: number;
    week: number;
    month: number;
  };
  topUsers: TopUser[];
  avgFillRate: {
    volume: number;
    weight: number;
  };
  mostUsedContainers: ContainerUsage[];
}

export interface AdminStatisticsResponse {
  success: boolean;
  statistics: AdminStatistics;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStatistics(): Observable<AdminStatisticsResponse> {
    return this.http.get<AdminStatisticsResponse>(`${this.apiUrl}/api/admin/statistics`);
  }
}
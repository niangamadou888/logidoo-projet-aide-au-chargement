import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { AdminService, AdminStatistics } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;
  isLoading: boolean = true;

  // Admin dashboard statistics - initialized with defaults
  dashboardStats: AdminStatistics = {
    totalUsers: 0,
    activeUsers: 0,
    totalSimulations: 0,
    topUsers: [],
    avgFillRate: {
      volume: 0,
      weight: 0
    },
    simulationsByPeriod: {
      day: 0,
      week: 0,
      month: 0
    },
    mostUsedContainers: []
  };

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;

      // Redirect if not admin
      if (user && user.role !== 'admin') {
        this.router.navigate(['/dashboard/user']);
      } else if (user && user.role === 'admin') {
        // Load statistics when user is confirmed as admin
        this.loadStatistics();
      }
    });
  }

  loadStatistics(): void {
    this.isLoading = true;
    this.adminService.getStatistics().subscribe({
      next: (response) => {
        if (response.success && response.statistics) {
          this.dashboardStats = response.statistics;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading admin statistics:', error);
        this.isLoading = false;
      }
    });
  }
  
  logout(): void {
    this.authService.logout();
  }
}

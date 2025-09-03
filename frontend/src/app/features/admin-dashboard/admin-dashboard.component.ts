import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatMenuModule,
    RouterModule,
],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;
  
  // Admin dashboard statistics
  dashboardStats = {
    totalUsers: 126,
    totalSimulations: 854,
    topUsers: [
      { name: 'John Doe', simulations: 78 },
      { name: 'Sarah Smith', simulations: 65 },
      { name: 'Robert Johnson', simulations: 52 }
    ],
    avgFillRate: {
      volume: 86,
      weight: 79
    },
    simulationsByPeriod: {
      day: 24,
      week: 135,
      month: 425
    },
    mostUsedContainers: [
      { type: "Container 20'", count: 312, percentage: 37 },
      { type: "Container 40'", count: 267, percentage: 31 },
      { type: 'Truck', count: 198, percentage: 23 },
      { type: 'Other', count: 77, percentage: 9 }
    ],
    countriesData: [
      { country: 'Sénégal', users: 58, simulations: 410 },
      { country: 'Maroc', users: 42, simulations: 328 },
      { country: 'Other', users: 26, simulations: 116 }
    ]
  };
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Redirect if not admin
      if (user && user.role !== 'admin') {
        this.router.navigate(['/dashboard/user']);
      }
    });
  }
  
  logout(): void {
    this.authService.logout();
  }
}

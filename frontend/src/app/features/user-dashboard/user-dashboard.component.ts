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
  selector: 'app-user-dashboard',
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
    RouterModule
  ],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss'
})
export class UserDashboardComponent implements OnInit {
  currentUser: User | null = null;
  
  // User dashboard statistics
  userStats = {
    totalSimulations: 28,
    avgFillRate: {
      volume: 83,
      weight: 76
    },
    preferredContainer: "Container 20'",
    recentSimulations: [
      { id: 'SIM-12345', date: '2023-07-15', containerType: "Container 20'", fillRate: 92, packageCount: 145 },
      { id: 'SIM-12328', date: '2023-07-10', containerType: "Container 40'", fillRate: 86, packageCount: 230 },
      { id: 'SIM-12315', date: '2023-07-05', containerType: "Truck", fillRate: 79, packageCount: 78 }
    ]
  };
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
  
  logout(): void {
    this.authService.logout();
  }
}

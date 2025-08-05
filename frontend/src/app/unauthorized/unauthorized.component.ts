import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.scss'
})
export class UnauthorizedComponent {
  constructor(public authService: AuthService) {}
  
  get dashboardPath(): string {
    return this.authService.isAdmin() ? '/dashboard/admin' : '/dashboard/user';
  }
  
  get roleText(): string {
    return this.authService.isAdmin() ? 'admin' : 'user';
  }
}

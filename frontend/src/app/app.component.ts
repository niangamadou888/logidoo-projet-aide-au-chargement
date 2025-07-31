import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Logidoo';
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if the user is already authenticated
    if (this.authService.isAuthenticated()) {
      // If the URL is /, redirect to the appropriate dashboard based on role
      if (this.router.url === '/' || this.router.url === '') {
        setTimeout(() => {
          const dashboardUrl = this.authService.isAdmin() ? '/dashboard/admin' : '/dashboard/user';
          this.router.navigate([dashboardUrl]);
        }, 0);
      }
    }
  }
}

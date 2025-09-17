import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.component.html',
     styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent {
  constructor(public authService: AuthService) {}
}

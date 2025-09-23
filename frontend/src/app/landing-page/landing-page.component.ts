import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent implements OnInit, OnDestroy {
  currentTestimonial = 0;
  testimonialDots = [0, 1, 2];
  isMobileMenuOpen = false;
  private intervalId: any;
  private isBrowser: boolean;

  constructor(
    public authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startAutoSlide();
      this.setupSwipeGestures();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoSlide();
      this.removeSwipeGestures();
    }
  }

  private touchStartX = 0;
  private touchEndX = 0;

  setupSwipeGestures() {
    if (this.isBrowser) {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }
  }

  removeSwipeGestures() {
    if (this.isBrowser) {
      document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
      document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }
  }

  handleTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  handleTouchEnd(e: TouchEvent) {
    this.touchEndX = e.changedTouches[0].screenX;
    this.handleSwipe();
  }

  handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = this.touchEndX - this.touchStartX;

    if (this.isMobileMenuOpen && swipeDistance > swipeThreshold) {
      this.closeMobileMenu();
    }
  }

  startAutoSlide() {
    if (this.isBrowser && !this.intervalId) {
      this.intervalId = setInterval(() => {
        this.nextTestimonial();
      }, 5000);
    }
  }

  stopAutoSlide() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  nextTestimonial() {
    if (this.currentTestimonial < this.testimonialDots.length - 1) {
      this.currentTestimonial++;
    } else {
      this.currentTestimonial = 0;
    }
  }

  previousTestimonial() {
    if (this.currentTestimonial > 0) {
      this.currentTestimonial--;
    } else {
      this.currentTestimonial = this.testimonialDots.length - 1;
    }
  }

  goToTestimonial(index: number) {
    this.currentTestimonial = index;
    if (this.isBrowser) {
      this.stopAutoSlide();
      this.startAutoSlide();
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isBrowser) {
      if (this.isMobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  scrollToSection(sectionId: string) {
    if (this.isBrowser) {
      const element = document.getElementById(sectionId);
      if (element) {
        const offsetTop = element.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    }
  }
}

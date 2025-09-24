import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Testimonial {
  id: number;
  name: string;
  content: string;
  avatar: string;
  position?: string;
  company?: string;
}

@Component({
  selector: 'app-testimonial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial.component.html',
  styleUrl: './testimonial.component.scss'
})
export class TestimonialComponent {
  @Input() testimonial!: Testimonial;
  @Input() showNavigation: boolean = false;
  @Input() isActive: boolean = false;
  @Output() dotClick = new EventEmitter<number>();

  onDotClick(index: number): void {
    this.dotClick.emit(index);
  }
}
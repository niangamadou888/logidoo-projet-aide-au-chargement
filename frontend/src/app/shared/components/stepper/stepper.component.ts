import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StepperStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  active: boolean;
  disabled?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.scss']
})
export class StepperComponent {
  @Input() steps: StepperStep[] = [];
  @Input() currentStepIndex: number = 0;
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Output() stepChange = new EventEmitter<number>();

  ngOnInit() {
    this.updateStepsState();
  }

  ngOnChanges() {
    this.updateStepsState();
  }

  onStepClick(index: number) {
    if (!this.steps[index]?.disabled) {
      this.currentStepIndex = index;
      this.updateStepsState();
      this.stepChange.emit(index);
    }
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.updateStepsState();
      this.stepChange.emit(this.currentStepIndex);
    }
  }

  previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updateStepsState();
      this.stepChange.emit(this.currentStepIndex);
    }
  }

  markCurrentStepComplete() {
    if (this.steps[this.currentStepIndex]) {
      this.steps[this.currentStepIndex].completed = true;
    }
  }

  private updateStepsState() {
    this.steps.forEach((step, index) => {
      step.active = index === this.currentStepIndex;
      
      // Auto-complete previous steps if not disabled
      if (index < this.currentStepIndex && !step.disabled) {
        step.completed = true;
      }
    });
  }

  canProceedToNext(): boolean {
    return this.currentStepIndex < this.steps.length - 1;
  }

  canGoToPrevious(): boolean {
    return this.currentStepIndex > 0;
  }

  getCurrentStep(): StepperStep | null {
    return this.steps[this.currentStepIndex] || null;
  }
}
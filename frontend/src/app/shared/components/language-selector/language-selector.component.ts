import { Component, LOCALE_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatOptionModule],
  template: `
    <mat-select
      [value]="currentLang"
      (selectionChange)="onLanguageChange($event.value)"
      class="language-selector"
      aria-label="Sélectionner la langue"
    >
      <mat-option value="fr">🇫🇷 Français</mat-option>
      <mat-option value="en">🇬🇧 English</mat-option>
      <mat-option value="es">🇪🇸 Español</mat-option>
    </mat-select>
  `,
  styles: [`
    .language-selector {
      min-width: 140px;
    }
  `]
})
export class LanguageSelectorComponent {
  currentLang: string;

  constructor(
    private languageService: LanguageService,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.currentLang = this.locale;
  }

  onLanguageChange(lang: string): void {
    this.languageService.changeLanguage(lang);
  }
}
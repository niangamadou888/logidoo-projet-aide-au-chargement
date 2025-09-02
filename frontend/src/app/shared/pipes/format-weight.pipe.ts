// src/app/shared/pipes/format-weight.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatWeight',
  standalone: true
})
export class FormatWeightPipe implements PipeTransform {

  transform(value: number | null | undefined, unit: 'kg' | 'g' | 't' = 'kg'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0 ' + unit;
    }

    let displayValue = value;
    let displayUnit = unit;

    // Conversion automatique pour une meilleure lisibilité
    if (unit === 'kg') {
      if (value >= 1000) {
        displayValue = value / 1000;
        displayUnit = 't';
      } else if (value < 0.1) {
        displayValue = value * 1000;
        displayUnit = 'g';
      }
    }

    // Formater selon l'unité
    let formatted: string;
    if (displayUnit === 't') {
      formatted = (Math.round(displayValue * 100) / 100).toString(); // 2 décimales max
    } else if (displayUnit === 'g') {
      formatted = Math.round(displayValue).toString(); // Pas de décimales
    } else {
      formatted = (Math.round(displayValue * 10) / 10).toString(); // 1 décimale max
    }
    
    return `${formatted} ${displayUnit}`;
  }
}
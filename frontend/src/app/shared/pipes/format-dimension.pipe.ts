// src/app/shared/pipes/format-dimension.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDimension',
  standalone: true
})
export class FormatDimensionPipe implements PipeTransform {

  transform(value: number | null | undefined, unit: 'cm' | 'm' | 'mm' = 'cm'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0 ' + unit;
    }

    // Arrondir à 1 décimale
    const rounded = Math.round(value * 10) / 10;
    
    return `${rounded} ${unit}`;
  }
}
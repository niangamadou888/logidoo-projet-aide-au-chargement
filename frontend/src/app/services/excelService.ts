import * as XLSX from 'xlsx';
import { Injectable } from '@angular/core';
import { Colis } from '../models/simulation.model';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor() {}

  telechargerModele() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Type": "Carton",
        "Longueur(cm)": 30,
        "Largeur(cm)": 25,
        "Hauteur(cm)": 20,
        "Poids(kg)": 2.5,
        "Quantité": 2,
        "Destinataire": "JAdiaOumy Fall",
        "Adresse": "Medina rue 6",
        "Téléphone": "+221778128426",
        "Fragile": "Non",
        "Gerbable": "Oui",
        "Couleur": ""
      },
      {
        "Type": "Palette",
        "Longueur(cm)": 120,
        "Largeur(cm)": 80,
        "Hauteur(cm)": 15,
        "Poids(kg)": 15,
        "Quantité": 1,
        "Destinataire": "Moussa Diop",
        "Adresse": "Dakar Plateau",
        "Téléphone": "+221776543210",
        "Fragile": "Oui",
        "Gerbable": "Non",
        "Couleur": ""
      },
      {
        "Type": "Sac",
        "Longueur(cm)": 50,
        "Largeur(cm)": 30,
        "Hauteur(cm)": 25,
        "Poids(kg)": 5,
        "Quantité": 3,
        "Destinataire": "Fatou Sall",
        "Adresse": "Guediawaye",
        "Téléphone": "+221777654321",
        "Fragile": "Non",
        "Gerbable": "Oui",
        "Couleur": ""
      }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle Colis');
    XLSX.writeFile(wb, 'modele_colis.xlsx');
  }


  importerDepuisExcel(file: File): Observable<Colis[]> {
  return new Observable<Colis[]>((observer) => {
    const colonneMap: Record<string, keyof Colis> = {
      "Type": "type",
      "Longueur(cm)": "longueur",
      "Largeur(cm)": "largeur",
      "Hauteur(cm)": "hauteur",
      "Poids(kg)": "poids",
      "Quantité": "quantite",
      "Destinataire": "nomDestinataire",
      "Adresse": "adresse",
      "Téléphone": "telephone",
      // Champs optionnels pris en charge
      "Fragile": "fragile",
      "Gerbable": "gerbable",
      "Couleur": "couleur"
    };

    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const toBool = (val: any): boolean | undefined => {
          if (val === undefined || val === null || val === '') return undefined;
          const s = String(val).trim().toLowerCase();
          if (["1", "true", "vrai", "oui", "yes", "y", "x"].includes(s)) return true;
          if (["0", "false", "faux", "non", "no", "n"].includes(s)) return false;
          return undefined;
        };

        const normalizeColor = (val: any): string | undefined => {
          if (!val) return undefined;
          const s = String(val).trim();
          // Accept formats like #RRGGBB or rgb(...)
          if (/^#([0-9a-fA-F]{6})$/.test(s)) return s.toUpperCase();
          return s; // leave as provided; UI will still display
        };

        // Generate maximally distinct colors for packages
        const generateUniqueColors = (count: number): string[] => {
          const colors: string[] = [];
          const usedColors = new Set<string>();

          // Highly distinct colors with maximum visual separation
          // These colors are specifically chosen to be as different as possible
          const maxDistinctColors = [
            '#FF0000', // Pure Red
            '#00FF00', // Pure Green
            '#0000FF', // Pure Blue
            '#FFFF00', // Pure Yellow
            '#FF00FF', // Pure Magenta
            '#00FFFF', // Pure Cyan
            '#FF8000', // Pure Orange
            '#8000FF', // Purple
            '#FF0080', // Hot Pink
            '#80FF00', // Lime Green
            '#0080FF', // Sky Blue
            '#FF8080', // Light Red
            '#80FF80', // Light Green
            '#8080FF', // Light Blue
            '#FFFF80', // Light Yellow
            '#FF80FF', // Light Magenta
            '#80FFFF', // Light Cyan
            '#800000', // Dark Red
            '#008000', // Dark Green
            '#000080', // Dark Blue
            '#808000', // Olive
            '#800080', // Dark Magenta
            '#008080', // Teal
            '#404040', // Dark Gray
            '#C0C0C0', // Light Gray
            '#FFA500', // Orange
            '#A52A2A', // Brown
            '#DDA0DD', // Plum
            '#20B2AA', // Light Sea Green
            '#87CEEB'  // Sky Blue
          ];

          // For small numbers, use maximum distinction algorithm
          if (count <= maxDistinctColors.length) {
            return maxDistinctColors.slice(0, count);
          }

          // For larger numbers, use HSL with maximum spacing
          const hueStep = 360 / count;
          for (let i = 0; i < count; i++) {
            let newColor: string;
            let attempts = 0;

            do {
              // Use evenly spaced hues for maximum distinction
              const hue = (i * hueStep + (i % 3) * 120) % 360; // Add offset for better distribution
              // Alternate between high and medium saturation
              const saturation = i % 2 === 0 ? 90 : 70;
              // Alternate between different lightness levels
              const lightness = 30 + (i % 4) * 15; // Values: 30, 45, 60, 75

              newColor = this.hslToHex(hue, saturation, lightness);
              attempts++;

              // Ensure minimum color distance
              if (!this.isColorTooSimilar(newColor, Array.from(usedColors))) {
                break;
              }
            } while (attempts < 100);

            colors.push(newColor);
            usedColors.add(newColor);
          }

          return colors;
        };

        // First pass: identify unique package types and assign colors
        const packageTypes = new Map<string, string>(); // package signature -> color
        const usedColors = new Set<string>();

        // Create unique signatures for each package type
        jsonData.forEach((row) => {
          const mapped: Partial<Colis> = {};
          for (const key in row) {
            if (colonneMap[key]) {
              (mapped as any)[colonneMap[key]] = row[key];
            }
          }

          // Create a signature based on package properties (excluding quantity)
          const packageSignature = JSON.stringify({
            type: (mapped.type as any) || '',
            longueur: Number(mapped.longueur) || 0,
            largeur: Number(mapped.largeur) || 0,
            hauteur: Number(mapped.hauteur) || 0,
            poids: Number(mapped.poids) || 0,
            nomDestinataire: (mapped.nomDestinataire as any) || '',
            adresse: (mapped.adresse as any) || '',
            telephone: (mapped.telephone as any) || '',
            fragile: toBool((mapped as any).fragile),
            gerbable: toBool((mapped as any).gerbable)
          });

          // Check if color is specified in Excel
          const specifiedColor = normalizeColor((mapped as any).couleur);
          if (specifiedColor && !usedColors.has(specifiedColor)) {
            packageTypes.set(packageSignature, specifiedColor);
            usedColors.add(specifiedColor);
          } else if (!packageTypes.has(packageSignature)) {
            // Mark as needing a color
            packageTypes.set(packageSignature, '');
          }
        });

        // Generate unique colors for package types that need them
        const uniquePackageTypes = Array.from(packageTypes.keys());
        const colorsNeeded = uniquePackageTypes.filter(sig => packageTypes.get(sig) === '').length;
        const uniqueColors = generateUniqueColors(colorsNeeded + usedColors.size);

        // Assign colors to package types that don't have them
        let colorIndex = 0;
        // Skip colors already used by specified colors
        while (colorIndex < uniqueColors.length && usedColors.has(uniqueColors[colorIndex])) {
          colorIndex++;
        }

        uniquePackageTypes.forEach(packageSignature => {
          if (packageTypes.get(packageSignature) === '') {
            while (colorIndex < uniqueColors.length && usedColors.has(uniqueColors[colorIndex])) {
              colorIndex++;
            }
            if (colorIndex < uniqueColors.length) {
              packageTypes.set(packageSignature, uniqueColors[colorIndex]);
              usedColors.add(uniqueColors[colorIndex]);
              colorIndex++;
            }
          }
        });

        const colisImportes: Colis[] = jsonData.map((row, index) => {
          const mapped: Partial<Colis> = {};
          for (const key in row) {
            if (colonneMap[key]) {
              (mapped as any)[colonneMap[key]] = row[key];
            }
          }

          // Create the same signature to find the assigned color
          const packageSignature = JSON.stringify({
            type: (mapped.type as any) || '',
            longueur: Number(mapped.longueur) || 0,
            largeur: Number(mapped.largeur) || 0,
            hauteur: Number(mapped.hauteur) || 0,
            poids: Number(mapped.poids) || 0,
            nomDestinataire: (mapped.nomDestinataire as any) || '',
            adresse: (mapped.adresse as any) || '',
            telephone: (mapped.telephone as any) || '',
            fragile: toBool((mapped as any).fragile),
            gerbable: toBool((mapped as any).gerbable)
          });

          return {
            id: Date.now() + index,
            type: (mapped.type as any) || '',
            longueur: Number(mapped.longueur) || 0,
            largeur: Number(mapped.largeur) || 0,
            hauteur: Number(mapped.hauteur) || 0,
            poids: Number(mapped.poids) || 0,
            quantite: Number(mapped.quantite) || 1, // Keep original quantity
            nomDestinataire: (mapped.nomDestinataire as any) || '',
            adresse: (mapped.adresse as any) || '',
            telephone: (mapped.telephone as any) || '',
            fragile: toBool((mapped as any).fragile),
            gerbable: toBool((mapped as any).gerbable),
            couleur: packageTypes.get(packageSignature) || uniqueColors[0] // Assign color based on package type
          };
        });

        observer.next(colisImportes);
        observer.complete();
      } catch (err) {
        observer.error(err);
      }
    };

    reader.onerror = (err) => observer.error(err);
    reader.readAsArrayBuffer(file);
  });
}

  /**
   * Convert HSL to HEX color format
   * @param h Hue (0-360)
   * @param s Saturation (0-100)
   * @param l Lightness (0-100)
   * @returns HEX color string
   */
  private hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  /**
   * Check if a color is too similar to existing colors using CIEDE2000 color difference
   * @param newColor New color in HEX format
   * @param existingColors Array of existing colors in HEX format
   * @returns true if color is too similar, false if it's distinct enough
   */
  private isColorTooSimilar(newColor: string, existingColors: string[]): boolean {
    if (existingColors.length === 0) return false;

    const newRgb = this.hexToRgb(newColor);
    if (!newRgb) return false;

    for (const existingColor of existingColors) {
      const existingRgb = this.hexToRgb(existingColor);
      if (!existingRgb) continue;

      // Calculate Euclidean distance in RGB space (simpler than CIEDE2000 but effective)
      const distance = Math.sqrt(
        Math.pow(newRgb.r - existingRgb.r, 2) +
        Math.pow(newRgb.g - existingRgb.g, 2) +
        Math.pow(newRgb.b - existingRgb.b, 2)
      );

      // Threshold for minimum color difference (0-441, where 441 is max distance)
      // 100 ensures colors are visually distinct
      if (distance < 100) {
        return true; // Too similar
      }
    }

    return false; // Distinct enough
  }

  /**
   * Convert HEX to RGB
   * @param hex HEX color string
   * @returns RGB object or null if invalid
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

}

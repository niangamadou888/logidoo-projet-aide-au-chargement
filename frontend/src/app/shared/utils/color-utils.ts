// src/app/shared/utils/color-utils.ts

export class ColorUtils {
  
  // Palette de couleurs pour différents types de colis
  private static readonly TYPE_COLORS: { [key: string]: string } = {
    'carton': '#8B4513',
    'palette': '#DAA520', 
    'sac': '#696969',
    'caisse': '#CD853F',
    'rouleau': '#A0522D',
    'default': '#999999'
  };

  // Palette de couleurs pour les poids (du léger au lourd)
  private static readonly WEIGHT_COLORS = [
    '#E3F2FD', // Très léger
    '#90CAF9', // Léger
    '#42A5F5', // Moyen-léger
    '#1E88E5', // Moyen
    '#1565C0', // Moyen-lourd
    '#0D47A1'  // Lourd
  ];

  /**
   * Obtient une couleur basée sur le type de colis
   */
  static getColorByType(type: string): string {
    const normalizedType = type.toLowerCase().trim();
    return this.TYPE_COLORS[normalizedType] || this.TYPE_COLORS['default'];
  }

  /**
   * Obtient une couleur basée sur le poids relatif
   */
  static getColorByWeight(weight: number, minWeight: number, maxWeight: number): string {
    if (maxWeight === minWeight) return this.WEIGHT_COLORS[2]; // Couleur moyenne
    
    const normalized = (weight - minWeight) / (maxWeight - minWeight);
    const index = Math.floor(normalized * (this.WEIGHT_COLORS.length - 1));
    return this.WEIGHT_COLORS[Math.max(0, Math.min(index, this.WEIGHT_COLORS.length - 1))];
  }

  /**
   * Obtient une couleur pour les articles fragiles
   */
  static getFragileColor(isFragile: boolean): string {
    return isFragile ? '#FF6B6B' : '#4ECDC4';
  }

  /**
   * Convertit une couleur hex en RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convertit RGB en hex
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  /**
   * Assombrit une couleur
   */
  static darkenColor(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = (100 - percent) / 100;
    return this.rgbToHex(
      Math.round(rgb.r * factor),
      Math.round(rgb.g * factor),
      Math.round(rgb.b * factor)
    );
  }

  /**
   * Éclaircit une couleur
   */
  static lightenColor(hex: string, percent: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    return this.rgbToHex(
      Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
      Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
      Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
    );
  }

  /**
   * Génère une couleur aléatoire
   */
  static getRandomColor(): string {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  }

  /**
   * Vérifie le contraste entre deux couleurs
   */
  static getContrastRatio(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);
    
    if (!rgb1 || !rgb2) return 1;

    const getLuminance = (rgb: { r: number; g: number; b: number }) => {
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(rgb1);
    const lum2 = getLuminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }
}
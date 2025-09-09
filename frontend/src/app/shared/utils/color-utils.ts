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
<<<<<<< HEAD
   * Convertit HSL en HEX (génère des couleurs vives)
   */
  static hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
  }

  /**
   * Conversion RGB -> XYZ (D65)
   */
  private static rgbToXyz(r: number, g: number, b: number) {
    r = r / 255; g = g / 255; b = b / 255;
    const srgbToLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    r = srgbToLinear(r); g = srgbToLinear(g); b = srgbToLinear(b);
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    return { x: x * 100, y: y * 100, z: z * 100 };
  }

  /**
   * Conversion XYZ -> Lab (D65)
   */
  private static xyzToLab(x: number, y: number, z: number) {
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    x = x / refX; y = y / refY; z = z / refZ;
    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
    const fx = f(x), fy = f(y), fz = f(z);
    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    return { L, a, b };
  }

  private static hexToLab(hex: string) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;
    const xyz = this.rgbToXyz(rgb.r, rgb.g, rgb.b);
    return this.xyzToLab(xyz.x, xyz.y, xyz.z);
  }

  /**
   * DeltaE (CIE76) – suffisante pour distinguer visuellement
   */
  static deltaE(hex1: string, hex2: string): number {
    const lab1 = this.hexToLab(hex1);
    const lab2 = this.hexToLab(hex2);
    if (!lab1 || !lab2) return Infinity;
    const dL = lab1.L - lab2.L;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  /**
   * Vérifie si deux couleurs sont trop similaires selon un seuil DeltaE
   */
  static areSimilar(hex1: string, hex2: string, minDeltaE = 25): boolean {
    return this.deltaE(hex1, hex2) < minDeltaE;
  }

  /**
   * Génère une couleur aléatoire distincte d'une liste existante.
   * Utilise des couleurs vives (HSL) et évite les similaires selon DeltaE.
   */
  static getDistinctRandomColor(existingColors: string[] = [], minDeltaE = 25, maxAttempts = 50): string {
    const normalized = (existingColors || []).map(c => c?.toUpperCase()).filter(Boolean) as string[];
    for (let i = 0; i < maxAttempts; i++) {
      const hue = Math.floor(Math.random() * 360);
      const saturation = 70 + Math.floor(Math.random() * 21); // 70–90%
      const lightness = 45 + Math.floor(Math.random() * 11); // 45–55%
      const candidate = this.hslToHex(hue, saturation, lightness);
      const similar = normalized.some(c => this.areSimilar(c, candidate, minDeltaE));
      if (!similar) return candidate;
    }
    // Fallback si toutes les tentatives échouent
    return this.getRandomColor().toUpperCase();
  }

  /**
=======
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 4d8f7c8dea01b1871f2750c3593f2e597433c2d5

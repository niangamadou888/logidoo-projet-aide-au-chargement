import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Dimensions = { longueur: number; largeur: number; hauteur?: number };

// Item type from backend result (only fields we need here)
type Item = {
  type: string;
  longueur: number; // cm
  largeur: number;  // cm
  hauteur?: number; // cm
  couleur?: string;
  fragile?: boolean;
  gerbable?: boolean;
};

type ContainerResult = {
  id: string;
  ref: string;
  type: string;
  categorie: string;
  items: Item[];
};

@Component({
  selector: 'app-container-2d-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container2d-wrap" *ngIf="container && dims">
      <div class="header">
        <span class="name">{{ container.type }}</span>
        <span class="dims">{{ projW() }} × {{ projH() }} cm</span>
      </div>

      <div class="floorplan-clickable" (click)="open()" title="Cliquer pour agrandir">
        <svg
          [attr.viewBox]="'0 0 ' + viewWidth() + ' ' + viewHeight()"
          [attr.width]="svgWidth"
          [attr.height]="svgHeight"
          class="floorplan"
          role="img"
          aria-label="Plan 2D du contenant"
        >
          <!-- Container outline -->
          <rect
            x="0"
            y="0"
            [attr.width]="viewWidth()"
            [attr.height]="viewHeight()"
            class="outline"
            rx="6" ry="6"
          />

          <!-- Items (dessus uniquement) -->
          <ng-container *ngFor="let r of layout()">
            <g class="item" [attr.transform]="'translate(' + r.x + ',' + r.y + ')'">
              <rect
                [attr.width]="r.w"
                [attr.height]="r.h"
                [attr.fill]="r.fill"
                [attr.stroke]="r.stroke"
                [attr.opacity]="r.opacity"
                rx="4" ry="4"
              />
              <title>{{ r.label }}</title>
            </g>
          </ng-container>

          <!-- Scale legend -->
          <g *ngIf="showScale" class="scale" [attr.transform]="'translate(' + (viewWidth()-90) + ',' + (viewHeight()-14) + ')'">
            <rect width="80" height="6" rx="3" ry="3" class="scale-bar" />
            <text x="40" y="-2" text-anchor="middle">échelle ~ {{ scaleText() }}</text>
          </g>

          <!-- Dimension labels (inside edges to stay visible) -->
          <g class="dims-labels">
            <text [attr.x]="viewWidth()/2" [attr.y]="12" text-anchor="middle" class="dim-text">{{ projW() }} cm</text>
            <text [attr.x]="12" [attr.y]="viewHeight()/2" text-anchor="start" dominant-baseline="middle" class="dim-text">{{ projH() }} cm</text>
          </g>
        </svg>
      </div>

      <div *ngIf="warnOverflow()" class="warning">Certaines boîtes ne tiennent pas en 2D; affichage partiel.</div>
    </div>

    <!-- Lightbox overlay -->
    <div *ngIf="expanded" class="overlay" role="dialog" aria-modal="true" aria-label="Plan 2D agrandi" (click)="close()">
      <div class="overlay-content" (click)="$event.stopPropagation()">
        <button class="overlay-close" (click)="close()" aria-label="Fermer">×</button>
        <div class="overlay-header">
          <span class="name">{{ container?.type }}</span>
          <span class="dims">{{ projW() }} × {{ projH() }} cm</span>
        </div>
        <div class="toolbar">
          <div class="zoom">
            <button (click)="zoomOut()">−</button>
            <button (click)="resetView()">Reset</button>
            <button (click)="zoomIn()">+</button>
          </div>
        </div>
        <div class="overlay-canvas" (wheel)="onWheel($event)" (mousedown)="onMouseDown($event)" (mousemove)="onMouseMove($event)" (mouseup)="onMouseUp()" (mouseleave)="onMouseUp()">
          <svg
            [attr.viewBox]="'0 0 ' + viewWidth() + ' ' + viewHeight()"
            [attr.width]="viewWidth()"
            [attr.height]="viewHeight()"
            class="floorplan large"
            role="img"
            aria-label="Plan 2D agrandi du contenant"
          >
            <g [attr.transform]="'translate(' + panX + ',' + panY + ') scale(' + zoom + ')'">
              <rect x="0" y="0" [attr.width]="viewWidth()" [attr.height]="viewHeight()" class="outline" rx="8" ry="8" />
              <ng-container *ngIf="viewMode==='top'">
                <ng-container *ngFor="let r of layout()">
                  <g class="item" [attr.transform]="'translate(' + r.x + ',' + r.y + ')'">
                    <rect [attr.width]="r.w" [attr.height]="r.h" [attr.fill]="r.fill" [attr.stroke]="r.stroke" [attr.opacity]="r.opacity" rx="4" ry="4" />
                  </g>
                </ng-container>
              </ng-container>
              <!-- Ticks along edges for orientation -->
              <g class="ticks">
                <ng-container *ngFor="let t of tickXs()">
                  <line [attr.x1]="t.pos" y1="0" [attr.x2]="t.pos" y2="8" class="tick" />
                  <text [attr.x]="t.pos + 2" y="20" class="tick-text">{{ t.label }}</text>
                </ng-container>
                <ng-container *ngFor="let t of tickYs()">
                  <line x1="0" [attr.y1]="t.pos" x2="8" [attr.y2]="t.pos" class="tick" />
                  <text x="12" [attr.y]="t.pos + 3" class="tick-text">{{ t.label }}</text>
                </ng-container>
              </g>
              <g class="dim-guides">
                <text [attr.x]="viewWidth()/2" [attr.y]="12" text-anchor="middle" class="dim-text">{{ projW() }} cm</text>
                <text [attr.x]="12" [attr.y]="viewHeight()/2" text-anchor="start" dominant-baseline="middle" class="dim-text">{{ projH() }} cm</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container2d-wrap { display: flex; flex-direction: column; gap: 8px; }
    .header { display: flex; justify-content: space-between; font-size: 12px; color: #374151; }
    .name { font-weight: 600; }
    .floorplan { width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
    .floorplan.large { border-width: 2px; }
    .outline { fill: #ffffff; stroke: #64748b; stroke-width: 1.2; }
    .item rect { stroke-width: 1; }
    .scale text { font-size: 9px; fill: #6b7280; }
    .scale-bar { fill: #94a3b8; opacity: .6; }
    .warning { color: #b45309; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .floorplan-clickable { cursor: zoom-in; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .overlay-content { position: relative; background: #ffffff; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 16px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; gap: 10px; }
    .overlay-close { position: absolute; top: 6px; right: 10px; background: transparent; border: none; font-size: 28px; line-height: 20px; color: #111827; cursor: pointer; }
    .overlay-header { display: flex; gap: 8px; align-items: baseline; color: #111827; }
    .toolbar { display: flex; justify-content: space-between; padding: 6px 0; gap: 8px; }
    .toolbar .views button, .toolbar .zoom button { margin-right: 6px; background: #e5e7eb; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
    .toolbar button.active { background: #d1fae5; color: #065f46; }
    .overlay-canvas { overflow: hidden; padding: 8px; background: #f8fafc; border-radius: 8px; cursor: grab; }
    .overlay-canvas:active { cursor: grabbing; }
    .dim-text { font-size: 10px; fill: #374151; }
    .tick { stroke: #9ca3af; stroke-width: 1; }
    .tick-text { font-size: 9px; fill: #6b7280; }
    .rotate-90 { transform: rotate(-90deg); transform-box: fill-box; transform-origin: center; }
  `]
})
export class Container2DViewComponent {
  @Input() container!: ContainerResult | null;
  @Input() containerDimensions!: Dimensions | null;
  @Input() scaleToWidth = 320; // px
  @Input() showScale = true;
  @Input() allowRotation = true;

  svgWidth = 320;
  svgHeight = 200;
  expanded = false;
  expandedScaleToWidth = 1000;
  // Vue: dessus / façade / profil
  viewMode: 'top' | 'front' | 'side' = 'top';
  // Pan & Zoom (overlay)
  zoom = 1;
  panX = 0;
  panY = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;

  private overflowWarning = false;

  get dims(): Dimensions | null {
    return this.containerDimensions ?? null;
  }

  private normalizeDims(d: Dimensions): Dimensions {
    // Heuristic normalization to cm if backend units differ:
    // - If values look like mm (both > 1000), convert to cm (/10)
    // - If values look like meters (both < 10), convert to cm (*100)
    let { longueur, largeur, hauteur } = d;
    if (longueur > 1000 && largeur > 1000) {
      longueur = longueur / 10;
      largeur = largeur / 10;
      if (hauteur) hauteur = hauteur / 10;
    } else if (longueur < 10 && largeur < 10) {
      longueur = longueur * 100;
      largeur = largeur * 100;
      if (hauteur) hauteur = hauteur * 100;
    }
    return { longueur, largeur, hauteur };
  }

  private getScale(): number {
    if (!this.dims) return 1;
    const nd = this.normalizeDims(this.dims);
    const base = this.expanded ? this.expandedScaleToWidth : this.scaleToWidth;
    const [wCm] = this.projectedWH(nd);
    const k = base / wCm;
    return Math.max(0.1, k);
  }

  viewWidth = () => {
    const dims = this.dims ? this.normalizeDims(this.dims) : null;
    if (!dims) return this.svgWidth;
    const [wCm] = this.projectedWH(dims);
    return wCm * this.getScale();
  };

  viewHeight = () => {
    const dims = this.dims ? this.normalizeDims(this.dims) : null;
    if (!dims) return this.svgHeight;
    const [, hCm] = this.projectedWH(dims);
    return hCm * this.getScale();
  };

  scaleText = () => {
    // Rough text: 1 px ~= X cm
    const inv = this.dims ? (1 / this.getScale()).toFixed(1) : '1.0';
    return `1px≈${inv}cm`;
  };

  warnOverflow() {
    return this.overflowWarning;
  }

  // Dimensions projetées (cm)
  projW(): number {
    if (!this.dims) return 0;
    const nd = this.normalizeDims(this.dims);
    const [w] = this.projectedWH(nd);
    return Math.round(w);
  }

  projH(): number {
    if (!this.dims) return 0;
    const nd = this.normalizeDims(this.dims);
    const [, h] = this.projectedWH(nd);
    return Math.round(h);
  }

  private projectedWH(nd: Dimensions): [number, number] {
    // Mapping:
    // - top (dessus): longueur × largeur
    // - front (façade): largeur × hauteur
    // - side (profil): longueur × hauteur
    if (this.viewMode === 'top') return [nd.longueur, nd.largeur];
    if (this.viewMode === 'front') return [nd.largeur, nd.hauteur ?? this.estimateHeight()];
    return [nd.longueur, nd.hauteur ?? this.estimateHeight()];
  }

  private estimateHeight(): number {
    const items = (this.container?.items || []) as Item[];
    const maxH = Math.max(0, ...items.map(i => i.hauteur || 0));
    return maxH > 0 ? maxH : 250;
  }

  // Ticks helpers (overlay)
  private pickTickStep(wCm: number, k: number): number {
    const candidates = [10, 20, 50, 100, 200, 500]; // cm
    for (const c of candidates) {
      if (c * k >= 40) return c; // at least 40px spacing
    }
    return 1000;
  }

  tickXs(): { pos: number; label: string }[] {
    if (!this.dims) return [];
    const nd = this.normalizeDims(this.dims);
    const [wCm] = this.projectedWH(nd);
    const k = this.getScale();
    const step = this.pickTickStep(wCm, k);
    const out: { pos: number; label: string }[] = [];
    for (let cm = 0; cm <= wCm + 1e-6; cm += step) {
      out.push({ pos: Math.round(cm * k), label: String(Math.round(cm)) });
    }
    return out;
  }

  tickYs(): { pos: number; label: string }[] {
    if (!this.dims) return [];
    const nd = this.normalizeDims(this.dims);
    const [, hCm] = this.projectedWH(nd);
    const k = this.getScale();
    const step = this.pickTickStep(hCm, k);
    const out: { pos: number; label: string }[] = [];
    for (let cm = 0; cm <= hCm + 1e-6; cm += step) {
      out.push({ pos: Math.round(cm * k), label: String(Math.round(cm)) });
    }
    return out;
  }

  // Simple shelf layout algorithm: pack rectangles row-by-row along longueur (x), rows stacked along largeur (y)
  layout() {
    this.overflowWarning = false;
    const out: { x: number; y: number; w: number; h: number; fill: string; stroke: string; opacity: number; label: string }[] = [];
    const dims = this.dims ? this.normalizeDims(this.dims) : null;
    if (!this.container || !dims) return out;
    if (this.viewMode !== 'top') return out;

    // MaxRects bin (in cm, then scaled to px)
    const binW = dims.longueur;
    const binH = dims.largeur;
    const k = this.getScale();

    type R = { x: number; y: number; w: number; h: number };
    let free: R[] = [{ x: 0, y: 0, w: binW, h: binH }];

    const placements: { it: Item; x: number; y: number; w: number; h: number; rotated: boolean }[] = [];

    const rects = [...(this.container.items || [])]
      .map(it => ({ it, w: it.longueur || 0, h: it.largeur || 0 }))
      .filter(r => r.w > 0 && r.h > 0);

    // Sort by area desc to improve packing
    rects.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    const fits = (f: R, w: number, h: number) => (w <= f.w + 1e-6 && h <= f.h + 1e-6);

    const score = (f: R, w: number, h: number) => {
      // Best Short Side Fit (BSSF)
      const leftoverH = Math.abs(f.w - w);
      const leftoverV = Math.abs(f.h - h);
      const shortSide = Math.min(leftoverH, leftoverV);
      const longSide = Math.max(leftoverH, leftoverV);
      return { shortSide, longSide };
    };

    const placeInFree = (w: number, h: number): { fi: number; x: number; y: number } | null => {
      let best: { fi: number; x: number; y: number; s1: number; s2: number } | null = null;
      for (let i = 0; i < free.length; i++) {
        const f = free[i];
        if (fits(f, w, h)) {
          const s = score(f, w, h);
          if (!best || s.shortSide < best.s1 || (s.shortSide === best.s1 && s.longSide < best.s2)) {
            best = { fi: i, x: f.x, y: f.y, s1: s.shortSide, s2: s.longSide };
          }
        }
      }
      return best ? { fi: best.fi, x: best.x, y: best.y } : null;
    };

    const splitFree = (fi: number, used: R) => {
      const f = free[fi];
      const newFree: R[] = [];
      // Above
      if (used.y > f.y && used.y < f.y + f.h) {
        newFree.push({ x: f.x, y: f.y, w: f.w, h: used.y - f.y });
      }
      // Below
      if (used.y + used.h < f.y + f.h) {
        newFree.push({ x: f.x, y: used.y + used.h, w: f.w, h: (f.y + f.h) - (used.y + used.h) });
      }
      // Left
      if (used.x > f.x && used.x < f.x + f.w) {
        const top = Math.max(f.y, used.y);
        const bottom = Math.min(f.y + f.h, used.y + used.h);
        newFree.push({ x: f.x, y: top, w: used.x - f.x, h: bottom - top });
      }
      // Right
      if (used.x + used.w < f.x + f.w) {
        const top = Math.max(f.y, used.y);
        const bottom = Math.min(f.y + f.h, used.y + used.h);
        newFree.push({ x: used.x + used.w, y: top, w: (f.x + f.w) - (used.x + used.w), h: bottom - top });
      }
      // Remove original
      free.splice(fi, 1);
      // Add new ones
      free.push(...newFree.filter(r => r.w > 0.1 && r.h > 0.1));
      // Prune contained rects
      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          const a = free[i], b = free[j];
          if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
            free.splice(i, 1); i--; break;
          }
          if (b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h) {
            free.splice(j, 1); j--; continue;
          }
        }
      }
    };

    for (const r of rects) {
      // Try no rotation
      let choice = placeInFree(r.w, r.h);
      let rotated = false;
      // Try rotation if allowed
      if (!choice && this.allowRotation) {
        const rot = placeInFree(r.h, r.w);
        if (rot) { choice = rot; rotated = true; }
      }
      if (!choice) { this.overflowWarning = true; continue; }

      const used: R = { x: choice.x, y: choice.y, w: rotated ? r.h : r.w, h: rotated ? r.w : r.h };
      placements.push({ it: r.it, x: used.x, y: used.y, w: used.w, h: used.h, rotated });
      splitFree(choice.fi, used);
    }

    // Convert to SVG coordinates (px)
    for (const p of placements) {
      const fill = p.it.couleur || '#9ca3af';
      const stroke = '#374151';
      out.push({
        x: Math.round(p.x * k),
        y: Math.round(p.y * k),
        w: Math.max(1, Math.floor(p.w * k)),
        h: Math.max(1, Math.floor(p.h * k)),
        fill,
        stroke,
        opacity: p.it.fragile ? 0.85 : 1,
        label: `${p.it.type} ${p.w}×${p.h}cm${p.it.fragile ? ' (fragile)' : ''}${p.rotated ? ' [rot]' : ''}`
      });
    }

    this.svgWidth = Math.max(200, Math.floor(this.viewWidth()));
    this.svgHeight = Math.max(120, Math.floor(this.viewHeight()));

    return out;
  }

  open() {
    this.expanded = true;
    this.resetView();
    this.updateExpandedScaleToFit();
  }

  close() {
    this.expanded = false;
  }

  // Fit the enlarged view within viewport
  private updateExpandedScaleToFit() {
    if (!this.dims) return;
    const nd = this.normalizeDims(this.dims);
    const vw = Math.max(320, window.innerWidth - 160);
    const vh = Math.max(240, window.innerHeight - 260);
    const [wCm, hCm] = this.projectedWH(nd);
    const kW = vw / wCm;
    const kH = vh / hCm;
    const k = Math.max(0.1, Math.min(kW, kH));
    this.expandedScaleToWidth = wCm * k;
  }

  zoomIn() { this.zoom = Math.min(8, this.zoom * 1.2); }
  zoomOut() { this.zoom = Math.max(0.2, this.zoom / 1.2); }
  resetView() { this.zoom = 1; this.panX = 0; this.panY = 0; }

  onWheel(ev: WheelEvent) { ev.preventDefault(); const d = Math.sign(ev.deltaY); if (d > 0) this.zoomOut(); else this.zoomIn(); }
  onMouseDown(ev: MouseEvent) { this.dragging = true; this.dragStartX = ev.clientX; this.dragStartY = ev.clientY; this.panStartX = this.panX; this.panStartY = this.panY; }
  onMouseMove(ev: MouseEvent) { if (!this.dragging) return; const dx = ev.clientX - this.dragStartX; const dy = ev.clientY - this.dragStartY; this.panX = this.panStartX + dx; this.panY = this.panStartY + dy; }
  onMouseUp() { this.dragging = false; }

  @HostListener('window:resize')
  onResize() {
    if (this.expanded) this.updateExpandedScaleToFit();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (this.expanded && (ev.key === 'Escape' || ev.key === 'Esc')) {
      this.close();
    }
  }
}

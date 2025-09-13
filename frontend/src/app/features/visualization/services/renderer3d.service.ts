// src/app/features/visualization/services/three-d-renderer.service.ts

import { Injectable } from '@angular/core';
import {
  VisualizationContainer,
  VisualizationItem,
  ViewportSettings,
  VisualizationConfig
} from '../models/visualization.model';

// Interface pour Three.js (sera chargé dynamiquement)
declare const THREE: any;

@Injectable({
  providedIn: 'root'
})
export class ThreeDRendererService {

  private scene: any = null;
  private camera: any = null;
  private renderer: any = null;
  private controls: any = null;
  private container: HTMLElement | null = null;

  // Groupes d'objets 3D
  private containerGroup: any = null;
  private itemsGroup: any = null;
  private helpersGroup: any = null;
  private currentContainerDims: { longueur: number; largeur: number; hauteur: number } | null = null;

  // État du rendu
  private isInitialized = false;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Configuration actuelle
  private currentConfig: VisualizationConfig | null = null;
  private currentViewport: ViewportSettings | null = null;
  // Espace visuel entre les colis (en centimètres)
  private readonly gapCm: number = 2;

  // Indexation des meshes pour interactions (sélection, focus)
  private itemMeshMap: Map<string, any> = new Map();
  private selectionOutline: any | null = null;
  private selectedItemId: string | null = null;

  // Mise en évidence avancée
  private dimmedMeshes: Set<any> = new Set();
  private highlightGroup: any | null = null; // groupe pour label/anneau
  private pulseStartMs: number | null = null;
  private highlightTimeout: any | null = null;

  // Animation de caméra
  private camAnimStartMs: number | null = null;
  private camAnimDurationMs = 700;
  private camFrom: any | null = null; // THREE.Vector3
  private camTo: any | null = null;   // THREE.Vector3

  constructor() { }

  /**
   * Initialise le moteur 3D
   */
  async initialize(container: HTMLElement): Promise<void> {
    this.container = container;

    try {
      // Charger Three.js depuis le CDN
      await this.loadThreeJS();

      // Initialiser la scène
      this.initializeScene();
      this.initializeCamera();
      this.initializeRenderer();
      this.initializeControls();
      this.initializeLights();
      this.initializeHelpers();

      // Démarrer le rendu
      this.startRenderLoop();
      this.setupResizeObserver();

      this.isInitialized = true;
      console.log('Moteur 3D initialisé avec succès');

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du moteur 3D:', error);
      throw error;
    }
  }

  /**
   * Charge Three.js dynamiquement
   */
  private loadThreeJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vérifier si Three.js est déjà chargé
      if (typeof THREE !== 'undefined') {
        resolve();
        return;
      }

      // Charger Three.js depuis le CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        // Charger OrbitControls
        const controlsScript = document.createElement('script');
        controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        controlsScript.onload = () => resolve();
        controlsScript.onerror = () => reject(new Error('Impossible de charger OrbitControls'));
        document.head.appendChild(controlsScript);
      };
      script.onerror = () => reject(new Error('Impossible de charger Three.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialise la scène 3D
   */
  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Créer les groupes d'objets
    this.containerGroup = new THREE.Group();
    this.itemsGroup = new THREE.Group();
    this.helpersGroup = new THREE.Group();

    this.scene.add(this.containerGroup);
    this.scene.add(this.itemsGroup);
    this.scene.add(this.helpersGroup);
  }

  /**
   * Initialise la caméra
   */
  private initializeCamera(): void {
    const rect = this.container!.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 5000);
    this.camera.position.set(800, 600, 800);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Initialise le renderer
   */
  private initializeRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    const rect = this.container!.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Configuration du renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.container!.appendChild(this.renderer.domElement);
  }

  /**
   * Initialise les contrôles de caméra
   */
  private initializeControls(): void {
    if (typeof (THREE as any).OrbitControls !== 'undefined') {
      this.controls = new (THREE as any).OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.enableRotate = true;
    }
  }

  /**
   * Initialise l'éclairage
   */
  private initializeLights(): void {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Lumière directionnelle principale
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    this.scene.add(directionalLight);

    // Lumière d'appoint
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, -100, -100);
    this.scene.add(fillLight);
  }

  /**
   * Initialise les helpers visuels
   */
  private initializeHelpers(): void {
    // Grille au sol
    const gridHelper = new THREE.GridHelper(1000, 20, 0x888888, 0xcccccc);
    gridHelper.visible = true;
    this.helpersGroup.add(gridHelper);

    // Axes de coordonnées
    const axesHelper = new THREE.AxesHelper(200);
    axesHelper.visible = true;
    this.helpersGroup.add(axesHelper);
  }

  /**
   * Démarre la boucle de rendu
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (this.controls) {
        this.controls.update();
      }

      // Mise à jour animations personnalisées
      this.updateAnimations();

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Configuration de l'observer de redimensionnement
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0) {
        this.handleResize(entries[0].contentRect);
      }
    });

    this.resizeObserver.observe(this.container!);
  }

  /**
   * Gère le redimensionnement
   */
  private handleResize(rect: DOMRectReadOnly): void {
    if (!this.renderer || !this.camera) return;

    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  /**
   * Met à jour la scène avec de nouveaux containers
   */
  updateScene(containers: VisualizationContainer[], currentIndex: number): void {
    if (!this.isInitialized) return;

    // Vider les groupes
    this.clearScene();
    this.itemMeshMap.clear();

    if (containers.length > 0) {
      const currentContainer = containers[currentIndex];
      this.renderContainer(currentContainer);
      this.renderItems(currentContainer.items);

      // Centrer la caméra sur le container
      this.focusOnContainer(currentContainer);
    }
  }

  /**
   * Vide la scène
   */
  private clearScene(): void {
    // Nettoyer les groupes
    while (this.containerGroup.children.length > 0) {
      const child = this.containerGroup.children[0];
      this.containerGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    while (this.itemsGroup.children.length > 0) {
      const child = this.itemsGroup.children[0];
      this.itemsGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Nettoyage sélection
    if (this.selectionOutline && this.selectionOutline.parent) {
      this.selectionOutline.parent.remove(this.selectionOutline);
    }
    this.selectionOutline = null;
    this.selectedItemId = null;

    // Nettoyage des effets de surbrillance
    this.clearProminentHighlight();
  }

  /**
   * Rendu d'un container
   */
  private renderContainer(container: VisualizationContainer): void {
    const { longueur, largeur, hauteur } = container.dimensions;

    console.log('🚚 Rendu conteneur:');
    console.log(`   Dimensions: ${longueur}×${largeur}×${hauteur} cm`);
    console.log(`   Dimensions 3D: ${this.cmToUnits(longueur)}×${this.cmToUnits(largeur)}×${this.cmToUnits(hauteur)} unités`);


    // Géométrie du container (wireframe)
    const geometry = new THREE.BoxGeometry(
      this.cmToUnits(longueur),
      this.cmToUnits(hauteur),
      this.cmToUnits(largeur)
    );

    const material = new THREE.MeshBasicMaterial({
      color: container.color || 0x666666,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });

    const containerMesh = new THREE.Mesh(geometry, material);
    containerMesh.position.y = this.cmToUnits(hauteur) / 2;

    this.containerGroup.add(containerMesh);

    // Plan du sol du container
    const floorGeometry = new THREE.PlaneGeometry(
      this.cmToUnits(longueur),
      this.cmToUnits(largeur)
    );
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0xf0f0f0,
      transparent: true,
      opacity: 0.5
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    this.containerGroup.add(floor);
    
    // Mémoriser les dimensions courantes pour positionner correctement les colis
    this.currentContainerDims = { longueur, largeur, hauteur };
  }

  /**
   * Rendu des items
   */
  private renderItems(items: VisualizationItem[]): void {
    items.forEach(item => {
      const mesh = this.createItemMesh(item);
      this.itemsGroup.add(mesh);
      if (item.id) {
        this.itemMeshMap.set(item.id, mesh);
      }
    });
  }

  /**
   * Crée un mesh 3D pour un item
   */
  private createItemMesh(item: VisualizationItem): any {
    const { longueur, largeur, hauteur } = item.dimensions;

    // Réduire légèrement la géométrie pour créer un espace visuel entre les colis
    const adjLongueur = Math.max(1, longueur - this.gapCm);
    const adjLargeur = Math.max(1, largeur - this.gapCm);
    const adjHauteur = Math.max(1, hauteur - this.gapCm);

    // Géométrie
    const geometry = new THREE.BoxGeometry(
      this.cmToUnits(adjLongueur),
      this.cmToUnits(adjHauteur),
      this.cmToUnits(adjLargeur)
    );

    // Matériau
    const color = new THREE.Color(item.color);
    const materialParams: any = {
      color: color,
      transparent: item.opacity !== undefined,
      opacity: item.opacity || 1
    };
    // Mise en évidence des colis non gerbables si activé
    if (this.currentConfig?.highlightNonGerbable && item.gerbable === false) {
      materialParams.emissive = new THREE.Color(0xffd54f); // jaune/orangé
    }
    const material = new THREE.MeshLambertMaterial(materialParams);

    // Mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Position (conversion des coordonnées) basée sur les dimensions du conteneur courant
    const cont = this.currentContainerDims || { longueur: 1200, largeur: 240, hauteur: 260 };
    mesh.position.set(
      // Conserver le centre basé sur les dimensions d'origine
      this.cmToUnits(item.position.x + longueur / 2) - this.cmToUnits(cont.longueur) / 2,
      this.cmToUnits(item.position.z + hauteur / 2),
      this.cmToUnits(item.position.y + largeur / 2) - this.cmToUnits(cont.largeur) / 2
    );

    // Ombres
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Données utilisateur pour l'interaction
    mesh.userData = { item };

    // Marqueurs spéciaux
    if (item.fragile && (this.currentConfig?.showFragileItems ?? true)) {
      this.addFragileMarker(mesh);
    }

    if (item.gerbable === false && (this.currentConfig?.highlightNonGerbable ?? true)) {
      this.addNonStackableMarker(mesh);
    }

    return mesh;
  }

  /**
   * Met en évidence un item et centre la caméra dessus
   */
  public focusOnItem(item: VisualizationItem): void {
    if (!item?.id) return;
    const mesh = this.itemMeshMap.get(item.id);
    if (!mesh || !this.camera || !this.controls) return;

    // Calculer le centre de l'objet
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Déplacer la cible des contrôles vers le centre
    if (this.controls.target) {
      this.controls.target.copy(center);
    }

    // Positionner la caméra à une distance adaptée à la taille du colis
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.5 + 60; // marge

    // Animation de la caméra (fly-to)
    this.camFrom = this.camera.position.clone();
    this.camTo = new THREE.Vector3(center.x + dist, center.y + dist * 0.7, center.z + dist);
    this.camAnimStartMs = performance.now();

    this.applySelectionOutline(mesh, item.id);

    // Mise en évidence avancée (anneau pulsant + label + atténuer autres colis)
    this.applyProminentHighlight(mesh);
    this.dimOtherItems(mesh);

    // Auto-clear après 3s (ne retire pas l'outline)
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }
    this.highlightTimeout = setTimeout(() => {
      this.clearProminentHighlight();
      this.highlightTimeout = null;
    }, 5000);
  }

  private applySelectionOutline(targetMesh: any, itemId: string): void {
    // Supprimer l'ancien outline
    if (this.selectionOutline && this.selectionOutline.parent) {
      this.selectionOutline.parent.remove(this.selectionOutline);
    }
    this.selectionOutline = null;
    this.selectedItemId = itemId;

    try {
      const edges = new THREE.EdgesGeometry(targetMesh.geometry);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00a2ff });
      const outline = new THREE.LineSegments(edges, lineMat);
      outline.position.copy(targetMesh.position);
      outline.rotation.copy(targetMesh.rotation);
      outline.scale.copy(targetMesh.scale);
      targetMesh.add(outline);
      this.selectionOutline = outline;
    } catch (e) {
      const helper = new THREE.BoxHelper(targetMesh, 0x00a2ff);
      this.scene.add(helper);
      this.selectionOutline = helper;
    }
  }

  private applyProminentHighlight(targetMesh: any): void {
    this.clearProminentHighlight();

    const group = new THREE.Group();

    // Calcul de la boîte pour positionner les éléments
    const box = new THREE.Box3().setFromObject(targetMesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Anneau pulsant au-dessus du colis
    const ringOuter = Math.max(20, Math.min(size.x, size.z) * 0.8);
    const ringTube = Math.max(1.2, ringOuter * 0.08);
    const ringGeom = new THREE.TorusGeometry(ringOuter, ringTube, 12, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00a2ff, transparent: true, opacity: 0.65 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, size.y * 0.55, 0);
    group.add(ring);

    // Label flottant "ICI"
    const label = this.createBillboardLabel('ICI', '#075985', '#ffffff');
    const scaleFactor = Math.max(28, Math.min(110, Math.min(size.x, size.z) * 0.7));
    label.scale.setScalar(scaleFactor);
    label.position.set(0, size.y * 0.7 + scaleFactor * 0.03, 0);
    group.add(label);

    // Attacher le groupe au mesh ciblé pour suivre ses transformations
    group.position.set(
      center.x - targetMesh.position.x,
      center.y - targetMesh.position.y,
      center.z - targetMesh.position.z
    );
    targetMesh.add(group);

    this.highlightGroup = group;
    this.pulseStartMs = performance.now();
  }

  private clearProminentHighlight(): void {
    if (this.highlightGroup && this.highlightGroup.parent) {
      this.highlightGroup.parent.remove(this.highlightGroup);
    }
    this.highlightGroup = null;
    this.pulseStartMs = null;
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }

    // Restaurer l'opacité des autres colis
    if (this.dimmedMeshes.size) {
      this.dimmedMeshes.forEach((m: any) => {
        const orig = m.userData?.origOpacity;
        if (orig !== undefined && m.material) {
          m.material.transparent = orig < 1;
          m.material.opacity = orig;
        }
        if (m.userData) delete m.userData.origOpacity;
      });
      this.dimmedMeshes.clear();
    }
  }

  private dimOtherItems(selectedMesh: any): void {
    if (!this.itemsGroup) return;
    this.itemsGroup.children.forEach((child: any) => {
      if (child !== selectedMesh && child.material) {
        if (child.userData && child.userData.item) {
          // Stocker opacité d'origine
          if (child.userData.origOpacity === undefined) {
            child.userData.origOpacity = child.material.opacity ?? 1;
          }
          child.material.transparent = true;
          child.material.opacity = 0.15;
          this.dimmedMeshes.add(child);
        }
      }
    });
  }

  private updateAnimations(): void {
    const now = performance.now();

    // Animation de caméra
    if (this.camAnimStartMs !== null && this.camFrom && this.camTo) {
      const t = Math.min(1, (now - this.camAnimStartMs) / this.camAnimDurationMs);
      // easing cubic out
      const ease = 1 - Math.pow(1 - t, 3);
      const x = this.camFrom.x + (this.camTo.x - this.camFrom.x) * ease;
      const y = this.camFrom.y + (this.camTo.y - this.camFrom.y) * ease;
      const z = this.camFrom.z + (this.camTo.z - this.camFrom.z) * ease;
      this.camera.position.set(x, y, z);
      if (t >= 1) {
        this.camAnimStartMs = null;
      }
    }

    // Pulsation de l'anneau
    if (this.pulseStartMs !== null && this.highlightGroup) {
      const elapsed = (now - this.pulseStartMs) / 1000; // s
      const ring = this.highlightGroup.children?.find((c: any) => c.geometry && c.geometry.type === 'TorusGeometry');
      if (ring) {
        const scale = 1 + 0.12 * Math.sin(elapsed * 4 * Math.PI);
        ring.scale.setScalar(scale);
        if (ring.material) {
          ring.material.opacity = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 4 * Math.PI));
        }
      }
      // Faire légèrement flotter le label
      const label = this.highlightGroup.children?.find((c: any) => c.isSprite);
      if (label) {
        label.position.y += Math.sin(elapsed * 3) * 0.2;
      }
    }
  }

  /**
   * Ajoute un marqueur fragile
   */
  private addFragileMarker(parentMesh: any): void {
    const box = new THREE.Box3().setFromObject(parentMesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    // 1) Liseré rouge (outline) pour rendre l'objet bien visible
    if (parentMesh.geometry) {
      const edges = new THREE.EdgesGeometry(parentMesh.geometry);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xff3333 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.copy(parentMesh.position.clone().sub(parentMesh.position));
      parentMesh.add(line);
    }

    // 2) Capot supérieur semi-transparent rouge
    const topPlaneGeom = new THREE.PlaneGeometry(size.x, size.z);
    const topPlaneMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const topPlane = new THREE.Mesh(topPlaneGeom, topPlaneMat);
    topPlane.rotation.x = -Math.PI / 2;
    topPlane.position.set((box.min.x + box.max.x) / 2 - parentMesh.position.x,
                          box.max.y - parentMesh.position.y + 0.1,
                          (box.min.z + box.max.z) / 2 - parentMesh.position.z);
    parentMesh.add(topPlane);

    // 3) Étiquette billboard "FRAGILE"
    const label = this.createBillboardLabel('FRAGILE', '#b91c1c', '#ffffff');
    const scaleFactor = Math.max(20, Math.min(80, Math.min(size.x, size.z) * 0.4));
    label.scale.setScalar(scaleFactor);
    label.position.set((box.min.x + box.max.x) / 2 - parentMesh.position.x,
                       box.max.y - parentMesh.position.y + scaleFactor * 0.02 + 6,
                       (box.min.z + box.max.z) / 2 - parentMesh.position.z);
    parentMesh.add(label);
  }

  /**
   * Ajoute un marqueur visuel pour les colis non gerbables (étiquette seulement)
   */
  private addNonStackableMarker(parentMesh: any): void {
    const box = new THREE.Box3().setFromObject(parentMesh);
    const sizeVec = new THREE.Vector3();
    box.getSize(sizeVec);

    const faceMin = Math.max(8, Math.min(sizeVec.x, sizeVec.z));
    const topY = box.max.y + Math.max(6, sizeVec.y * 0.05);
    const centerX = (box.min.x + box.max.x) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;

    // Étiquette billboard "NON EMPILABLE"
    const label = this.createBillboardLabel('NON EMPILABLE', '#991b1b', '#ffffff');
    const scaleFactor = Math.max(22, Math.min(90, faceMin * 0.5));
    label.scale.setScalar(scaleFactor);
    label.position.set(centerX - parentMesh.position.x,
                       topY - parentMesh.position.y + scaleFactor * 0.03,
                       centerZ - parentMesh.position.z);
    parentMesh.add(label);
  }

  /**
   * Crée un sprite billboard avec une étiquette lisible en 3D
   */
  private createBillboardLabel(text: string, bgColor = '#111827', textColor = '#ffffff'): any {
    const padding = 8;
    const fontSize = 28;

    // Canvas pour dessiner l'étiquette
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `bold ${fontSize}px sans-serif`;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.4);
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Redessiner avec dimension réelle
    const radius = 8;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    // Fond avec coins arrondis
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, radius, bgColor);
    // Texte
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    // Sprite par défaut: 1 unité = 1 pixel en scale; on gère le scale ailleurs
    sprite.scale.set(canvas.width / 2, canvas.height / 2, 1);
    return sprite;
  }

  /**
   * Dessine un rectangle à coins arrondis rempli
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fillStyle: string) {
    const min = Math.min(w, h) / 2;
    const radius = Math.min(r, min);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  /**
   * Centre la caméra sur un container
   */
  private focusOnContainer(container: VisualizationContainer): void {
    if (!this.camera || !this.controls) return;

    const { longueur, largeur, hauteur } = container.dimensions;
    const maxDim = Math.max(longueur, largeur, hauteur);
    const distance = this.cmToUnits(maxDim * 2);

    this.camera.position.set(distance, distance * 0.8, distance);
    this.camera.lookAt(0, this.cmToUnits(hauteur) / 2, 0);

    if (this.controls.target) {
      this.controls.target.set(0, this.cmToUnits(hauteur) / 2, 0);
      this.controls.update();
    }
  }

  /**
   * Réinitialise la caméra/contrôles sur le conteneur courant
   */
  public resetCamera(container: VisualizationContainer): void {
    this.focusOnContainer(container);
  }

  /**
   * Met à jour la configuration de rendu
   */
  updateConfig(config: VisualizationConfig): void {
    this.currentConfig = config;

    if (!this.isInitialized) return;

    // Mettre à jour les helpers
    if (this.helpersGroup) {
      this.helpersGroup.children.forEach((helper: any) => {
        if (helper.type === 'GridHelper') {
          helper.visible = config.showDimensions;
        }
        if (helper.type === 'AxesHelper') {
          helper.visible = config.showDimensions;
        }
      });
    }
  }

  /**
   * Met à jour les paramètres de viewport
   */
  updateViewport(viewport: ViewportSettings): void {
    this.currentViewport = viewport;

    if (!this.isInitialized) return;

    // Mettre à jour l'arrière-plan
    if (this.scene && viewport.backgroundColor) {
      this.scene.background = new THREE.Color(viewport.backgroundColor);
    }
  }

  /**
   * Conversion centimètres -> unités de rendu
   */
  private cmToUnits(cm: number): number {
    return cm / 2; // 1 unité = 2cm
  }

  /**
   * Nettoyage des ressources
   */
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    this.clearScene();
    this.isInitialized = false;
  }
}

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

    if (item.gerbable === false) {
      this.addNonStackableMarker(mesh);
    }

    return mesh;
  }

  /**
   * Ajoute un marqueur fragile
   */
  private addFragileMarker(parentMesh: any): void {
    const markerGeometry = new THREE.SphereGeometry(5, 8, 6);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);

    // Position au-dessus de l'item
    const box = new THREE.Box3().setFromObject(parentMesh);
    marker.position.copy(box.max);
    marker.position.y += 10;

    parentMesh.add(marker);
  }

  /**
   * Ajoute un marqueur visuel pour les colis non gerbables (croix rouge sur le dessus)
   */
  private addNonStackableMarker(parentMesh: any): void {
    const size = 6;
    const thickness = 1.2;
    const color = 0xcc0000;

    const geom = new THREE.BoxGeometry(size, thickness, thickness);
    const mat = new THREE.MeshBasicMaterial({ color });

    const cross1 = new THREE.Mesh(geom, mat);
    const cross2 = new THREE.Mesh(geom, mat.clone());

    // Positionner au-dessus de l'objet
    const box = new THREE.Box3().setFromObject(parentMesh);
    const topY = box.max.y + 6;

    cross1.position.set((box.min.x + box.max.x) / 2, topY, (box.min.z + box.max.z) / 2);
    cross1.rotation.y = Math.PI / 4;

    cross2.position.copy(cross1.position);
    cross2.rotation.y = -Math.PI / 4;

    parentMesh.add(cross1);
    parentMesh.add(cross2);
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

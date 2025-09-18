// src/app/features/visualization/services/export-logidoo.service.ts

import { Injectable } from '@angular/core';
import { VisualizationScene, VisualizationContainer } from '../models/visualization.model';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class ExportLogidooService {

  constructor() { }

  /**
   * Export PDF avec toutes les vues 2D - Version Logidoo avec encodage UTF-8 amélioré et image du contenant
   */
  async exportToPDFWithAll2DViews(scene: VisualizationScene): Promise<void> {
    try {
      console.log('🎯 Démarrage export PDF Logidoo avec encodage UTF-8 et image du contenant...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: false,
        compress: false
      });

      // === CONFIGURATION ENCODAGE UTF-8 RENFORCÉE ===
      pdf.setProperties({
        title: 'Rapport de Simulation Logidoo',
        subject: 'Analyse Multi-Vues 2D avec visualisation des contenants',
        author: 'Logidoo - Solution digitale de logistique innovante',
        creator: 'Plateforme Logidoo v2.0 - UTF-8',
        keywords: 'logistique, simulation, optimisation, contenants, colis, français, UTF-8'
      });

      // Configuration avancée pour les caractères UTF-8
      const originalText = pdf.text;
      pdf.text = function(text: any, x: number, y: number, options?: any) {
        if (typeof text === 'string') {
          // Normaliser les caractères UTF-8
          text = text.normalize('NFC');
        }
        return originalText.call(this, text, x, y, options);
      };

      const logidooColors = {
        yellow: '#F8CB0E',
        black: '#000000',
        blue: '#092B8B',
        lightYellow: '#FDF6D3',
        mediumYellow: '#FBE865',
        darkBlue: '#061F62',
        lightBlue: '#E8ECFA',
        mediumBlue: '#4A5FC7',
        white: '#FFFFFF',
        lightGray: '#F5F5F5',
        mediumGray: '#666666',
        darkGray: '#333333',
        success: '#2ECC71',
        warning: '#F39C12',
        error: '#E74C3C'
      };

      // === PAGES DU RAPPORT ===
      this.addLogidooCoverPageWithUTF8(pdf, logidooColors, scene);
      
      pdf.addPage();
      this.addLogidooExecutiveSummaryWithUTF8(pdf, logidooColors, scene);
      
      pdf.addPage();
      await this.addContainerVisualizationPage(pdf, logidooColors, scene);
      
      pdf.addPage();
      this.addLogidooItemsTableWithUTF8(pdf, logidooColors, scene);
      
      // Capturer et ajouter les vues 2D
      const allViews = await this.captureAll2DViews();
      this.addLogidooVisualizationPagesWithUTF8(pdf, logidooColors, allViews);
      
      this.addLogidooFootersWithUTF8(pdf, logidooColors);

      // Télécharger avec encodage UTF-8
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `rapport-simulation-logidoo-${timestamp}.pdf`;
      
      // Estimer la taille du PDF
      const pdfOutput = pdf.output('dataurlstring');
      const estimatedSizeMB = (pdfOutput.length * 0.75) / (1024 * 1024); // Approximation base64
      console.log(`📊 Taille estimée du PDF: ${estimatedSizeMB.toFixed(2)} MB`);
      
      pdf.save(filename);
      
      console.log('✅ Export PDF Logidoo avec encodage UTF-8 et image du contenant réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF Logidoo:', error);
      throw new Error(`Erreur lors de l'export PDF Logidoo: ${error}`);
    }
  }

  /**
   * Page de couverture avec encodage UTF-8 amélioré
   */
  private addLogidooCoverPageWithUTF8(pdf: any, colors: any, scene: VisualizationScene): void {
    // Header avec couleurs Logidoo
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 40, 210, 15, 'F');

    // Logo Logidoo avec encodage UTF-8
    pdf.setTextColor(colors.black);
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    const logoText = 'LOGIDOO';
    pdf.text(logoText, 105, 30, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.white);
    const subtitleText = 'Solution digitale de logistique innovante';
    pdf.text(subtitleText, 105, 50, { align: 'center' });

    // Zone principale
    pdf.setFillColor(colors.white);
    pdf.rect(0, 55, 210, 242, 'F');
    
    // Titre du rapport avec encodage correct
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    const titleText = 'RAPPORT DE SIMULATION';
    pdf.text(titleText, 105, 80, { align: 'center' });
    
    // Ligne de séparation
    pdf.setDrawColor(colors.yellow);
    pdf.setLineWidth(4);
    pdf.line(50, 90, 160, 90);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const subtitleText2 = 'Analyse Multi-Vues 2D avec Visualisation des Contenants';
    pdf.text(subtitleText2, 105, 105, { align: 'center' });

    // Statistiques avec encodage UTF-8
    const cardY = 125;
    const cardWidth = 45;
    const cardHeight = 30;
    
    const totalContainers = scene.containers?.length || 0;
    const totalItems = scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0;
    const avgUtilization = scene.containers && scene.containers.length > 0 
      ? scene.containers.reduce((sum, c) => sum + (c.utilization?.volume || 0), 0) / scene.containers.length 
      : 0;

    // Cards avec texte encodé UTF-8
    this.drawStatCard(pdf, colors, 25, cardY, cardWidth, cardHeight, 
                     totalContainers.toString(), 'CONTENEURS', colors.yellow, colors.black);
    
    this.drawStatCard(pdf, colors, 82.5, cardY, cardWidth, cardHeight, 
                     totalItems.toString(), 'COLIS', colors.blue, colors.white);
    
    this.drawStatCard(pdf, colors, 140, cardY, cardWidth, cardHeight, 
                     `${avgUtilization.toFixed(0)}%`, 'UTILISATION', colors.lightYellow, colors.blue);

    // Informations avec encodage UTF-8
    pdf.setTextColor(colors.black);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const dateText = `Date de génération: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
    pdf.text(dateText, 30, 180);
    const deptText = 'Département: Logistique & Supply Chain';
    pdf.text(deptText, 30, 195);
    
    // Encadré objectifs avec UTF-8
    this.drawObjectivesBox(pdf, colors);
  }

  /**
   * Nouvelle page dédiée à la visualisation du contenant avec image
   */
  private async addContainerVisualizationPage(pdf: any, colors: any, scene: VisualizationScene): Promise<void> {
    // En-tête
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const headerText = 'VISUALISATION DES CONTENANTS';
    pdf.text(headerText, 20, 29);
    
    let yPos = 55;

    if (scene.containers && scene.containers.length > 0) {
      for (const [index, container] of scene.containers.entries()) {
        if (yPos > 220) {
          pdf.addPage();
          yPos = 30;
        }

        // Card du contenant
        pdf.setFillColor(colors.white);
        pdf.rect(15, yPos - 5, 180, 80, 'F');
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(2);
        pdf.rect(15, yPos - 5, 180, 80, 'D');
        
        // Bordure jaune
        pdf.setFillColor(colors.yellow);
        pdf.rect(15, yPos - 5, 6, 80, 'F');
        
        // Titre du contenant
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.blue);
        const containerTitle = `Contenant ${index + 1}: ${container.type}`;
        pdf.text(containerTitle, 25, yPos + 5);
        
        // Image du contenant (image réelle)
        await this.drawContainerImage(pdf, colors, container, 25, yPos + 15);
        
        // Informations détaillées du contenant
        this.drawContainerDetails(pdf, colors, container, 120, yPos + 15);
        
        yPos += 90;
      }
    }
  }

  /**
   * Dessine l'image réelle du contenant dans le PDF
   */
  private async drawContainerImage(pdf: any, colors: any, container: any, x: number, y: number): Promise<void> {
    try {
      console.log(`🔍 Sélection d'image pour le conteneur:`, {
        type: container.type,
        images: container.images,
        hasImages: !!(container.images && container.images.length > 0)
      });
      
      const imagePath = this.getContainerImagePath(container);
      console.log(`📍 Chemin d'image sélectionné: ${imagePath}`);
      
      if (imagePath) {
        // Charger l'image depuis le serveur
        const imageBase64 = await this.loadContainerImage(imagePath);
        if (imageBase64) {
          // Ajouter l'image au PDF
          const imageWidth = 80;
          const imageHeight = 45;
          
          // Cadre pour l'image
          pdf.setDrawColor(colors.blue);
          pdf.setLineWidth(2);
          pdf.rect(x, y, imageWidth, imageHeight, 'D');
          
          // Image du conteneur
          pdf.addImage(imageBase64, 'PNG', x + 2, y + 2, imageWidth - 4, imageHeight - 4);
          
          // Étiquette du type
          pdf.setFillColor(colors.yellow);
          pdf.rect(x, y - 8, imageWidth, 8, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.black);
          pdf.text(container.type || 'Conteneur', x + 5, y - 3);
          
          return;
        }
      }
      
      // Fallback : dessiner une représentation schématique si l'image n'est pas disponible
      this.drawSchematicContainer(pdf, colors, container, x, y);
      
    } catch (error) {
      console.warn('Impossible de charger l\'image du conteneur:', error);
      // Fallback : dessiner une représentation schématique
      this.drawSchematicContainer(pdf, colors, container, x, y);
    }
  }

  /**
   * Obtient le chemin de l'image du conteneur - utilise l'image réelle du conteneur si disponible
   */
  private getContainerImagePath(container: any): string | null {
    console.log('🖼️ Recherche image pour conteneur:', container);
    console.log('📷 Images disponibles:', container.images);
    
    // Priorité 1: utiliser l'image réelle du conteneur (même que dans l'interface de sélection)
    if (container.images && container.images.length > 0) {
      // Utiliser exactement la même logique que l'interface de sélection
      const selectedImage = container.images[0]; // Le premier élément du tableau d'images
      console.log('✅ Image sélectionnée depuis conteneur:', selectedImage);
      return selectedImage;
    }
    
    console.log('⚠️ Pas d\'image spécifique, utilisation du fallback basé sur le type:', container.type);
    
    // Priorité 2: fallback sur le mapping par type si pas d'image spécifique
    const containerType = container.type;
    if (!containerType) return null;
    
    const typeMapping: { [key: string]: string } = {
      '20ft': '/uploads/20Ft-Container.png',
      '20 ft': '/uploads/20Ft-Container.png',
      '20FT': '/uploads/20Ft-Container.png',
      '20-ft': '/uploads/20Ft-Container.png',
      'container': '/uploads/container1.png',
      'container1': '/uploads/container1.png', 
      'container2': '/uploads/container_2.png',
      'standard': '/uploads/container1.png',
      'cube': '/uploads/cube.png'
    };
    
    // Recherche directe
    const directMatch = typeMapping[containerType.toLowerCase()];
    if (directMatch) {
      return directMatch;
    }
    
    // Recherche partielle pour les conteneurs 20ft
    if (containerType.toLowerCase().includes('20') && containerType.toLowerCase().includes('ft')) {
      return '/uploads/20Ft-Container.png';
    }
    
    // Recherche partielle pour les conteneurs standards
    if (containerType.toLowerCase().includes('container')) {
      return '/uploads/container1.png';
    }
    
    // Par défaut, conteneur standard
    return '/uploads/container1.png';
  }

  /**
   * Charge l'image du conteneur depuis le serveur et la convertit en base64
   */
  private async loadContainerImage(imagePath: string): Promise<string | null> {
    try {
      let fullImageUrl: string;
      
      // Si le chemin contient déjà le domaine (comme dans l'interface), l'utiliser tel quel
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        fullImageUrl = imagePath;
      } else {
        // Sinon construire l'URL complète avec le serveur approprié
        const baseUrl = 'https://logidoo.onrender.com'; // En production
        // const baseUrl = 'http://localhost:3000'; // En local
        fullImageUrl = baseUrl + imagePath;
      }
      
      console.log(`🖼️ Chargement de l'image depuis: ${fullImageUrl}`);
      
      const response = await fetch(fullImageUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error);
      return null;
    }
  }

  /**
   * Dessine une représentation schématique du contenant (fallback)
   */
  private drawSchematicContainer(pdf: any, colors: any, container: any, x: number, y: number): void {
    const containerWidth = 80;
    const containerHeight = 45;
    
    // Contenant principal (vue isométrique simple)
    pdf.setFillColor(colors.lightBlue);
    pdf.rect(x, y, containerWidth, containerHeight, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(2);
    pdf.rect(x, y, containerWidth, containerHeight, 'D');
    
    // Effet 3D simple
    pdf.setFillColor(colors.mediumBlue);
    pdf.triangle(x + containerWidth, y, x + containerWidth + 15, y - 10, x + containerWidth, y + containerHeight);
    pdf.triangle(x + containerWidth, y + containerHeight, x + containerWidth + 15, y + containerHeight - 10, x + containerWidth + 15, y - 10);
    
    pdf.setFillColor(colors.darkBlue);
    pdf.rect(x, y - 10, containerWidth, 10, 'F');
    pdf.triangle(x + containerWidth, y - 10, x + containerWidth + 15, y - 20, x + containerWidth + 15, y - 10);
    
    // Dimensions du contenant
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const dimensions = `${container.dimensions.longueur}x${container.dimensions.largeur}x${container.dimensions.hauteur} cm`;
    pdf.text(dimensions, x + 5, y + containerHeight - 5);
    
    // Représentation des colis à l'intérieur
    if (container.items && container.items.length > 0) {
      this.drawItemsInContainer(pdf, colors, container.items, x + 5, y + 5, containerWidth - 10, containerHeight - 15);
    }
  }

  /**
   * Dessine les colis à l'intérieur du contenant
   */
  private drawItemsInContainer(pdf: any, colors: any, items: any[], x: number, y: number, width: number, height: number): void {
    const itemColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const maxItems = Math.min(items.length, 12); // Limiter l'affichage
    const cols = Math.ceil(Math.sqrt(maxItems));
    const rows = Math.ceil(maxItems / cols);
    
    const itemWidth = width / cols - 2;
    const itemHeight = height / rows - 2;
    
    for (let i = 0; i < maxItems; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const itemX = x + col * (itemWidth + 2);
      const itemY = y + row * (itemHeight + 2);
      
      const color = itemColors[i % itemColors.length];
      const rgb = this.hexToRgb(color);
      
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(itemX, itemY, itemWidth, itemHeight, 'F');
      pdf.setDrawColor(colors.black);
      pdf.setLineWidth(0.5);
      pdf.rect(itemX, itemY, itemWidth, itemHeight, 'D');
    }
    
    // Indication du nombre total si plus d'items
    if (items.length > maxItems) {
      pdf.setFontSize(6);
      pdf.setTextColor(colors.mediumGray);
      const moreText = `+${items.length - maxItems} autres`;
      pdf.text(moreText, x, y + height + 5);
    }
  }

  /**
   * Dessine les détails du contenant
   */
  private drawContainerDetails(pdf: any, colors: any, container: any, x: number, y: number): void {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    
    const details = [
      { label: 'Type:', value: container.type || 'Standard' },
      { label: 'Dimensions:', value: `${container.dimensions.longueur} × ${container.dimensions.largeur} × ${container.dimensions.hauteur} cm` },
      { label: 'Volume total:', value: `${((container.dimensions.longueur * container.dimensions.largeur * container.dimensions.hauteur) / 1000000).toFixed(2)} m³` },
      { label: 'Nombre de colis:', value: `${container.items?.length || 0}` },
      { label: 'Utilisation volume:', value: `${(container.utilization?.volume || 0).toFixed(1)}%` },
      { label: 'Utilisation poids:', value: `${(container.utilization?.weight || 0).toFixed(1)}%` }
    ];
    
    let detailY = y;
    details.forEach(detail => {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.blue);
      pdf.text(detail.label, x, detailY);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(colors.black);
      pdf.text(detail.value, x + 35, detailY);
      
      detailY += 7;
    });
  }

  /**
   * Résumé exécutif avec encodage UTF-8 amélioré
   */
  private addLogidooExecutiveSummaryWithUTF8(pdf: any, colors: any, scene: VisualizationScene): void {
    // En-tête
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const headerText = 'RÉSUMÉ EXÉCUTIF';
    pdf.text(headerText, 20, 29);
    
    let yPos = 55;
    
    // Texte d'introduction avec UTF-8
    pdf.setTextColor(colors.black);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const introText = 'Ce rapport présente une analyse détaillée de la simulation de chargement optimisé.';
    pdf.text(introText, 20, yPos);
    yPos += 8;
    
    const introText2 = 'Les visualisations 2D permettent de valider la configuration des contenants.';
    pdf.text(introText2, 20, yPos);
    yPos += 15;

    // Détails des contenants avec encodage correct
    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, index) => {
        this.drawExecutiveSummaryContainer(pdf, colors, container, index, yPos);
        yPos += 60;
        
        if (yPos > 240) {
          pdf.addPage();
          yPos = 30;
        }
      });
    }
  }

  /**
   * Dessine le résumé d'un contenant dans le résumé exécutif
   */
  private drawExecutiveSummaryContainer(pdf: any, colors: any, container: any, index: number, yPos: number): void {
    // Card du contenant
    pdf.setFillColor(colors.white);
    pdf.rect(15, yPos - 8, 180, 50, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(2);
    pdf.rect(15, yPos - 8, 180, 50, 'D');
    
    // Bordure jaune
    pdf.setFillColor(colors.yellow);
    pdf.rect(15, yPos - 8, 6, 50, 'F');
    
    // En-tête bleu clair
    pdf.setFillColor(colors.lightBlue);
    pdf.rect(21, yPos - 5, 170, 12, 'F');
    
    // Titre
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    const containerTitle = `Contenant ${index + 1}: ${container.type}`;
    pdf.text(containerTitle, 25, yPos + 1);
    
    // Détails en colonnes
    const detailY = yPos + 12;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    
    // Colonne 1: Dimensions
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('DIMENSIONS', 25, detailY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const dimText = `${container.dimensions.longueur} × ${container.dimensions.largeur} × ${container.dimensions.hauteur} cm`;
    pdf.text(dimText, 25, detailY + 5);
    
    // Colonne 2: Volume
    const volume = (container.dimensions.longueur * container.dimensions.largeur * container.dimensions.hauteur / 1000000).toFixed(2);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('VOLUME', 80, detailY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const volumeText = `${volume} m³`;
    pdf.text(volumeText, 80, detailY + 5);
    
    // Colonne 3: Items
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('COLIS', 125, detailY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const itemsText = `${container.items?.length || 0} items`;
    pdf.text(itemsText, 125, detailY + 5);
    
    // Barre de performance
    if (container.utilization) {
      this.drawPerformanceBar(pdf, colors, container.utilization, 25, detailY + 15);
    }
  }

  /**
   * Tableau des colis avec encodage UTF-8 amélioré
   */
  private addLogidooItemsTableWithUTF8(pdf: any, colors: any, scene: VisualizationScene): void {
    // En-tête
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const headerText = 'DÉTAIL DES COLIS';
    pdf.text(headerText, 20, 29);
    
    let yPos = 55;
    const itemColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, containerIndex) => {
        // Titre du contenant
        this.drawContainerTableHeader(pdf, colors, container, containerIndex, yPos);
        yPos += 18;
        
        if (container.items && container.items.length > 0) {
          // En-têtes du tableau
          yPos = this.drawTableHeaders(pdf, colors, yPos);
          
          // Lignes du tableau
          container.items.forEach((item, itemIndex) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 30;
            }
            
            yPos = this.drawItemRow(pdf, colors, item, itemIndex, containerIndex, itemColors, yPos);
          });
          
          yPos += 15;
        } else {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(colors.mediumGray);
          const noItemsText = 'Aucun colis dans ce contenant';
          pdf.text(noItemsText, 20, yPos);
          yPos += 15;
        }
      });
    }
  }

  /**
   * Pages de visualisation avec encodage UTF-8
   */
  private addLogidooVisualizationPagesWithUTF8(pdf: any, colors: any, allViews: { [key: string]: string | null }): void {
    const viewLabels = {
      top: 'Vue Plan (dessus)',
      bottom: 'Vue Dessous',
      side: 'Vue Côté',
      'side-opposite': 'Vue Côté Opposé',
      front: 'Vue Avant',
      back: 'Vue Arrière'
    };

    Object.entries(allViews).forEach(([viewKey, viewData]) => {
      if (viewData) {
        pdf.addPage();
        
        // En-tête
        pdf.setFillColor(colors.blue);
        pdf.rect(0, 20, 210, 12, 'F');
        pdf.setFillColor(colors.yellow);
        pdf.rect(0, 32, 210, 3, 'F');
        
        pdf.setTextColor(colors.white);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        const headerText = 'VISUALISATIONS 2D';
        pdf.text(headerText, 20, 29);
        
        // Titre de la vue
        pdf.setFillColor(colors.lightYellow);
        pdf.rect(15, 45, 180, 18, 'F');
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(2);
        pdf.rect(15, 45, 180, 18, 'D');
        
        pdf.setFillColor(colors.yellow);
        pdf.rect(15, 45, 5, 18, 'F');
        
        pdf.setTextColor(colors.blue);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const viewTitle = viewLabels[viewKey as keyof typeof viewLabels] || viewKey;
        pdf.text(viewTitle, 25, 56);
        
        // Cadre pour l'image
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(3);
        pdf.rect(18, 73, 174, 104, 'D');
        
        // Coins décoratifs
        pdf.setFillColor(colors.yellow);
        pdf.rect(18, 73, 6, 6, 'F');
        pdf.rect(186, 73, 6, 6, 'F');
        pdf.rect(18, 171, 6, 6, 'F');
        pdf.rect(186, 171, 6, 6, 'F');
        
        // Image de la vue
        console.log(`📄 Ajout de l'image ${viewKey} au PDF - Taille: ${Math.round(viewData.length / 1024)}KB`);
        pdf.addImage(viewData, 'PNG', 20, 75, 170, 100);
        
        // Description avec encodage UTF-8
        this.drawViewDescription(pdf, colors, viewKey, viewLabels);
        
        console.log(`✅ Vue ${viewKey} ajoutée au PDF avec encodage UTF-8`);
      }
    });
  }

  /**
   * Pieds de page avec encodage UTF-8
   */
  private addLogidooFootersWithUTF8(pdf: any, colors: any): void {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Ligne de séparation
      pdf.setDrawColor(colors.yellow);
      pdf.setLineWidth(2);
      pdf.line(20, 283, 110, 283);
      
      pdf.setDrawColor(colors.blue);
      pdf.line(110, 283, 190, 283);
      
      // Pied de page
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.blue);
      pdf.text('LOGIDOO', 20, 290);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(colors.black);
      const footerText = 'Solution digitale de logistique innovante';
      pdf.text(footerText, 45, 290);
      
      // Numéro de page
      pdf.setTextColor(colors.blue);
      const pageText = `Page ${i} sur ${pageCount}`;
      pdf.text(pageText, 190, 290, { align: 'right' });
      
      // Informations supplémentaires
      pdf.setFontSize(6);
      pdf.setTextColor(colors.mediumGray);
      pdf.text('www.logidoo.co', 20, 294);
      const poweredText = 'Powered by Logidoo Technology';
      pdf.text(poweredText, 190, 294, { align: 'right' });
    }
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Capture toutes les vues 2D (méthode existante conservée)
   */
  async captureAll2DViews(): Promise<{ [key: string]: string | null }> {
    const views = {
      top: null as string | null,
      bottom: null as string | null,
      side: null as string | null,
      'side-opposite': null as string | null,
      front: null as string | null,
      back: null as string | null
    };

    const viewNames = Object.keys(views) as Array<keyof typeof views>;

    try {
      console.log('🎯 Début capture de toutes les vues 2D...');

      const currentViewElement = document.querySelector('[data-current-view]');
      const currentView = currentViewElement?.getAttribute('data-current-view') || '3d';
      
      if (currentView !== '2d') {
        console.log('🔄 Passage en mode 2D...');
        const toggleButton = document.querySelector('[data-toggle-view="2d"]') as HTMLButtonElement;
        if (toggleButton) {
          toggleButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      for (const viewMode of viewNames) {
        console.log(`📸 Capture de la vue: ${viewMode}`);
        
        const canvasComponent = document.querySelector('app-canvas');
        if (canvasComponent && (canvasComponent as any).changeView) {
          (canvasComponent as any).changeView(viewMode);
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const canvas = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = imageData ? Array.from(imageData.data).some(pixel => pixel !== 0) : false;
            
            if (hasContent) {
              const dataURL = canvas.toDataURL('image/png');
              views[viewMode] = dataURL;
              console.log(`✅ Vue ${viewMode} capturée avec succès - Taille: ${Math.round(dataURL.length / 1024)}KB`);
            } else {
              console.warn(`⚠️ Vue ${viewMode} capturée mais vide`);
            }
          }
        } else {
          console.warn(`⚠️ Impossible de changer vers la vue ${viewMode}`);
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors de la capture des vues 2D:', error);
    }

    return views;
  }

  /**
   * Dessine une card de statistique
   */
  private drawStatCard(pdf: any, colors: any, x: number, y: number, width: number, height: number, 
                       value: string, label: string, bgColor: string, textColor: string): void {
    // Background
    pdf.setFillColor(bgColor);
    pdf.rect(x, y, width, height, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(2);
    pdf.rect(x, y, width, height, 'D');
    
    // Valeur
    pdf.setTextColor(textColor);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, x + width/2, y + 15, { align: 'center' });
    
    // Label
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x + width/2, y + 25, { align: 'center' });
  }

  /**
   * Dessine l'encadré des objectifs
   */
  private drawObjectivesBox(pdf: any, colors: any): void {
    pdf.setFillColor(colors.lightBlue);
    pdf.rect(25, 210, 160, 50, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(3);
    pdf.rect(25, 210, 160, 50, 'D');
    
    // Barre jaune de titre
    pdf.setFillColor(colors.yellow);
    pdf.rect(25, 210, 160, 8, 'F');
    
    pdf.setTextColor(colors.black);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const objectivesTitle = 'OBJECTIFS DE LA SIMULATION';
    pdf.text(objectivesTitle, 30, 225);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.blue);
    const objectives = [
      '• Optimisation de l\'espace de chargement',
      '• Analyse des différentes perspectives 2D',
      '• Validation de la configuration des colis',
      '• Génération de rapport détaillé pour validation'
    ];
    
    objectives.forEach((obj, i) => {
      pdf.text(obj, 32, 235 + i * 7);
    });
  }

  /**
   * Dessine la barre de performance
   */
  private drawPerformanceBar(pdf: any, colors: any, utilization: any, x: number, y: number): void {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('PERFORMANCE:', x, y);
    
    const barWidth = 60;
    const barHeight = 6;
    const volumePercent = utilization.volume / 100;
    
    // Background de la barre
    pdf.setFillColor(colors.lightGray);
    pdf.rect(x + 35, y - 3, barWidth, barHeight, 'F');
    
    // Remplissage selon performance
    if (volumePercent > 0.8) {
      pdf.setFillColor(colors.success);
    } else if (volumePercent > 0.5) {
      pdf.setFillColor(colors.yellow);
    } else {
      pdf.setFillColor(colors.error);
    }
    pdf.rect(x + 35, y - 3, barWidth * volumePercent, barHeight, 'F');
    
    // Bordure
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(1);
    pdf.rect(x + 35, y - 3, barWidth, barHeight, 'D');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.blue);
    const perfText = `${utilization.volume.toFixed(1)}% vol.`;
    pdf.text(perfText, x + 100, y + 1);
  }

  /**
   * Dessine l'en-tête du tableau de contenant
   */
  private drawContainerTableHeader(pdf: any, colors: any, container: any, index: number, yPos: number): void {
    pdf.setFillColor(colors.lightYellow);
    pdf.rect(15, yPos - 5, 180, 15, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(2);
    pdf.line(15, yPos - 5, 195, yPos - 5);
    
    pdf.setFillColor(colors.yellow);
    pdf.rect(15, yPos - 5, 5, 15, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    const containerTitle = `Contenant ${index + 1} - ${container.type}`;
    pdf.text(containerTitle, 25, yPos + 3);
  }

  /**
   * Dessine les en-têtes du tableau
   */
  private drawTableHeaders(pdf: any, colors: any, yPos: number): number {
    const headers = ['Couleur', 'Référence', 'Type', 'Destinataire', 'Dimensions (L×l×h)', 'Volume', 'Poids', 'Statut'];
    const colWidths = [12, 22, 20, 30, 30, 18, 16, 32];
    let xPos = 15;
    
    // Fond d'en-tête
    pdf.setFillColor(colors.blue);
    pdf.rect(15, yPos - 3, 180, 10, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.white);
    
    headers.forEach((header, i) => {
      if (header !== 'Couleur') {
        pdf.text(header, xPos + 2, yPos + 2);
      } else {
        pdf.text('●', xPos + 7, yPos + 2, { align: 'center' });
      }
      xPos += colWidths[i];
    });
    
    return yPos + 12;
  }

  /**
   * Dessine une ligne d'item dans le tableau
   */
  private drawItemRow(pdf: any, colors: any, item: any, itemIndex: number, containerIndex: number, 
                      itemColors: string[], yPos: number): number {
    const colWidths = [12, 22, 20, 30, 30, 18, 16, 32];
    let xPos = 15;
    
    // Alternance de couleur
    if (itemIndex % 2 === 0) {
      pdf.setFillColor(colors.lightBlue);
      pdf.rect(15, yPos - 3, 180, 9, 'F');
    }
    
    // Couleur du colis
    const itemColor = itemColors[itemIndex % itemColors.length];
    const rgb = this.hexToRgb(itemColor);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.circle(xPos + 7, yPos + 1, 3, 'F');
    pdf.setDrawColor(colors.black);
    pdf.setLineWidth(0.5);
    pdf.circle(xPos + 7, yPos + 1, 3, 'D');
    xPos += colWidths[0];
    
    pdf.setTextColor(colors.black);
    
    // Données du tableau
    const rowData = [
      item.reference || item.id || `C${containerIndex + 1}-${itemIndex + 1}`,
      this.getItemType(item),
      item.nomDestinataire || 'N/A',
      `${item.dimensions.longueur}×${item.dimensions.largeur}×${item.dimensions.hauteur}`,
      `${(item.dimensions.longueur * item.dimensions.largeur * item.dimensions.hauteur / 1000000).toFixed(3)}m³`,
      item.poids ? `${item.poids}kg` : 'N/A',
      this.getItemStatusText(item)
    ];
    
    rowData.forEach((data, i) => {
      if (i === 6 && (item.fragile || item.gerbable === false)) {
        pdf.setTextColor(colors.error);
        pdf.text('⚠ ' + data, xPos + 1, yPos + 2);
        pdf.setTextColor(colors.black);
      } else if (i === 1) {
        pdf.setTextColor(this.getTypeColor(data, colors));
        pdf.text(data, xPos + 1, yPos + 2);
        pdf.setTextColor(colors.black);
      } else {
        pdf.text(data, xPos + 1, yPos + 2);
      }
      xPos += colWidths[i + 1];
    });
    
    return yPos + 9;
  }

  /**
   * Dessine la description de la vue
   */
  private drawViewDescription(pdf: any, colors: any, viewKey: string, viewLabels: any): void {
    pdf.setFillColor(colors.lightBlue);
    pdf.rect(20, 185, 170, 30, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(1);
    pdf.rect(20, 185, 170, 30, 'D');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('DESCRIPTION:', 25, 195);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    const descText1 = 'Cette vue présente la disposition optimisée des colis';
    pdf.text(descText1, 25, 202);
    const viewName = viewLabels[viewKey as keyof typeof viewLabels]?.toLowerCase() || viewKey;
    const descText2 = `selon la perspective ${viewName}.`;
    pdf.text(descText2, 25, 209);
  }

  /**
   * Convertit une couleur hex en RGB
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Détermine le type de colis
   */
  private getItemType(item: any): string {
    if (item.type) {
      return item.type;
    }
    
    const volume = (item.dimensions.longueur * item.dimensions.largeur * item.dimensions.hauteur) / 1000;
    
    if (item.fragile) {
      if (volume < 10) {
        return 'Fragile Petit';
      } else if (volume < 50) {
        return 'Fragile Moyen';
      } else {
        return 'Fragile Volumineux';
      }
    }
    
    if (item.gerbable === false) {
      return 'Non-Empilable';
    }
    
    if (volume < 5) {
      return 'Petit Colis';
    } else if (volume < 20) {
      return 'Colis Standard';
    } else if (volume < 100) {
      return 'Colis Volumineux';
    } else {
      return 'Gros Colis';
    }
  }

  /**
   * Obtient le texte de statut d'un colis
   */
  private getItemStatusText(item: any): string {
    const statuses = [];
    
    if (item.fragile) {
      statuses.push('Fragile');
    }
    
    if (item.gerbable === false) {
      statuses.push('Non-empilable');
    }
    
    if (item.poids && item.poids > 20) {
      statuses.push('Lourd');
    }
    
    return statuses.length > 0 ? statuses.join(', ') : 'Standard';
  }

  /**
   * Obtient la couleur selon le type de colis
   */
  private getTypeColor(type: string, colors: any): string {
    const typeColors: { [key: string]: string } = {
      'Fragile': colors.error,
      'Non-Empilable': colors.warning,
      'Petit Colis': colors.success,
      'Colis Standard': colors.blue,
      'Colis Volumineux': colors.mediumBlue,
      'Gros Colis': colors.darkBlue,
      'Fragile Petit': colors.error,
      'Fragile Moyen': colors.error,
      'Fragile Volumineux': colors.error
    };
    
    return typeColors[type] || colors.black;
  }

  /**
   * Export PDF avec toutes les vues 2D et couleurs des colis (méthode publique)
   */
  async exportToPDFWithAll2DViewsAndColors(scene: VisualizationScene): Promise<void> {
    return this.exportToPDFWithAll2DViews(scene);
  }

  /**
   * Export PDF avec encodage UTF-8 amélioré (méthode publique alternative)
   */
  async exportToPDFWithAll2DViewsAndTypesUTF8(scene: VisualizationScene): Promise<void> {
    return this.exportToPDFWithAll2DViews(scene);
  }

  /**
   * Normalise le texte pour un meilleur support UTF-8 dans le PDF
   */
  private normalizeUTF8Text(text: string): string {
    if (!text) return '';
    
    // Normalisation Unicode et remplacement des caractères problématiques
    return text
      .normalize('NFC')
      .replace(/'/g, "'")  // Remplacer apostrophe courbe par droite
      .replace(/"/g, '"')  // Remplacer guillemets courbes par droits
      .replace(/"/g, '"')
      .replace(/–/g, '-')  // Remplacer tirets en-dash par hyphens
      .replace(/—/g, '-')  // Remplacer tirets em-dash par hyphens
      .replace(/…/g, '...')  // Remplacer points de suspension
      .replace(/®/g, '(R)')  // Remplacer symbole registered
      .replace(/©/g, '(C)')  // Remplacer symbole copyright
      .replace(/™/g, '(TM)') // Remplacer symbole trademark
      .replace(/€/g, 'EUR')  // Remplacer symbole euro
      .replace(/£/g, 'GBP')  // Remplacer symbole livre
      .replace(/°/g, 'deg'); // Remplacer symbole degré
  }

  /**
   * Méthode helper pour ajouter du texte avec encodage UTF-8 sécurisé
   */
  private addUTF8Text(pdf: any, text: string, x: number, y: number, options?: any): void {
    const normalizedText = this.normalizeUTF8Text(text);
    pdf.text(normalizedText, x, y, options);
  }
}
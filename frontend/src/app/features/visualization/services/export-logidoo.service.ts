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
   * Export PDF avec toutes les vues 2D - Version Logidoo avec charte graphique officielle
   */
  async exportToPDFWithAll2DViews(scene: VisualizationScene): Promise<void> {
    try {
      console.log('🎯 Démarrage export PDF avec charte graphique Logidoo officielle...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Couleurs officielles de la charte graphique Logidoo
      const logidooColors = {
        // Couleurs primaires Logidoo (charte officielle)
        yellow: '#F8CB0E',            // Jaune Logidoo HEX: #F8CB0E
        black: '#000000',             // Noir Logidoo HEX: #000000
        blue: '#092B8B',              // Bleu Logidoo HEX: #092B8B
        
        // Variations et teintes dérivées pour l'interface
        lightYellow: '#FDF6D3',       // Jaune très clair pour backgrounds
        mediumYellow: '#FBE865',      // Jaune moyen
        darkBlue: '#061F62',          // Bleu plus foncé
        lightBlue: '#E8ECFA',         // Bleu très clair
        mediumBlue: '#4A5FC7',        // Bleu moyen
        
        // Couleurs neutres complémentaires
        white: '#FFFFFF',
        lightGray: '#F5F5F5',
        mediumGray: '#666666',
        darkGray: '#333333',
        
        // Couleurs de statut (basées sur la palette Logidoo)
        success: '#2ECC71',           // Vert succès
        warning: '#F39C12',           // Orange avertissement
        error: '#E74C3C'              // Rouge erreur
      };

      // === PAGE DE COUVERTURE LOGIDOO ===
      this.addLogidooCoverPageOfficial(pdf, logidooColors, scene);

      // === PAGE RÉSUMÉ EXÉCUTIF ===
      pdf.addPage();
      this.addLogidooExecutiveSummaryOfficial(pdf, logidooColors, scene);

      // === TABLEAU DES COLIS AVEC COULEURS ===
      pdf.addPage();
      this.addLogidooItemsTableWithColors(pdf, logidooColors, scene);

      // === VUES 2D ===
      const allViews = await this.captureAll2DViews();
      this.addLogidooVisualizationPagesOfficial(pdf, logidooColors, allViews);

      // === PIED DE PAGE ET FINALISATION ===
      this.addLogidooFootersOfficial(pdf, logidooColors);

      // Télécharger le PDF avec encodage UTF-8
      const filename = `rapport-simulation-logidoo-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF Logidoo avec charte officielle réussi');
    } catch (error) {
      console.error('❌ Erreur export PDF Logidoo:', error);
      alert('Erreur lors de l\'export PDF Logidoo.');
    }
  }

  /**
   * Capture toutes les vues 2D
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

      // S'assurer qu'on est en mode 2D
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

      // Capturer chaque vue
      for (const viewMode of viewNames) {
        console.log(`📸 Capture de la vue: ${viewMode}`);
        
        // Trouver le composant canvas et changer la vue
        const canvasComponent = document.querySelector('app-canvas');
        if (canvasComponent && (canvasComponent as any).changeView) {
          // Changer la vue programmatiquement
          (canvasComponent as any).changeView(viewMode);
          
          // Attendre que le rendu soit terminé
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Capturer le canvas
          const canvas = document.querySelector('app-canvas canvas') as HTMLCanvasElement;
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = imageData ? Array.from(imageData.data).some(pixel => pixel !== 0) : false;
            
            if (hasContent) {
              views[viewMode] = canvas.toDataURL('image/png');
              console.log(`✅ Vue ${viewMode} capturée avec succès`);
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
   * Page de couverture avec charte graphique Logidoo officielle
   */
  private addLogidooCoverPageOfficial(pdf: any, colors: any, scene: VisualizationScene): void {
    // === HEADER AVEC COULEURS LOGIDOO OFFICIELLES ===
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 40, 210, 15, 'F');

    // === LOGO LOGIDOO OFFICIEL ===
    pdf.setTextColor(colors.black);
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LOGIDOO', 105, 30, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.white);
    pdf.text('Solution digitale de logistique innovante', 105, 50, { align: 'center' });

    // === ZONE PRINCIPALE BLANCHE ===
    pdf.setFillColor(colors.white);
    pdf.rect(0, 55, 210, 242, 'F');
    
    // === TITRE DU RAPPORT ===
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.blue);
    pdf.text('RAPPORT DE SIMULATION', 105, 80, { align: 'center' });
    
    // Ligne de séparation avec couleurs Logidoo
    pdf.setDrawColor(colors.yellow);
    pdf.setLineWidth(4);
    pdf.line(50, 90, 160, 90);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.black);
    pdf.text('Analyse Multi-Vues 2D', 105, 105, { align: 'center' });

    // === STATISTIQUES EN CARDS LOGIDOO ===
    const cardY = 125;
    const cardWidth = 45;
    const cardHeight = 30;
    
    const totalContainers = scene.containers?.length || 0;
    const totalItems = scene.containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0;
    const avgUtilization = scene.containers && scene.containers.length > 0 
      ? scene.containers.reduce((sum, c) => sum + (c.utilization?.volume || 0), 0) / scene.containers.length 
      : 0;

    // Card 1: Conteneurs (Jaune Logidoo)
    pdf.setFillColor(colors.yellow);
    pdf.rect(25, cardY, cardWidth, cardHeight, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(2);
    pdf.rect(25, cardY, cardWidth, cardHeight, 'D');
    
    pdf.setTextColor(colors.black);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(totalContainers.toString(), 47.5, cardY + 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('CONTENEURS', 47.5, cardY + 25, { align: 'center' });

    // Card 2: Colis (Bleu Logidoo)
    pdf.setFillColor(colors.blue);
    pdf.rect(82.5, cardY, cardWidth, cardHeight, 'F');
    pdf.setTextColor(colors.white);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(totalItems.toString(), 105, cardY + 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('COLIS', 105, cardY + 25, { align: 'center' });

    // Card 3: Performance (Jaune clair avec bordure)
    pdf.setFillColor(colors.lightYellow);
    pdf.rect(140, cardY, cardWidth, cardHeight, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.rect(140, cardY, cardWidth, cardHeight, 'D');
    
    pdf.setTextColor(colors.blue);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${avgUtilization.toFixed(0)}%`, 162.5, cardY + 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('UTILISATION', 162.5, cardY + 25, { align: 'center' });

    // === INFORMATIONS DÉTAILLÉES ===
    pdf.setTextColor(colors.black);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 30, 180);
    pdf.text('Département: Logistique & Supply Chain', 30, 195);
    
    // === ENCADRÉ OBJECTIFS AVEC STYLE LOGIDOO ===
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
    pdf.text('OBJECTIFS DE LA SIMULATION', 30, 225);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.blue);
    pdf.text('• Optimisation de l\'espace de chargement', 32, 235);
    pdf.text('• Analyse des différentes perspectives 2D', 32, 242);
    pdf.text('• Validation de la configuration des colis', 32, 249);
    pdf.text('• Génération de rapport détaillé pour validation', 32, 256);
  }

  /**
   * Page de résumé exécutif avec charte Logidoo officielle
   */
  private addLogidooExecutiveSummaryOfficial(pdf: any, colors: any, scene: VisualizationScene): void {
    let yPos = 30;
    
    // === EN-TÊTE LOGIDOO ===
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉSUMÉ EXÉCUTIF', 20, 29);
    
    yPos = 55;
    pdf.setTextColor(colors.black);

    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, index) => {
        // === CARD CONTENEUR STYLE LOGIDOO ===
        const cardY = yPos - 8;
        
        // Card principale blanche avec bordure
        pdf.setFillColor(colors.white);
        pdf.rect(15, cardY, 180, 50, 'F');
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(2);
        pdf.rect(15, cardY, 180, 50, 'D');
        
        // Bordure gauche jaune Logidoo
        pdf.setFillColor(colors.yellow);
        pdf.rect(15, cardY, 6, 50, 'F');
        
        // En-tête du conteneur
        pdf.setFillColor(colors.lightBlue);
        pdf.rect(21, cardY + 3, 170, 12, 'F');
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.blue);
        pdf.text(`Conteneur ${index + 1}: ${container.type}`, 25, cardY + 11);
        
        // Détails en colonnes
        const detailY = cardY + 22;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(colors.black);
        
        // Colonne 1: Dimensions
        pdf.setFont('helvetica', 'bold');
        pdf.text('DIMENSIONS', 25, detailY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${container.dimensions.longueur} × ${container.dimensions.largeur} × ${container.dimensions.hauteur} cm`, 25, detailY + 5);
        
        // Colonne 2: Volume
        const volume = (container.dimensions.longueur * container.dimensions.largeur * container.dimensions.hauteur / 1000000).toFixed(2);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VOLUME', 80, detailY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${volume} m³`, 80, detailY + 5);
        
        // Colonne 3: Items
        pdf.setFont('helvetica', 'bold');
        pdf.text('COLIS', 125, detailY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${container.items?.length || 0} items`, 125, detailY + 5);
        
        // Barre de performance Logidoo
        if (container.utilization) {
          const perfY = detailY + 15;
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(colors.blue);
          pdf.text('PERFORMANCE:', 25, perfY);
          
          // Barre de progression avec couleurs Logidoo
          const barWidth = 60;
          const barHeight = 6;
          const volumePercent = container.utilization.volume / 100;
          
          // Background de la barre
          pdf.setFillColor(colors.lightGray);
          pdf.rect(85, perfY - 3, barWidth, barHeight, 'F');
          
          // Remplissage selon performance
          if (volumePercent > 0.8) {
            pdf.setFillColor(colors.success);
          } else if (volumePercent > 0.5) {
            pdf.setFillColor(colors.yellow);
          } else {
            pdf.setFillColor(colors.error);
          }
          pdf.rect(85, perfY - 3, barWidth * volumePercent, barHeight, 'F');
          
          // Bordure de la barre
          pdf.setDrawColor(colors.blue);
          pdf.setLineWidth(1);
          pdf.rect(85, perfY - 3, barWidth, barHeight, 'D');
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(colors.blue);
          pdf.text(`${container.utilization.volume.toFixed(1)}% vol.`, 150, perfY + 1);
        }
        
        yPos += 60;
        
        if (yPos > 240) {
          pdf.addPage();
          yPos = 30;
        }
      });
    }
  }

  /**
   * Tableau des colis avec couleurs et charte Logidoo
   */
  private addLogidooItemsTableWithColors(pdf: any, colors: any, scene: VisualizationScene): void {
    let yPos = 30;
    
    // En-tête avec charte Logidoo
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DÉTAIL DES COLIS', 20, 29);
    
    yPos = 55;

    // Palette de couleurs pour les colis
    const itemColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];

    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, containerIndex) => {
        // Titre du conteneur avec style Logidoo
        pdf.setFillColor(colors.lightYellow);
        pdf.rect(15, yPos - 5, 180, 15, 'F');
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(2);
        pdf.line(15, yPos - 5, 195, yPos - 5);
        
        // Petit rectangle jaune de côté
        pdf.setFillColor(colors.yellow);
        pdf.rect(15, yPos - 5, 5, 15, 'F');
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.blue);
        pdf.text(`Conteneur ${containerIndex + 1} - ${container.type}`, 25, yPos + 3);
        yPos += 18;
        
        if (container.items && container.items.length > 0) {
          // En-têtes du tableau avec style Logidoo
          const headers = ['Couleur', 'ID', 'Dimensions (L×l×h)', 'Volume', 'Poids', 'Type', 'Statut'];
          const colWidths = [15, 20, 40, 22, 18, 28, 37];
          let xPos = 15;
          
          // Fond d'en-tête bleu Logidoo
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
          
          yPos += 12;
          
          // Lignes du tableau avec alternance Logidoo et couleurs
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          container.items.forEach((item, itemIndex) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 30;
            }
            
            xPos = 15;
            
            // Alternance de couleur avec style Logidoo
            if (itemIndex % 2 === 0) {
              pdf.setFillColor(colors.lightBlue);
              pdf.rect(15, yPos - 3, 180, 9, 'F');
            }
            
            // Couleur du colis (première colonne)
            const itemColor = itemColors[itemIndex % itemColors.length];
            pdf.setFillColor(itemColor);
            pdf.circle(xPos + 7, yPos + 1, 3, 'F');
            pdf.setDrawColor(colors.black);
            pdf.setLineWidth(0.5);
            pdf.circle(xPos + 7, yPos + 1, 3, 'D');
            xPos += colWidths[0];
            
            pdf.setTextColor(colors.black);
            
            const rowData = [
              item.id || `C${containerIndex + 1}-${itemIndex + 1}`,
              `${item.dimensions.longueur}×${item.dimensions.largeur}×${item.dimensions.hauteur}`,
              `${(item.dimensions.longueur * item.dimensions.largeur * item.dimensions.hauteur / 1000).toFixed(1)}L`,
              item.poids ? `${item.poids}kg` : 'N/A',
              item.fragile ? 'Fragile' : 'Standard',
              'Placé'
            ];
            
            rowData.forEach((data, i) => {
              // Colorer le texte pour le type si fragile
              if (i === 4 && item.fragile) {
                pdf.setTextColor(colors.error);
                pdf.text('⚠ ' + data, xPos + 1, yPos + 2);
                pdf.setTextColor(colors.black);
              } else if (i === 5) {
                pdf.setTextColor(colors.success);
                pdf.text('✓ ' + data, xPos + 1, yPos + 2);
                pdf.setTextColor(colors.black);
              } else {
                pdf.text(data, xPos + 1, yPos + 2);
              }
              xPos += colWidths[i + 1];
            });
            
            yPos += 9;
          });
          
          yPos += 15;
        } else {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(colors.mediumGray);
          pdf.text('Aucun colis dans ce conteneur', 20, yPos);
          yPos += 15;
        }
      });
    }
  }

  /**
   * Pages de visualisation avec charte Logidoo officielle
   */
  private addLogidooVisualizationPagesOfficial(pdf: any, colors: any, allViews: { [key: string]: string | null }): void {
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
        
        // En-tête avec charte Logidoo
        pdf.setFillColor(colors.blue);
        pdf.rect(0, 20, 210, 12, 'F');
        pdf.setFillColor(colors.yellow);
        pdf.rect(0, 32, 210, 3, 'F');
        
        pdf.setTextColor(colors.white);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VISUALISATIONS 2D', 20, 29);
        
        // Titre de la vue avec badge Logidoo
        pdf.setFillColor(colors.lightYellow);
        pdf.rect(15, 45, 180, 18, 'F');
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(2);
        pdf.rect(15, 45, 180, 18, 'D');
        
        // Petit rectangle jaune
        pdf.setFillColor(colors.yellow);
        pdf.rect(15, 45, 5, 18, 'F');
        
        pdf.setTextColor(colors.blue);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${viewLabels[viewKey as keyof typeof viewLabels] || viewKey}`, 25, 56);
        
        // Cadre pour l'image avec style Logidoo
        pdf.setDrawColor(colors.blue);
        pdf.setLineWidth(3);
        pdf.rect(18, 73, 174, 104, 'D');
        
        // Coins jaunes décoratifs
        pdf.setFillColor(colors.yellow);
        pdf.rect(18, 73, 6, 6, 'F');
        pdf.rect(186, 73, 6, 6, 'F');
        pdf.rect(18, 171, 6, 6, 'F');
        pdf.rect(186, 171, 6, 6, 'F');
        
        // Image de la vue
        pdf.addImage(viewData, 'PNG', 20, 75, 170, 100);
        
        // Description avec style Logidoo
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
        pdf.text(`Cette vue présente la disposition optimisée des colis`, 25, 202);
        pdf.text(`selon la perspective ${viewLabels[viewKey as keyof typeof viewLabels]?.toLowerCase()}.`, 25, 209);
        
        console.log(`✅ Vue ${viewKey} ajoutée au PDF avec charte Logidoo officielle`);
      }
    });
  }

  /**
   * Pieds de page avec charte Logidoo officielle
   */
  private addLogidooFootersOfficial(pdf: any, colors: any): void {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Ligne de séparation avec couleurs Logidoo
      pdf.setDrawColor(colors.yellow);
      pdf.setLineWidth(2);
      pdf.line(20, 283, 110, 283);
      
      pdf.setDrawColor(colors.blue);
      pdf.line(110, 283, 190, 283);
      
      // Pied de page avec branding Logidoo officiel
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(colors.blue);
      pdf.text('LOGIDOO', 20, 290);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(colors.black);
      pdf.text('Solution digitale de logistique innovante', 45, 290);
      
      // Numéro de page
      pdf.setTextColor(colors.blue);
      pdf.text(`Page ${i} sur ${pageCount}`, 190, 290, { align: 'right' });
      
      // URL et mention Logidoo
      pdf.setFontSize(6);
      pdf.setTextColor(colors.mediumGray);
      pdf.text('www.logidoo.co', 20, 294);
      pdf.text('Powered by Logidoo Technology', 190, 294, { align: 'right' });
    }
  }

  /**
   * Génère une couleur unique pour chaque colis basée sur son index
   */
  private generateItemColor(itemIndex: number, containerIndex: number): string {
    const baseColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE',
      '#AED6F1', '#A9DFBF', '#F9E79F', '#D7BDE2', '#F5B7B1'
    ];
    
    // Combine l'index du conteneur et de l'item pour plus de variété
    const colorIndex = (containerIndex * 7 + itemIndex) % baseColors.length;
    return baseColors[colorIndex];
  }

  /**
   * Convertit une couleur hex en valeurs RGB pour jsPDF
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
   * Dessine un cercle coloré pour représenter la couleur du colis
   */
  private drawColorCircle(pdf: any, x: number, y: number, color: string, size: number = 3): void {
    const rgb = this.hexToRgb(color);
    
    // Cercle de couleur
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
    pdf.circle(x, y, size, 'F');
    
    // Bordure noire
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.circle(x, y, size, 'D');
  }

  /**
   * Ajoute une légende des couleurs en fin de document
   */
  private addColorLegend(pdf: any, colors: any, scene: VisualizationScene): void {
    pdf.addPage();
    
    // En-tête
    pdf.setFillColor(colors.blue);
    pdf.rect(0, 20, 210, 12, 'F');
    pdf.setFillColor(colors.yellow);
    pdf.rect(0, 32, 210, 3, 'F');
    
    pdf.setTextColor(colors.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LÉGENDE DES COULEURS', 20, 29);
    
    let yPos = 55;
    let itemCounter = 0;
    
    if (scene.containers && scene.containers.length > 0) {
      scene.containers.forEach((container, containerIndex) => {
        // Titre du conteneur
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(colors.blue);
        pdf.text(`Conteneur ${containerIndex + 1} - ${container.type}`, 20, yPos);
        yPos += 10;
        
        if (container.items && container.items.length > 0) {
          // Créer un grid de couleurs
          let xPos = 20;
          let colCount = 0;
          
          container.items.forEach((item, itemIndex) => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 30;
              xPos = 20;
              colCount = 0;
            }
            
            const itemColor = this.generateItemColor(itemIndex, containerIndex);
            
            // Dessiner le cercle de couleur
            this.drawColorCircle(pdf, xPos + 5, yPos, itemColor, 2.5);
            
            // Texte de l'item
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(colors.black);
            const itemId = item.id || `C${containerIndex + 1}-${itemIndex + 1}`;
            pdf.text(itemId, xPos + 10, yPos + 1);
            
            // Gestion des colonnes
            colCount++;
            if (colCount >= 4) {
              yPos += 8;
              xPos = 20;
              colCount = 0;
            } else {
              xPos += 45;
            }
            
            itemCounter++;
          });
          
          // Passer à la ligne suivante si on n'a pas terminé une ligne complète
          if (colCount > 0) {
            yPos += 8;
          }
          yPos += 10; // Espace entre conteneurs
        }
      });
    }
    
    // Note explicative
    pdf.setFillColor(colors.lightYellow);
    pdf.rect(20, yPos, 170, 20, 'F');
    pdf.setDrawColor(colors.blue);
    pdf.setLineWidth(1);
    pdf.rect(20, yPos, 170, 20, 'D');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(colors.blue);
    pdf.text('Note: Chaque colis est identifié par une couleur unique dans toutes les vues 2D.', 25, yPos + 8);
    pdf.text('Cette légende permet de localiser facilement chaque colis dans les visualisations.', 25, yPos + 15);
  }

  /**
   * Méthode mise à jour pour inclure la légende des couleurs
   */
  async exportToPDFWithAll2DViewsAndColors(scene: VisualizationScene): Promise<void> {
    try {
      console.log('🎯 Démarrage export PDF avec charte Logidoo et couleurs des colis...');
      
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Définir l'encodage UTF-8 pour le PDF
      pdf.setProperties({
        title: 'Rapport de Simulation Logidoo',
        subject: 'Analyse Multi-Vues 2D avec identification colorée des colis',
        author: 'Logidoo - Solution digitale de logistique',
        creator: 'Logidoo Platform'
      });

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

      // === GÉNÉRATION DU RAPPORT COMPLET ===
      this.addLogidooCoverPageOfficial(pdf, logidooColors, scene);
      
      pdf.addPage();
      this.addLogidooExecutiveSummaryOfficial(pdf, logidooColors, scene);
      
      pdf.addPage();
      this.addLogidooItemsTableWithColors(pdf, logidooColors, scene);
      
      // Ajouter la légende des couleurs
      this.addColorLegend(pdf, logidooColors, scene);
      
      // Capturer et ajouter les vues 2D
      const allViews = await this.captureAll2DViews();
      this.addLogidooVisualizationPagesOfficial(pdf, logidooColors, allViews);
      
      // Finaliser avec pieds de page
      this.addLogidooFootersOfficial(pdf, logidooColors);

      // Télécharger avec nom descriptif
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `rapport-simulation-logidoo-${timestamp}.pdf`;
      pdf.save(filename);
      
      console.log('✅ Export PDF Logidoo complet avec couleurs réussi');
      return Promise.resolve();
      
    } catch (error) {
      console.error('❌ Erreur export PDF Logidoo:', error);
      throw new Error(`Erreur lors de l'export PDF Logidoo: ${error}`);
    }
  }
}
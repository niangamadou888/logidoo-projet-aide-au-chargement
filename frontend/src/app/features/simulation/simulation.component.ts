import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { ConteneurService } from '../../services/conteneur.service';
import { SimulationService, SimulationResult, OptimalContainerResult } from '../../services/simulation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Contenant } from '../../core/models/contenant.model';
import { Simulation, Colis, ContainerStats } from '../../models/simulation.model';
import { ExcelService } from '../../services/excelService';
import { ColorUtils } from '../../shared/utils/color-utils';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';




@Component({
  selector: 'app-simulation',
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})

export class SimulationComponent implements OnInit {
  loading = false;
  simulationEnCours = false;
  findingOptimal = false;
  colisForm: FormGroup;
  simulationForm: FormGroup;
  listeColis: Colis[] = [];
  suggestions: Contenant[] = [];
  articles: Colis[] = [];
  simulations: Simulation[] = [];
  simulationResultats: SimulationResult | null = null;
  optimalContainer: OptimalContainerResult | null = null;
  selectedContainerStats: ContainerStats | null = null;
  containers: Contenant[] = [];
  selectedContainerId: string | null = null;
  previewTime: number | null = null;
  selectionAutoOptimal = true; // Par défaut, la sélection automatique est activée
  evaluatingContainer = false; // Pour afficher un indicateur de chargement lors de l'évaluation d'un conteneur
  private isBrowser = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private conteneurService: ConteneurService,
    private simulationService: SimulationService,
    private excelService: ExcelService,
    private snackBar: MatSnackBar,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.colisForm = this.fb.group({
      type: ['', Validators.required],
      longueur: ['', [Validators.required, Validators.min(1)]],
      largeur: ['', [Validators.required, Validators.min(1)]],
      hauteur: ['', [Validators.required, Validators.min(1)]],
      poids: ['', [Validators.required, Validators.min(0.1)]],
      quantite: [1, [Validators.required, Validators.min(1)]],
      container: [''],
      camions: [''],
      volume: [''],
      nomDestinataire: [''],
      adresse: [''],
      telephone: [''],
      fragile: [false],
      gerbable: [true], // Par défaut, les colis sont gerbables
      couleur: ['#999999']
    });

    this.simulationForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['']
    });

    // Ne pas réinitialiser ici; on restaure potentiellement depuis l'état/navigation
  }

  telechargerModele(): void {
    this.excelService.telechargerModele();
  }
  importerDepuisExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.excelService.importerDepuisExcel(file).subscribe({
        next: (colisImportes) => {
          const enriched = colisImportes.map((c) => ({
            ...c,
            fragile: c.fragile ?? false,
            gerbable: c.gerbable ?? true,
            couleur: c.couleur || this.getDistinctRandomColor()
          }));
          this.listeColis = this.listeColis.concat(enriched);
          this.snackBar.open('Colis importés avec succès', 'OK', { duration: 3000 });

          if (this.selectionAutoOptimal && this.listeColis.length > 0) {
            this.trouverConteneurOptimal();
          } else if (this.selectedContainerId) {
            this.evaluateSelectedContainer();
          }
        },
        error: (err) => {
          console.error('Erreur lors de l\'import Excel:', err);
          this.snackBar.open('Erreur lors de l\'import du fichier Excel', 'OK', { duration: 5000 });
        }
      });
      input.value = '';
    }
  }

  private getDistinctRandomColor(): string {
    const existing = (this.listeColis || [])
      .map(c => c.couleur)
      .filter((c): c is string => !!c);
    return ColorUtils.getDistinctRandomColor(existing, 25, 50);
  }

  updateColisCouleur(index: number, couleur: string) {
    if (!this.listeColis[index]) return;
    const normalizedColor = couleur ? ColorUtils.validateAndNormalizeHex(couleur) : null;
    this.listeColis[index].couleur = normalizedColor || this.getDistinctRandomColor();
  }

  toggleFragile(index: number) {
    if (!this.listeColis[index]) return;
    this.listeColis[index].fragile = !this.listeColis[index].fragile;
    // Toute modification d'un colis invalide les résultats précédents
    this.resetResultats();
  }

  toggleGerbable(index: number) {
    if (!this.listeColis[index]) return;
    const current = this.listeColis[index].gerbable;
    this.listeColis[index].gerbable = current === undefined ? false : !current;
    // Toute modification d'un colis invalide les résultats précédents
    this.resetResultats();
  }

  randomizeColor(index: number) {
    if (!this.listeColis[index]) return;
    this.listeColis[index].couleur = this.getDistinctRandomColor();
  }

  nouvelleSimulation() {
    this.resetResultats();
    this.listeColis = [];
    this.simulationForm.reset();
    this.selectedContainerId = null;
  }

  toggleSelectionMode() {
    this.selectionAutoOptimal = !this.selectionAutoOptimal;
    // Si on active la sélection automatique, chercher le conteneur optimal
    if (this.selectionAutoOptimal && this.listeColis.length > 0) {
      this.trouverConteneurOptimal();
    } else {
      // Si on désactive et qu'un conteneur est déjà sélectionné, montrer ses stats
      if (this.selectedContainerId) {
        this.evaluateSelectedContainer();
      }
    }

    // Réinitialiser les résultats de simulation précédents
    this.simulationResultats = null;
    this.previewTime = null;
    this.simulationEnCours = false;
  }

  selectContainer(id: string | undefined) {
    if (!id) return; // Guard against undefined IDs
    // Si c'est le même conteneur déjà sélectionné, ne rien faire
    if (this.selectedContainerId === id) return;

    console.log('🔄 Changement de conteneur:', {
      ancien: this.selectedContainerId,
      nouveau: id
    });

    this.selectedContainerId = id;
    this.selectionAutoOptimal = false; // Désactive la sélection automatique
    this.colisForm.patchValue({ container: id });

    // Réinitialiser les résultats de simulation quand on change de conteneur
    this.simulationResultats = null;
    this.previewTime = null;
    this.simulationEnCours = false;

    // Nettoyer les données de visualisation obsolètes
    this.clearVisualizationData();

    // Évaluer le conteneur sélectionné pour montrer ses statistiques
    this.evaluateSelectedContainer();
  }

  // Évaluer le conteneur sélectionné manuellement
  evaluateSelectedContainer() {
    if (!this.selectedContainerId || this.listeColis.length === 0) {
      this.selectedContainerStats = null;
      return;
    }

    this.evaluatingContainer = true;

    // Options de simulation
    const options = {
      forceUseContainers: [this.selectedContainerId]
    };

    this.simulationService.previewSimulation(this.listeColis, options).subscribe({
      next: (response) => {
        if (response.success && response.result.containers.length > 0) {
          const container = response.result.containers[0];

          // Créer un objet de statistiques pour le conteneur sélectionné
          const selectedContainer = this.containers.find(c => c._id === this.selectedContainerId);

          if (selectedContainer) {
            this.selectedContainerStats = {
              matricule: selectedContainer.matricule,
              containerType: selectedContainer.type,
              containerCategory: selectedContainer.categorie,
              dimensions: selectedContainer.dimensions,
              volume: selectedContainer.volume || 0,
              capacitePoids: selectedContainer.capacitePoids || 0,
              volumeUtilization: container.utilization.volume / 100, // Convertir le pourcentage en décimal
              weightUtilization: container.utilization.poids / 100,
              placedItems: response.result.stats.placedCount,
              totalItems: response.result.stats.placedCount + response.result.stats.unplacedCount,
              optimalityScore: (container.utilization.volume + container.utilization.poids) / 200 * (response.result.stats.placedCount / (response.result.stats.placedCount + response.result.stats.unplacedCount || 1))
            };
          }
        } else {
          this.selectedContainerStats = null;
        }
        this.evaluatingContainer = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'évaluation du conteneur:', error);
        this.selectedContainerStats = null;
        this.evaluatingContainer = false;
      }
    });
  }

  // Nouveau système d'ajout de colis entièrement revu
  ajouterColis() {
    if (this.colisForm.valid) {
      try {
        // Récupérer les valeurs brutes du formulaire
        const formValues = this.colisForm.getRawValue();

        // Créer l'objet colis avec la structure exacte attendue par le backend
        const nouveauColis: Colis = {
          reference: `COLIS-${Date.now()}`,
          type: formValues.type,
          longueur: Number(formValues.longueur),
          largeur: Number(formValues.largeur),
          hauteur: Number(formValues.hauteur),
          poids: Number(formValues.poids),
          quantite: Number(formValues.quantite),
          nomDestinataire: formValues.nomDestinataire || undefined,
          adresse: formValues.adresse || undefined,
          telephone: formValues.telephone || undefined,
          fragile: Boolean(formValues.fragile),
          gerbable: Boolean(formValues.gerbable),
          couleur: formValues.couleur ? (ColorUtils.validateAndNormalizeHex(formValues.couleur) || this.getDistinctRandomColor()) : this.getDistinctRandomColor(),
          statut: 'actif',
          dateAjout: new Date()
        };

        // Vérification des valeurs numériques
        if (isNaN(nouveauColis.longueur) || nouveauColis.longueur <= 0) {
          throw new Error('La longueur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.largeur) || nouveauColis.largeur <= 0) {
          throw new Error('La largeur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.hauteur) || nouveauColis.hauteur <= 0) {
          throw new Error('La hauteur doit être un nombre positif');
        }
        if (isNaN(nouveauColis.poids) || nouveauColis.poids <= 0) {
          throw new Error('Le poids doit être un nombre positif');
        }
        if (isNaN(nouveauColis.quantite) || nouveauColis.quantite <= 0) {
          nouveauColis.quantite = 1; // Valeur par défaut
        }

        console.log('Nouveau colis à ajouter:', nouveauColis);

        // Ajouter à la liste des colis
        this.listeColis.push(nouveauColis);

        // Réinitialiser le formulaire avec les valeurs par défaut
        this.colisForm.reset({
          type: '',
          longueur: '',
          largeur: '',
          hauteur: '',
          poids: '',
          quantite: 1,
          container: '',
          camions: '',
          volume: '',
          nomDestinataire: '',
          adresse: '',
          telephone: '',
          fragile: false,
          gerbable: true,
          couleur: this.getDistinctRandomColor()
        });

        // Réinitialiser les résultats de simulation
        this.resetResultats();

        // Si mode automatique activé, chercher le conteneur optimal
        if (this.selectionAutoOptimal && this.listeColis.length > 0) {
          this.trouverConteneurOptimal();
        } else if (this.selectedContainerId) {
          // Sinon, mettre à jour les stats du conteneur sélectionné
          this.evaluateSelectedContainer();
        }

        this.snackBar.open('Colis ajouté avec succès', 'OK', {
          duration: 3000
        });
      } catch (error: any) {
        console.error('Erreur lors de l\'ajout du colis:', error);
        this.snackBar.open(`Erreur: ${error.message || 'Impossible d\'ajouter le colis'}`, 'OK', {
          duration: 5000
        });
      }
    } else {
      // Afficher les erreurs de validation
      let errorMessage = 'Veuillez corriger les champs suivants: ';
      if (this.colisForm.get('type')?.invalid) {
        errorMessage += 'Type, ';
      }
      if (this.colisForm.get('longueur')?.invalid) {
        errorMessage += 'Longueur, ';
      }
      if (this.colisForm.get('largeur')?.invalid) {
        errorMessage += 'Largeur, ';
      }
      if (this.colisForm.get('hauteur')?.invalid) {
        errorMessage += 'Hauteur, ';
      }
      if (this.colisForm.get('poids')?.invalid) {
        errorMessage += 'Poids, ';
      }
      if (this.colisForm.get('quantite')?.invalid) {
        errorMessage += 'Quantité, ';
      }

      this.snackBar.open(errorMessage.slice(0, -2), 'OK', {
        duration: 5000
      });
    }
  }

  private resetResultats() {
    this.simulationResultats = null;
    this.optimalContainer = null;
    this.selectedContainerStats = null;
    this.previewTime = null;
    this.simulationEnCours = false;
    // Nettoyer également les données de visualisation
    this.clearVisualizationData();
  }

  /**
   * Nettoie les données de visualisation obsolètes
   */
  private clearVisualizationData(): void {
    if (this.isBrowser && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('simulationData');
        console.log('🧹 Données de visualisation nettoyées');
      } catch (error) {
        console.warn('Impossible de nettoyer sessionStorage:', error);
      }
    }
  }


  supprimerColis(index: number) {
    this.listeColis.splice(index, 1);
    this.resetResultats();

    // Si mode automatique activé et qu'il reste des colis, chercher le conteneur optimal
    if (this.selectionAutoOptimal && this.listeColis.length > 0) {
      this.trouverConteneurOptimal();
    } else if (this.selectedContainerId && this.listeColis.length > 0) {
      // Sinon, si un conteneur est sélectionné manuellement, mettre à jour ses stats
      this.evaluateSelectedContainer();
    }
  }



  // Trouver le conteneur optimal pour les colis
  trouverConteneurOptimal() {
    if (this.listeColis.length === 0) {
      return;
    }

    this.findingOptimal = true;

    // Afficher les données envoyées au service pour debug
    console.log('Colis envoyés pour recherche du conteneur optimal:', this.listeColis);

    this.simulationService.findOptimalContainer(this.listeColis).subscribe({
      next: (response) => {
        if (response.success) {
          this.optimalContainer = response.optimalContainer;
          // Sélectionner automatiquement le conteneur optimal
          this.selectedContainerId = this.optimalContainer.containerId;
          this.selectedContainerStats = null; // Réinitialiser les stats manuelles
        } else {
          this.snackBar.open('Aucun conteneur optimal trouvé', 'OK', {
            duration: 3000
          });
        }
        this.findingOptimal = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche du conteneur optimal:', error);
        this.snackBar.open('Erreur lors de la recherche du conteneur optimal', 'OK', {
          duration: 3000
        });
        this.findingOptimal = false;
      }
    });
  }

  // Lancer une simulation (prévisualisation)
  lancerSimulation() {
    if (this.listeColis.length === 0) {
      this.snackBar.open('Veuillez ajouter au moins un colis à la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    if (!this.selectedContainerId && !this.selectionAutoOptimal) {
      this.snackBar.open('Veuillez sélectionner un conteneur ou activer la sélection automatique', 'OK', {
        duration: 3000
      });
      return;
    }

    this.simulationEnCours = true;
    this.loading = true;

    // Options de simulation
    let options: { preferredCategories?: string[], forceUseContainers?: string[] } = {};

    // Utiliser le conteneur sélectionné si présent (manuel ou issu de l'optimal)
    if (this.selectedContainerId) {
      // Trouver le contenant sélectionné une seule fois
      const selectedContainer = this.containers.find(c => c._id === this.selectedContainerId);

      // Ajouter la catégorie si elle existe
      if (selectedContainer?.categorie) {
        options.preferredCategories = [selectedContainer.categorie];
      }

      // Ajouter l'ID du contenant
      options.forceUseContainers = [this.selectedContainerId];
    } else if (this.selectionAutoOptimal) {
      // En mode auto: ne pas forcer de conteneur, laisser le backend choisir
      // Optionnel: si on dispose d'un optimalContainer précédent, on peut favoriser sa catégorie
      if (this.optimalContainer?.containerCategory) {
        options.preferredCategories = [this.optimalContainer.containerCategory];
      }
    }

    // Afficher les données envoyées à la simulation pour debug
    console.log('Colis envoyés pour simulation:', this.listeColis);
    console.log('Options de simulation:', options);

    this.simulationService.previewSimulation(this.listeColis, options).subscribe({
      next: (response) => {
        this.simulationResultats = response.result;
        this.previewTime = response.executionTime;
        this.loading = false;

        if (!response.result.success) {
          this.snackBar.open('Attention: Certains colis n\'ont pas pu être placés', 'OK', {
            duration: 5000
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors de la simulation:', error);
        this.snackBar.open('Erreur lors de la simulation', 'OK', {
          duration: 3000
        });
        this.loading = false;
        this.simulationEnCours = false;
      }
    });
  }

  validerSimulation() {
    if (this.listeColis.length === 0) {
      this.snackBar.open('Veuillez ajouter au moins un colis à la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    if (!this.simulationForm.valid) {
      this.snackBar.open('Veuillez remplir le nom de la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    // Si on n'a pas encore de résultats, lancer la simulation d'abord
    if (!this.simulationResultats) {
      this.snackBar.open('Veuillez d\'abord lancer la simulation', 'OK', {
        duration: 3000
      });
      return;
    }

    this.loading = true;

    // Créer l'objet de simulation
    const simulation = {
      nom: this.simulationForm.value.nom,
      description: this.simulationForm.value.description,
      colis: this.listeColis,
      resultats: this.simulationResultats
    };

    console.log('Données à sauvegarder:', {
      colis: this.listeColis,
      resultats: this.simulationResultats
    });

    // Sauvegarder les résultats (avec nom/description)
    this.simulationService.sauvegarderResultats(this.listeColis, this.simulationResultats, simulation.nom, simulation.description).subscribe({
      next: (response) => {
        console.log('Simulation sauvegardée:', response);
        this.loading = false;

        // Préparer les données pour la visualisation
        const simulationData = {
          colis: this.listeColis,
          resultats: this.simulationResultats,
          nom: simulation.nom,
          description: simulation.description,
          simulationId: response.simulation?._id,
          timestamp: Date.now()
        };

        console.log('Données préparées pour visualisation:', simulationData);

        Swal.fire({
          icon: 'success',
          title: `Simulation "${simulation.nom}" validée !`,
          text: `${this.simulationResultats?.containers.length || 0} contenants utilisés pour ${this.calculerNombreColisTotal()} colis.`,
          showCancelButton: true,
          confirmButtonText: '🚀 Voir la visualisation 3D',
          cancelButtonText: 'Nouvelle simulation',
          confirmButtonColor: '#f97316',
          cancelButtonColor: '#6b7280'
        }).then((result) => {
          if (result.isConfirmed) {
            console.log('Navigation vers visualisation avec:', simulationData);

            // ✅ Navigation vers la visualisation avec les données
            this.navigateToVisualization(simulationData);
          } else {
            // Nouvelle simulation
            this.nouvelleSimulation();
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.snackBar.open('Erreur lors de la sauvegarde de la simulation', 'OK', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  calculerPoidsTotal(): number {
    return this.simulationService.calculerPoidsTotal(this.listeColis);
  }

  calculerVolumeTotal(): number {
    return this.simulationService.calculerVolumeTotal(this.listeColis);
  }

  calculerNombreColisTotal(): number {
    return this.simulationService.calculerNombreColis(this.listeColis);
  }

  ngOnInit() {
    // Restaurer uniquement si on revient explicitement de la visualisation
    // via navigation d'état (goBackToSimulation). Sinon, démarrer proprement.
    let restored: any = null;
    if (typeof window !== 'undefined') {
      try {
        restored = (window.history && (window.history.state as any))?.simulationData ?? null;
      } catch {}
    }

    if (restored) {
      this.listeColis = Array.isArray(restored.colis) ? restored.colis : [];
      this.simulationResultats = restored.resultats || null;
      this.simulationForm.patchValue({
        nom: restored.nom || '',
        description: restored.description || ''
      });
    } else {
      this.nouvelleSimulation();
    }

    // Éviter les appels HTTP pendant le prerender (build statique)
    if (this.isBrowser) {
      this.loadConteneurs();
    }
  }

  loadConteneurs() {
    this.loading = true;
    this.conteneurService.listerContenants().subscribe({
      next: (data) => {
        this.containers = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur de chargement des container', err);
        this.snackBar.open('Erreur de chargement des container', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  /**
   * Navigue vers la visualisation avec les données fournies
   */
  private navigateToVisualization(simulationData: any): void {
    console.log('🚀 Navigation vers visualisation avec:', simulationData);

    // Sauvegarder dans sessionStorage de manière robuste
    this.saveToSessionStorage(simulationData);

    // Navigation avec state
    this.router.navigate(['/visualization'], {
      state: { simulationData: simulationData }
    }).then(success => {
      if (success) {
        console.log('✅ Navigation réussie');
        // Force l'état dans l'historique pour plus de robustesse
        if (this.isBrowser && typeof window !== 'undefined') {
          setTimeout(() => {
            try {
              window.history.replaceState({ simulationData: simulationData }, '', '/visualization');
            } catch (error) {
              console.warn('Impossible de forcer l\'état dans l\'historique:', error);
            }
          }, 100);
        }
      } else {
        console.error('❌ Erreur de navigation');
        this.snackBar.open('Erreur lors de la navigation', 'OK', { duration: 3000 });
      }
    }).catch(error => {
      console.error('❌ Erreur navigation:', error);
      // Fallback: essayer de naviguer sans state
      this.router.navigate(['/visualization']);
    });
  }

  /**
   * Sauvegarde les données dans sessionStorage de manière sécurisée
   */
  private saveToSessionStorage(data: any): void {
    if (!this.isBrowser || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      const jsonData = JSON.stringify(data);
      sessionStorage.setItem('simulationData', jsonData);
      console.log('💾 Données sauvegardées dans sessionStorage');
    } catch (error) {
      console.warn('❌ Impossible de sauvegarder dans sessionStorage:', error);
    }
  }

  testVisualization() {
    console.log('=== TEST DIRECT VISUALISATION ===');
    console.log('Liste colis:', this.listeColis);
    console.log('Resultats simulation:', this.simulationResultats);

    const testData = {
      colis: this.listeColis,
      resultats: this.simulationResultats,
      nom: 'Test Visualisation',
      description: 'Test direct',
      timestamp: Date.now()
    };

    console.log('Données test:', testData);

    // Utiliser la nouvelle méthode centralisée
    this.navigateToVisualization(testData);
  }

  // === PAGINATION ===
itemsPerPage = 5;            // nombre d’éléments par page
currentPage = 1;

get totalPages(): number {
  return Math.ceil(this.listeColis.length / this.itemsPerPage);
}

get pagedColis(): Colis[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  return this.listeColis.slice(start, start + this.itemsPerPage);
}

goToPage(page: number) {
  if (page < 1 || page > this.totalPages) return;
  this.currentPage = page;
}
}

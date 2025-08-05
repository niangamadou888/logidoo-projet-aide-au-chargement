// simulation.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

interface Colis {
  id?: number;
  type: string;
  longueur: number;
  largeur: number;
  hauteur: number;
  poids: number;
  quantite: number;
  nomDestinataire?: string;
  adresse?: string;
  telephone?: string;
}

interface Simulation {
  id?: number;
  nom: string;
  description?: string;
  colis: Colis[];
  dateCreation: Date;
  statut: 'brouillon' | 'validée';
}

@Component({
  selector: 'app-simulation',
  templateUrl: './simulation.component.html',
  styleUrls: ['./simulation.component.scss'],
   imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})


export class SimulationComponent {
  colisForm: FormGroup;
  simulationForm: FormGroup;
  listeColis: Colis[] = [];
  simulations: Simulation[] = [];
  simulationEnCours: Simulation | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.colisForm = this.fb.group({
      type: ['', Validators.required],
      longueur: ['', [Validators.required, Validators.min(1)]],
      largeur: ['', [Validators.required, Validators.min(1)]],
      hauteur: ['', [Validators.required, Validators.min(1)]],
      poids: ['', [Validators.required, Validators.min(0.1)]],
      quantite: ['1', [Validators.required, Validators.min(1)]],
      nomDestinataire: [''],
      adresse: [''],
      telephone: ['']
    });

    this.simulationForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['']
    });

    this.nouvellSimulation();
  }

  nouvellSimulation() {
    this.simulationEnCours = {
      nom: '',
      description: '',
      colis: [],
      dateCreation: new Date(),
      statut: 'brouillon'
    };
    this.listeColis = [];
    this.simulationForm.reset();
  }

  ajouterColis() {
    if (this.colisForm.valid) {
      const nouveauColis: Colis = {
        id: Date.now(),
        ...this.colisForm.value
      };
      
      this.listeColis.push(nouveauColis);
      this.colisForm.reset();
      this.colisForm.patchValue({ quantite: 1 }); // Reset quantité à 1
      
      console.log('Colis ajouté:', nouveauColis);
      console.log('Liste actuelle:', this.listeColis);
    } else {
      alert('Veuillez remplir tous les champs obligatoires');
    }
  }

  supprimerColis(index: number) {
    this.listeColis.splice(index, 1);
  }

  telechargerModele() {
    // Créer un modèle Excel basique ou télécharger depuis le serveur
    console.log('Téléchargement du modèle Excel...');
    
    // Exemple de création d'un CSV simple
    const headers = 'Type,Longueur(cm),Largeur(cm),Hauteur(cm),Poids(kg),Quantité,Destinataire,Adresse,Téléphone\n';
    const exemple = 'Carton,30,25,20,2.5,1,Jean Dupont,123 Rue de la Paix,0123456789\n';
    const csvContent = headers + exemple;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_colis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  importerDepuisExcel(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Ici vous ajouteriez la logique pour parser Excel/CSV
          // Pour l'exemple, on simule l'import
          const colisImportes: Colis[] = [
            {
              id: Date.now(),
              type: 'Carton importé',
              longueur: 30,
              largeur: 25,
              hauteur: 20,
              poids: 2.5,
              quantite: 1,
              nomDestinataire: 'Client Excel',
              adresse: '456 Avenue Import',
              telephone: '0987654321'
            }
          ];
          
          this.listeColis.push(...colisImportes);
          alert(`${colisImportes.length} colis importé(s) depuis ${file.name}`);
        } catch (error) {
          console.error('Erreur lors de l\'import:', error);
          alert('Erreur lors de l\'import du fichier');
        }
      };
      reader.readAsText(file);
    }
    
    // Reset input file
    event.target.value = '';
  }

  validerSimulation() {
    if (this.listeColis.length === 0) {
      alert('Veuillez ajouter au moins un colis à la simulation');
      return;
    }

    if (!this.simulationForm.valid) {
      alert('Veuillez remplir le nom de la simulation');
      return;
    }

    const simulation: Simulation = {
      id: Date.now(),
      nom: this.simulationForm.value.nom,
      description: this.simulationForm.value.description,
      colis: [...this.listeColis],
      dateCreation: new Date(),
      statut: 'validée'
    };

    // Envoyer au backend
    this.http.post('/api/simulations', simulation).subscribe({
      next: (response) => {
        console.log('Simulation sauvegardée:', response);
        this.simulations.push(simulation);
        alert(`Simulation "${simulation.nom}" validée avec ${simulation.colis.length} colis!`);
        this.nouvellSimulation();
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde de la simulation');
      }
    });
  }

  calculerPoidsTotal(): number {
    return this.listeColis.reduce((total, colis) => 
      total + (colis.poids * colis.quantite), 0
    );
  }

  calculerVolumeTotal(): number {
    return this.listeColis.reduce((total, colis) => 
      total + ((colis.longueur * colis.largeur * colis.hauteur * colis.quantite) / 1000000), 0
    );
  }

  getNombreColisTotal(): number {
    return this.listeColis.reduce((total, colis) => total + colis.quantite, 0);
  }
}
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConteneurService } from '../../services/conteneur.service';
import { Contenant } from '../../core/models/contenant.model';
import { Dimensions } from '../../core/models/dimensions.model';
import { MatListModule } from "@angular/material/list";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import { MatCard } from "@angular/material/card";
import { MatCardModule } from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ajoute-conteneur',
  imports: [ReactiveFormsModule, MatListModule, MatFormFieldModule, MatSelectModule, MatCard, MatCardModule, MatIconModule,CommonModule, MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
  MatSnackBarModule],
  templateUrl: './ajoute-conteneur.component.html',
  styleUrl: './ajoute-conteneur.component.scss',
 

  
})
export class AjouteConteneurComponent implements OnInit{

  contenantForm: FormGroup;
  selectedFile?: File;
  message: string = '';
  categories:string[]=[];


backgroundUrl = '/assets/images/camion.png'


    constructor(
    private fb: FormBuilder,
     private snackBar: MatSnackBar,
    private conteneurService: ConteneurService
  ) {
    this.contenantForm = this.fb.group({
    categorie: ['', Validators.required],
  type: ['', Validators.required],
  modele: [''],
  disponible: [true],

  longueur: [null, [Validators.required, Validators.min(0)]],
  largeur: [null, [Validators.required, Validators.min(0)]],
  hauteur: [null, [Validators.required, Validators.min(0)]],

  capacitePoids: [null, [Validators.required, Validators.min(0)]],

  capaciteVolume: [{value:0, disabled:true}],
  capacitePoidsMax: [null, [Validators.min(0)]],
    });
  }

  ngOnInit() {
this.contenantForm.valueChanges.subscribe(val => {
    const l = val.longueur || 0;
    const w = val.largeur || 0;
    const h = val.hauteur || 0;
 const poidsMax = val.capacitePoids || 0;
    const volume = (l * w * h) / 1000000; // en m³
    this.contenantForm.get('capaciteVolume')?.setValue(volume, { emitEvent: false });

    // Mettre à jour capacitePoidsMax automatiquement
    
    this.contenantForm.get('capacitePoidsMax')?.setValue(poidsMax, { emitEvent: false });
  });
  
    // Récupérer toutes les catégories depuis le backend
    this.conteneurService.getCategories().subscribe({
      next: (cats) => {
        
        this.categories = Array.from(new Set(cats));
      },
      error: (err) => console.error('Erreur récupération catégories', err)
    });
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  submit() {
    if (this.contenantForm.invalid) return;

    const formValues = this.contenantForm.value;
    const dimensions: Dimensions = {
      longueur: formValues.longueur,
      largeur: formValues.largeur,
      hauteur: formValues.hauteur
    };

    const nouveauContenant: Contenant = {
  categorie: formValues.categorie,
  type: formValues.type,
  modele: formValues.modele,
  dimensions: {
    longueur: formValues.longueur,
    largeur: formValues.largeur,
    hauteur: formValues.hauteur
  },
  capacitePoids: formValues.capacitePoids,
  disponible: formValues.disponible
};

    this.conteneurService.creerContenant(nouveauContenant, this.selectedFile)
      .subscribe({
        next: (res) => {
          this.snackBar.open('Contenant créé avec succès !', 'Fermer',{
            duration:3000,
            panelClass:['snackbar-success']
          });
          this.contenantForm.reset();
          this.selectedFile = undefined;
        },
        error: () => {
        this.snackBar.open('Erreur lors de la création du contenant.', 'Fermer',{
          duration:3000,
          panelClass:['snackbar-error']
        });
         
        }
      });
  }
}

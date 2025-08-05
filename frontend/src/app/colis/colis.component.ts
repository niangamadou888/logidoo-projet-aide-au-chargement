import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColisService, Colis } from '../services/colis.service';

@Component({
  selector: 'app-colis',
  templateUrl: './colis.component.html',
})
export class ColisComponent implements OnInit {
  colisForm!: FormGroup;
  listeColis: Colis[] = [];

  constructor(private fb: FormBuilder, private colisService: ColisService) {}

  ngOnInit() {
    this.colisForm = this.fb.group({
      type: ['', Validators.required],
      nomDestinataire: ['', Validators.required],
      adresse: ['', Validators.required],
      telephone: ['', Validators.required],
      poids: [0, Validators.required],
      longueur: [0, Validators.required],
      largeur: [0, Validators.required],
      hauteur: [0, Validators.required],
      quantite: [1],
      fragile: [false],
    });

    this.chargerColis();
  }

  ajouterColis() {
    if (this.colisForm.valid) {
      this.colisService.ajouterColis(this.colisForm.value).subscribe((data) => {
        this.listeColis.push(data);
        this.colisForm.reset({ quantite: 1, fragile: false });
      });
    }
  }

  chargerColis() {
    this.colisService.getColis().subscribe((data) => {
      this.listeColis = data;
    });
  }
}

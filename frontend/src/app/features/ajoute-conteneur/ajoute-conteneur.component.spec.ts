import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjouteConteneurComponent } from './ajoute-conteneur.component';

describe('AjouteConteneurComponent', () => {
  let component: AjouteConteneurComponent;
  let fixture: ComponentFixture<AjouteConteneurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjouteConteneurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjouteConteneurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { Renderer3dService } from './renderer3d.service';

describe('Renderer3dService', () => {
  let service: Renderer3dService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Renderer3dService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

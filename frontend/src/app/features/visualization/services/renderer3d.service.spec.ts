import { TestBed } from '@angular/core/testing';

import { ThreeDRendererService } from './renderer3d.service';

describe('ThreeDRendererService', () => {
  let service: ThreeDRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeDRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

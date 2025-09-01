import { TestBed } from '@angular/core/testing';

import { Renderer2dService } from './renderer2d.service';

describe('Renderer2dService', () => {
  let service: Renderer2dService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Renderer2dService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { Court } from './court';

describe('Court', () => {
  let service: Court;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(Court);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { PaymentMethod } from './payment-method';

describe('PaymentMethod', () => {
  let service: PaymentMethod;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(PaymentMethod);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

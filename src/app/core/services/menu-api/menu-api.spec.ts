import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { MenuApi } from './menu-api';

describe('MenuApiService', () => {
  let service: MenuApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(MenuApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

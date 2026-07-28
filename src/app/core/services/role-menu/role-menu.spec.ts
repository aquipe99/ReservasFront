import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { RoleMenu } from './role-menu';

describe('RoleMenu', () => {
  let service: RoleMenu;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(RoleMenu);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

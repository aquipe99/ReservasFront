import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(Auth);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    (service as any).stopInactivityMonitoring();
    localStorage.removeItem('reservas.lastActivityAt');
    localStorage.removeItem('reservas.logoutReason');
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request a new access token', () => {
    service.refreshAccessToken().subscribe(response => {
      expect(response.success).toBeTrue();
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(request.request.method).toBe('POST');
    request.flush({ success: true, message: 'Token actualizado', data: null });
  });

  it('should logout after 15 minutes without activity', fakeAsync(() => {
    service.userSignal.set({ id: 1 });
    const logoutSpy = spyOn(service, 'logout');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    (service as any).startInactivityMonitoring(true);
    tick(15 * 60 * 1000);

    expect(logoutSpy).toHaveBeenCalledWith('inactivity');
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'inactivity' }
    });
  }));
});

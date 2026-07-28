import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { Auth } from '../services/auth/auth';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let refreshSubject: Subject<any>;
  let auth: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    refreshSubject = new Subject<any>();
    auth = jasmine.createSpyObj<Auth>('Auth', ['refreshAccessToken', 'logout']);
    auth.refreshAccessToken.and.returnValue(refreshSubject);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: Auth, useValue: auth }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should share one refresh request and retry concurrent requests', () => {
    const responses: unknown[] = [];

    http.get(`${environment.apiUrl}/roles`).subscribe(response => responses.push(response));
    http.get(`${environment.apiUrl}/users`).subscribe(response => responses.push(response));

    const initialRequests = httpTesting.match(request =>
      request.url.endsWith('/roles') || request.url.endsWith('/users')
    );

    initialRequests.forEach(request =>
      request.flush({}, { status: 401, statusText: 'Unauthorized' })
    );

    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);

    refreshSubject.next({ success: true });
    refreshSubject.complete();

    const retriedRequests = httpTesting.match(request =>
      request.url.endsWith('/roles') || request.url.endsWith('/users')
    );

    expect(retriedRequests.length).toBe(2);
    retriedRequests.forEach(request => request.flush({ success: true }));
    expect(responses.length).toBe(2);
  });
});

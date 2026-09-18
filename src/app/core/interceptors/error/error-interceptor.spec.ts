import { HttpContext, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';

import { errorInterceptor } from './error-interceptor';
import { SKIP_GLOBAL_ERROR_HANDLING } from './error-context';
import { ToastService } from '../../services/feedback/toast.service';

describe('errorInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => errorInterceptor(req, next));

  const failingNext =
    (status: number) =>
    (): Observable<never> =>
      throwError(() => new HttpErrorResponse({ status }));

  const navigation: { calls: string[][] } = { calls: [] };

  let toastService: ToastService;

  beforeEach(() => {
    navigation.calls = [];

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: (commands: string[]) => {
              navigation.calls.push(commands);
              return Promise.resolve(true);
            },
          },
        },
      ],
    });

    toastService = TestBed.inject(ToastService);
  });

  function run(request: HttpRequest<unknown>, status: number): void {
    interceptor(request, failingNext(status)).subscribe({
      error: (error: unknown) => {
        expect(error).toBeInstanceOf(HttpErrorResponse);
      },
    });
  }

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('surfaces a toast on a 500 response', () => {
    run(new HttpRequest('GET', '/api/test'), 500);

    expect(toastService.toasts()).toHaveLength(1);
    expect(toastService.toasts()[0].type).toBe('error');
    expect(toastService.toasts()[0].message).toContain('try again later');
  });

  it('surfaces a toast when the network is unreachable', () => {
    run(new HttpRequest('GET', '/api/test'), 0);

    expect(toastService.toasts()).toHaveLength(1);
    expect(toastService.toasts()[0].message).toContain('Unable to connect');
  });

  it('navigates to /403 and surfaces a toast on a 403 response', () => {
    run(new HttpRequest('GET', '/api/test'), 403);

    expect(navigation.calls).toEqual([['/403']]);
    expect(toastService.toasts()).toHaveLength(1);
    expect(toastService.toasts()[0].message).toContain('permission');
  });

  it('navigates to /404 and surfaces a toast on a 404 response', () => {
    run(new HttpRequest('GET', '/api/test'), 404);

    expect(navigation.calls).toEqual([['/404']]);
    expect(toastService.toasts()).toHaveLength(1);
  });

  it('does nothing when SKIP_GLOBAL_ERROR_HANDLING is set', () => {
    const request = new HttpRequest('GET', '/api/test', {
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true),
    });

    run(request, 500);

    expect(toastService.toasts()).toHaveLength(0);
    expect(navigation.calls).toEqual([]);
  });
});
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/feedback/toast.service';
import { UserService } from '../../services/user/user.service';
import { SKIP_GLOBAL_ERROR_HANDLING } from './error-context';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRoute = req.url.includes('/login') ||
        req.url.includes('/register') ||
        req.url.includes('/verify-email') ||
        req.url.includes('/refresh-token') ||
        req.url.includes('/logout');

      const wasAuthenticated = userService.isAuthenticatedValue() === true;

      if (error.status === 401 && !isAuthRoute && wasAuthenticated) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap(() => {
              isRefreshing = false;
              refreshTokenSubject.next(true);
              return next(req);
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              refreshTokenSubject.next(false);
              authService.logout();
              router.navigate(['/home']);
              return throwError(() => refreshError);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((result) => result !== null),
            take(1),
            switchMap((success) => {
              if (success) {
                return next(req);
              }
              return throwError(() => error);
            })
          );
        }
      }

      const skipGlobalHandling = req.context.get(SKIP_GLOBAL_ERROR_HANDLING);

      if (!skipGlobalHandling) {
        if (error.status === 403) {
          toastService.error("You don't have permission to perform this action.");
          router.navigate(['/403']);
        } else if (error.status === 404) {
          toastService.error('The requested page could not be found.');
          router.navigate(['/404']);
        } else if (error.status === 500) {
          console.error('Server connection failed');
          toastService.error('Something went wrong on our side. Please try again later.');
        } else if (error.status === 0) {
          console.error('No connection');
          toastService.error('Unable to connect to the server. Check your internet connection.');
        }
      }

      return throwError(() => error);
    })
  );
};
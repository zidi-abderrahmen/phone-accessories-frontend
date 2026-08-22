import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user/user.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRoute = req.url.includes('/login') || 
        req.url.includes('/register') ||
        req.url.includes('/verify-email') ||
        req.url.includes('/refresh-token') || 
        req.url.includes('/logout');

      // Use AuthService's current auth state instead of localStorage (may be stale)
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
              authService.logout().subscribe({
                error: () => {}
              });
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

      if (error.status === 403) {
          router.navigate(['/403']);
      } else if (error.status === 404) {
          router.navigate(['404'])
      } else if (error.status === 500) {
          console.error('Server connection failed');
      } else if (error.status === 0) {
          console.error('No connection');
      }

      return throwError(() => error);
    })
  );
};
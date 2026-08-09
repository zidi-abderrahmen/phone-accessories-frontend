import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { map, take } from 'rxjs';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.authState$.pipe(
      take(1),
      map(() => {
        if (authService.hasAnyRole(allowedRoles)) return true;
        return router.createUrlTree(['/home']);
      })
    );
  };
};
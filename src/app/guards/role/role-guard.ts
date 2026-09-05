import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { UserService } from '../../core/services/user/user.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const userService = inject(UserService);
    const router = inject(Router);

    return userService.authState$.pipe(
      take(1),
      map(() => {
        if (userService.hasAnyRole(allowedRoles)) return true;
        return router.createUrlTree(['/403']);
      })
    );
  };
};
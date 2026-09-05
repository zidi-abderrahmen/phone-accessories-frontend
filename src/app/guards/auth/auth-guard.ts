import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { UserService } from '../../core/services/user/user.service';

export const authGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    return userService.authState$.pipe(
        take(1),
        map(isLoggedIn => {
            if (isLoggedIn) {
                return true;
            }

            return router.createUrlTree(['/login']);
        })
    );
};
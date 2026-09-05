import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ACCOUNT_MENU_LINKS, NavLink } from '../../../../config/nav.config';
import { AuthService } from '../../../core/services/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mobile-drawer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-drawer.html',
  styleUrl: './mobile-drawer.scss',
})
export class MobileDrawer {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);


  readonly open = input.required<boolean>();
  readonly links = input.required<NavLink[]>();
  readonly isAuthenticated = input(false);
  readonly isAdmin = input(false);
  readonly isDarkTheme = input(false);
 
  readonly closed = output<void>();
  readonly logout = output<void>();
  readonly themeToggled = output<void>();
 
  readonly accountLinks = ACCOUNT_MENU_LINKS;
 
  protected onLogout(): void {
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigateByUrl('/login'),
        error: () => this.router.navigateByUrl('/login')
      });
  }
}
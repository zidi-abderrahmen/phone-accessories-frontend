import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ADMIN_ROLES, MAIN_NAV_LINKS } from '../../../../config/nav.config';
import { RegisterResponse } from '../../../core/models/user/register/register.response';
import { UserService } from '../../../core/services/user/user.service';
import { AccountMenu } from '../account-menu/account-menu';
import { MobileDrawer } from '../mobile-drawer/mobile-drawer';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ThemeService } from '../../../core/services/theme/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AccountMenu, MobileDrawer],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly user = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly navLinks = MAIN_NAV_LINKS;

  readonly isAuthenticated = toSignal(this.user.authState$, { initialValue: false });
  readonly currentUser = toSignal(this.user.currentUser$, { initialValue: null });

  readonly isDarkTheme = this.theme.isDark;
  readonly isDrawerOpen = signal(false);

  readonly isAdmin = (): boolean => {
    const roles = (this.currentUser() as RegisterResponse | null)?.roles ?? [];
    return roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role));
  };

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  initials(user: RegisterResponse | null): string {
    if (!user) return '';
    if (user.firstName || user.lastName) {
      return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
    }
    return (user.firstName ?? '').slice(0, 2).toUpperCase();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    if (query) {
      this.router.navigate(['/accessories'], { queryParams: { keyword: query } });
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/home');
  }
}
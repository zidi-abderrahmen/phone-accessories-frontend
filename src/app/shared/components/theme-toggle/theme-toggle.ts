import { Component, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle implements OnInit, OnDestroy {
  isDark = signal(false);

  private mediaQuery: MediaQueryList | null = null;
  private mediaHandler = (e: MediaQueryListEvent) => this.handleSystemChange(e);

  ngOnInit(): void {
    this.detectTheme();
    this.listenToSystemTheme();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaHandler);
    }
  }

  /** Detect the current active theme from DOM and localStorage */
  private detectTheme(): void {
    const html = document.documentElement;
    const saved = this.getStoredTheme();

    if (saved) {
      this.isDark.set(saved === 'dark');
      this.applyTheme(this.isDark());
      return;
    }

    // Fall back to system preference or existing DOM class
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const hasDarkClass = html.classList.contains('dark-theme');
    this.isDark.set(hasDarkClass || systemDark);
  }

  /** Toggle between light and dark themes */
  toggleTheme(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    this.applyTheme(next);
    this.storeTheme(next ? 'dark' : 'light');
  }

  /** Apply the theme class and color-scheme to the document */
  private applyTheme(dark: boolean): void {
    const html = document.documentElement;

    if (dark) {
      html.classList.add('dark-theme');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark-theme');
      html.style.colorScheme = 'light';
    }

    // Update theme-color meta for mobile browsers
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', dark ? '#0a0a0a' : '#fafafa');
    }
  }

  /** Persist theme preference to localStorage */
  private storeTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem('pa-theme', theme);
    } catch {
      // localStorage may be unavailable in private mode or restricted contexts
    }
  }

  /** Retrieve theme preference from localStorage */
  private getStoredTheme(): string | null {
    try {
      return localStorage.getItem('pa-theme');
    } catch {
      return null;
    }
  }

  /** Listen for system theme changes when no user preference is stored */
  private listenToSystemTheme(): void {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.mediaHandler);
  }

  private handleSystemChange(e: MediaQueryListEvent): void {
    // Only react to system changes if the user has not set a manual preference
    if (!this.getStoredTheme()) {
      this.isDark.set(e.matches);
      this.applyTheme(e.matches);
    }
  }
}
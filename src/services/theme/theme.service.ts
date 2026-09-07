import { signal, Service, computed } from '@angular/core';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pa-theme';

const ATTRIBUTE = 'data-theme';

@Service()
export class ThemeService {
    private readonly theme = signal<Theme>(this.resolveInitialTheme());

    readonly isDark = computed(() => this.theme() === 'dark');

    constructor() {
        this.applyTheme(this.theme());
    }

    toggle(): void {
        const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
        this.theme.set(next);
        this.applyTheme(next);
    }

    private applyTheme(value: Theme): void {
        if (typeof document !== 'undefined') {
        document.documentElement.setAttribute(ATTRIBUTE, value);
        }
        if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, value);
        }
    }

    private resolveInitialTheme(): Theme {
        if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
        }
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
        }
        return 'light';
    }
}
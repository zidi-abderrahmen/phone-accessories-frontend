import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle implements OnInit {

  isDark = signal(false);

  ngOnInit(): void {
    this.detectTheme();
  }

  private detectTheme(): void {
    const html = document.documentElement;
    this.isDark.set(html.classList.contains('dark-theme'));
  }

  toggleTheme(): void {
    const html = document.documentElement;
    this.isDark.set(!this.isDark());

    if (this.isDark()) {
      html.classList.add('dark-theme');
      html.style.colorScheme = 'dark';
      localStorage.setItem('pa-theme', 'dark');
    } else {
      html.classList.remove('dark-theme');
      html.style.colorScheme = 'light';
      localStorage.setItem('pa-theme', 'light');
    }
  }
}
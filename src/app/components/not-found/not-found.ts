import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrls: ['./not-found.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }

  browseCategories(): void {
    this.router.navigate(['/categories']);
  }

  viewAccessories(): void {
    this.router.navigate(['/accessories']);
  }
}

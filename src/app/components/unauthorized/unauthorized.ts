import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.html',
  styleUrls: ['./unauthorized.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Unauthorized {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  goHome(): void {
    this.router.navigate(['/']);
  }

  loginAgain(): void {
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.location.back();
  }
}
